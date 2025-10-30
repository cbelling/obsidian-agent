import { App } from "obsidian";
import { BaseCheckpointSaver, Checkpoint, CheckpointMetadata, CheckpointTuple, copyCheckpoint } from "@langchain/langgraph-checkpoint";
import { PendingWrite } from "@langchain/langgraph-checkpoint";
import { RunnableConfig } from "@langchain/core/runnables";

type ChannelVersion = number | string;
type ChannelVersions = Record<string, ChannelVersion>;

/**
 * Thread metadata structure
 */
export interface ThreadMetadata {
	threadId: string;
	title: string;
	createdAt: number;
	updatedAt: number;
	messageCount: number;
}

/**
 * CheckpointService - Persistent storage for LangGraph checkpoints
 *
 * Implements the LangGraph checkpointer interface to save conversation state to disk
 * Stores checkpoints in .obsidian/plugins/obsidian-agent/checkpoints/
 */
export class CheckpointService extends BaseCheckpointSaver {
	private app: App;
	private basePath: string;
	private threadsMetadata: Map<string, ThreadMetadata> = new Map();

	constructor(app: App, pluginId: string = "obsidian-agent") {
		super();
		this.app = app;
		this.basePath = `.obsidian/plugins/${pluginId}`;
		this.ensureDirectories();
		this.loadThreadsMetadata();
	}

	/**
	 * Ensure required directories exist
	 */
	private async ensureDirectories(): Promise<void> {
		const checkpointsPath = `${this.basePath}/checkpoints`;

		try {
			// Check if directories exist, create if not
			const adapter = this.app.vault.adapter;

			if (!(await adapter.exists(this.basePath))) {
				await adapter.mkdir(this.basePath);
			}

			if (!(await adapter.exists(checkpointsPath))) {
				await adapter.mkdir(checkpointsPath);
			}
		} catch (error) {
			console.error("Error ensuring directories:", error);
		}
	}

	/**
	 * Get checkpoint file path for a thread
	 */
	private getCheckpointPath(threadId: string, checkpointId: string): string {
		return `${this.basePath}/checkpoints/${threadId}-${checkpointId}.json`;
	}

	/**
	 * Get thread directory path
	 */
	private getThreadPath(threadId: string): string {
		return `${this.basePath}/checkpoints/${threadId}`;
	}

	/**
	 * Get threads metadata file path
	 */
	private getThreadsMetadataPath(): string {
		return `${this.basePath}/threads.json`;
	}

	/**
	 * Load threads metadata from disk
	 */
	private async loadThreadsMetadata(): Promise<void> {
		try {
			const path = this.getThreadsMetadataPath();
			const adapter = this.app.vault.adapter;

			if (await adapter.exists(path)) {
				const content = await adapter.read(path);
				const data = JSON.parse(content);

				if (Array.isArray(data)) {
					for (const thread of data) {
						this.threadsMetadata.set(thread.threadId, thread);
					}
				}
			}
		} catch (error) {
			console.error("Error loading threads metadata:", error);
		}
	}

	/**
	 * Save threads metadata to disk
	 */
	private async saveThreadsMetadata(): Promise<void> {
		try {
			const path = this.getThreadsMetadataPath();
			const data = Array.from(this.threadsMetadata.values());
			const adapter = this.app.vault.adapter;

			// Atomic write: write to temp file, then rename
			const tempPath = `${path}.tmp`;
			await adapter.write(tempPath, JSON.stringify(data, null, 2));

			// Rename temp to actual (atomic on most filesystems)
			if (await adapter.exists(path)) {
				await adapter.remove(path);
			}
			await adapter.rename(tempPath, path);
		} catch (error) {
			console.error("Error saving threads metadata:", error);
		}
	}

	/**
	 * LangGraph interface: Get a checkpoint
	 */
	async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
		const threadId = config.configurable?.thread_id;
		const checkpointId = config.configurable?.checkpoint_id;

		console.log('[CheckpointService] getTuple called:', { threadId, checkpointId });

		if (!threadId) {
			return undefined;
		}

		try {
			// If specific checkpoint requested, load it
			if (checkpointId) {
				const path = this.getCheckpointPath(threadId, checkpointId);
				const adapter = this.app.vault.adapter;

				if (await adapter.exists(path)) {
					const content = await adapter.read(path);
					const data = JSON.parse(content);

					let checkpoint: Checkpoint;
					let metadata: CheckpointMetadata;

					// Format detection: if checkpoint is an array, it's NEW format (serialized)
					if (Array.isArray(data.checkpoint)) {
						// NEW FORMAT: Deserialize using serde
						checkpoint = await this.serde.loadsTyped("json", new Uint8Array(data.checkpoint)) as Checkpoint;
						metadata = await this.serde.loadsTyped("json", new Uint8Array(data.metadata)) as CheckpointMetadata;
					} else {
						// OLD FORMAT: Already plain JSON objects
						checkpoint = data.checkpoint as Checkpoint;
						metadata = data.metadata as CheckpointMetadata;
					}

					return {
						config,
						checkpoint,
						metadata,
						parentConfig: data.parentCheckpointId || data.parentConfig
							? { configurable: { thread_id: threadId, checkpoint_id: data.parentCheckpointId || data.parentConfig?.configurable?.checkpoint_id } }
							: undefined
					};
				}
			}

			// Otherwise, get the latest checkpoint for this thread
			const checkpoints = await this.listCheckpoints(threadId);
			console.log(`[CheckpointService] Found ${checkpoints.length} checkpoints for thread ${threadId}`);
			if (checkpoints.length > 0) {
				console.log('[CheckpointService] Latest checkpoint:', {
					id: checkpoints[0].checkpoint.id,
					ts: checkpoints[0].checkpoint.ts,
					hasMessages: !!checkpoints[0].checkpoint.channel_values?.messages,
					messagesCount: Array.isArray(checkpoints[0].checkpoint.channel_values?.messages)
						? checkpoints[0].checkpoint.channel_values.messages.length
						: 'not an array'
				});
				// Return most recent checkpoint
				return checkpoints[0];
			}

			return undefined;
		} catch (error) {
			console.error("Error getting checkpoint:", error);
			return undefined;
		}
	}

	/**
	 * LangGraph interface: Save a checkpoint (newer interface)
	 */
	async put(
		config: RunnableConfig,
		checkpoint: Checkpoint,
		metadata: CheckpointMetadata,
		newVersions: ChannelVersions
	): Promise<RunnableConfig> {
		console.log('[CheckpointService] put called with newVersions:', newVersions);
		// Call putTuple which does the actual work
		return await this.putTuple(config, checkpoint, metadata);
	}

	/**
	 * LangGraph interface: Save a checkpoint (legacy interface)
	 */
	async putTuple(
		config: RunnableConfig,
		checkpoint: Checkpoint,
		metadata: CheckpointMetadata
	): Promise<RunnableConfig> {
		const threadId = config.configurable?.thread_id;

		if (!threadId) {
			throw new Error("thread_id is required in config.configurable");
		}

		try {
			// Copy checkpoint to avoid mutations
			const preparedCheckpoint = copyCheckpoint(checkpoint);
			const checkpointId = preparedCheckpoint.id || `checkpoint-${Date.now()}`;
			const path = this.getCheckpointPath(threadId, checkpointId);
			const adapter = this.app.vault.adapter;

			console.log('[CheckpointService] Saving checkpoint:', {
				threadId,
				checkpointId,
				checkpointKeys: Object.keys(preparedCheckpoint),
				channelValues: preparedCheckpoint.channel_values,
				messageCount: Array.isArray(preparedCheckpoint.channel_values?.messages) ? preparedCheckpoint.channel_values.messages.length : 0,
				fullCheckpoint: preparedCheckpoint
			});

			// Serialize checkpoint and metadata using serde
			const [[, serializedCheckpoint], [, serializedMetadata]] = await Promise.all([
				this.serde.dumpsTyped(preparedCheckpoint),
				this.serde.dumpsTyped(metadata)
			]);

			const data = {
				checkpoint: Array.from(serializedCheckpoint),
				metadata: Array.from(serializedMetadata),
				parentCheckpointId: config.configurable?.checkpoint_id
			};

			// Atomic write
			const tempPath = `${path}.tmp`;
			await adapter.write(tempPath, JSON.stringify(data, null, 2));

			if (await adapter.exists(path)) {
				await adapter.remove(path);
			}
			await adapter.rename(tempPath, path);

			// Update thread metadata
			let threadMeta = this.threadsMetadata.get(threadId);
			if (!threadMeta) {
				threadMeta = {
					threadId,
					title: `Conversation ${new Date().toLocaleString()}`,
					createdAt: Date.now(),
					updatedAt: Date.now(),
					messageCount: 0
				};
				this.threadsMetadata.set(threadId, threadMeta);
			} else {
				threadMeta.updatedAt = Date.now();
			}

			// Count messages in checkpoint
			if (checkpoint.channel_values?.messages && Array.isArray(checkpoint.channel_values.messages)) {
				threadMeta.messageCount = checkpoint.channel_values.messages.length;
			}

			await this.saveThreadsMetadata();

			return {
				configurable: {
					...config.configurable,
					checkpoint_id: checkpointId
				}
			};
		} catch (error) {
			console.error("Error saving checkpoint:", error);
			throw error;
		}
	}

	/**
	 * LangGraph interface: Save pending writes
	 */
	async putWrites(
		config: RunnableConfig,
		writes: PendingWrite[],
		taskId: string
	): Promise<void> {
		const threadId = config.configurable?.thread_id;

		if (!threadId) {
			throw new Error("thread_id is required in config.configurable");
		}

		try {
			const checkpointId = config.configurable?.checkpoint_id || `checkpoint-${Date.now()}`;
			const writesPath = `${this.basePath}/checkpoints/${threadId}-${checkpointId}-writes.json`;
			const adapter = this.app.vault.adapter;

			// Load existing writes or create new
			let allWrites: Record<string, PendingWrite[]> = {};
			if (await adapter.exists(writesPath)) {
				const content = await adapter.read(writesPath);
				allWrites = JSON.parse(content);
			}

			// Add new writes for this task
			allWrites[taskId] = writes;

			// Atomic write
			const tempPath = `${writesPath}.tmp`;
			await adapter.write(tempPath, JSON.stringify(allWrites, null, 2));

			if (await adapter.exists(writesPath)) {
				await adapter.remove(writesPath);
			}
			await adapter.rename(tempPath, writesPath);
		} catch (error) {
			console.error("Error saving writes:", error);
			throw error;
		}
	}

	/**
	 * LangGraph interface: List checkpoints for a thread
	 */
	async *list(
		config: RunnableConfig,
		options?: { limit?: number; before?: RunnableConfig }
	): AsyncGenerator<CheckpointTuple> {
		const threadId = config.configurable?.thread_id;

		if (!threadId) {
			return;
		}

		try {
			const checkpoints = await this.listCheckpoints(threadId);

			let count = 0;
			const limit = options?.limit || 10;

			for (const tuple of checkpoints) {
				if (count >= limit) break;
				yield tuple;
				count++;
			}
		} catch (error) {
			console.error("Error listing checkpoints:", error);
		}
	}

	/**
	 * Helper: List all checkpoints for a thread
	 */
	private async listCheckpoints(threadId: string): Promise<CheckpointTuple[]> {
		try {
			const adapter = this.app.vault.adapter;
			const checkpointsPath = `${this.basePath}/checkpoints`;

			if (!(await adapter.exists(checkpointsPath))) {
				return [];
			}

			const files = await adapter.list(checkpointsPath);
			const pattern = new RegExp(`^${threadId}-(.+)\\.json$`);
			const checkpointFiles = files.files.filter(f => {
				const filename = f.split('/').pop() || '';
				// Exclude -writes.json files
				return pattern.test(filename) && !filename.endsWith('-writes.json');
			});

			const tuples: CheckpointTuple[] = [];

			for (const file of checkpointFiles) {
				try {
					const content = await adapter.read(file);
					const data = JSON.parse(content);
					const checkpointId = file.split('/').pop()?.replace(`${threadId}-`, '').replace('.json', '');

					let checkpoint: Checkpoint;
					let metadata: CheckpointMetadata;

					// Format detection: if checkpoint is an array, it's NEW format (serialized)
					if (Array.isArray(data.checkpoint)) {
						// NEW FORMAT: Deserialize using serde
						checkpoint = await this.serde.loadsTyped("json", new Uint8Array(data.checkpoint)) as Checkpoint;
						metadata = await this.serde.loadsTyped("json", new Uint8Array(data.metadata)) as CheckpointMetadata;
					} else {
						// OLD FORMAT: Already plain JSON objects
						checkpoint = data.checkpoint as Checkpoint;
						metadata = data.metadata as CheckpointMetadata;
					}

					tuples.push({
						config: {
							configurable: {
								thread_id: threadId,
								checkpoint_id: checkpointId
							}
						},
						checkpoint,
						metadata,
						parentConfig: data.parentCheckpointId || data.parentConfig
							? { configurable: { thread_id: threadId, checkpoint_id: data.parentCheckpointId || data.parentConfig?.configurable?.checkpoint_id } }
							: undefined
					});
				} catch (error) {
					console.error(`Error reading checkpoint file ${file}:`, error);
				}
			}

			// Sort by timestamp (most recent first)
			tuples.sort((a, b) => {
				// Handle missing checkpoint or ts property
				// ts can be ISO string or timestamp number
				const timeA = a?.checkpoint?.ts
					? (typeof a.checkpoint.ts === 'string' ? new Date(a.checkpoint.ts).getTime() : a.checkpoint.ts)
					: 0;
				const timeB = b?.checkpoint?.ts
					? (typeof b.checkpoint.ts === 'string' ? new Date(b.checkpoint.ts).getTime() : b.checkpoint.ts)
					: 0;
				return timeB - timeA;
			});

			return tuples;
		} catch (error) {
			console.error("Error listing checkpoints:", error);
			return [];
		}
	}

	/**
	 * Create a new thread
	 */
	async createThread(title?: string): Promise<string> {
		const threadId = `thread-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		const metadata: ThreadMetadata = {
			threadId,
			title: title || `Conversation ${new Date().toLocaleString()}`,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			messageCount: 0
		};

		this.threadsMetadata.set(threadId, metadata);
		await this.saveThreadsMetadata();

		return threadId;
	}

	/**
	 * Get thread metadata
	 */
	getThread(threadId: string): ThreadMetadata | undefined {
		return this.threadsMetadata.get(threadId);
	}

	/**
	 * Delete a thread and all its checkpoints
	 */
	async deleteThread(threadId: string): Promise<void> {
		try {
			const adapter = this.app.vault.adapter;
			const checkpointsPath = `${this.basePath}/checkpoints`;

			if (await adapter.exists(checkpointsPath)) {
				const files = await adapter.list(checkpointsPath);
				const pattern = new RegExp(`^${threadId}-(.+)\\.json$`);

				for (const file of files.files) {
					const filename = file.split('/').pop() || '';
					if (pattern.test(filename)) {
						await adapter.remove(file);
					}
				}
			}

			this.threadsMetadata.delete(threadId);
			await this.saveThreadsMetadata();
		} catch (error) {
			console.error("Error deleting thread:", error);
			throw error;
		}
	}

	/**
	 * List all threads
	 */
	listThreads(): ThreadMetadata[] {
		const threads = Array.from(this.threadsMetadata.values());
		// Sort by most recently updated
		threads.sort((a, b) => b.updatedAt - a.updatedAt);
		return threads;
	}

	/**
	 * Update thread title
	 */
	async updateThreadTitle(threadId: string, title: string): Promise<void> {
		const metadata = this.threadsMetadata.get(threadId);
		if (metadata) {
			metadata.title = title;
			metadata.updatedAt = Date.now();
			await this.saveThreadsMetadata();
		}
	}
}
