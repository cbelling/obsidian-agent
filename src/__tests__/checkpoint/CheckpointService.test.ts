import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CheckpointService, ThreadMetadata } from '@/checkpoint/CheckpointService';
import { Checkpoint, CheckpointMetadata } from '@langchain/langgraph-checkpoint';
import { RunnableConfig } from '@langchain/core/runnables';

/**
 * MockAdapter - Simulates Obsidian's file system adapter
 *
 * Stores files in memory for fast, isolated testing.
 */
class MockAdapter {
	private files: Map<string, string> = new Map();
	private dirs: Set<string> = new Set();

	async exists(path: string): Promise<boolean> {
		return this.files.has(path) || this.dirs.has(path);
	}

	async read(path: string): Promise<string> {
		const content = this.files.get(path);
		if (content === undefined) {
			throw new Error(`File not found: ${path}`);
		}
		return content;
	}

	async write(path: string, content: string): Promise<void> {
		this.files.set(path, content);
	}

	async remove(path: string): Promise<void> {
		this.files.delete(path);
	}

	async rename(oldPath: string, newPath: string): Promise<void> {
		const content = this.files.get(oldPath);
		if (content === undefined) {
			throw new Error(`File not found: ${oldPath}`);
		}
		this.files.set(newPath, content);
		this.files.delete(oldPath);
	}

	async mkdir(path: string): Promise<void> {
		this.dirs.add(path);
	}

	async list(path: string): Promise<{ files: string[], folders: string[] }> {
		const files: string[] = [];
		const folders: string[] = [];

		for (const filePath of this.files.keys()) {
			if (filePath.startsWith(path)) {
				files.push(filePath);
			}
		}

		return { files, folders };
	}

	clear(): void {
		this.files.clear();
		this.dirs.clear();
	}
}

/**
 * Helper: Create mock App with adapter
 */
function createMockApp(): any {
	const adapter = new MockAdapter();
	return {
		vault: {
			adapter
		}
	};
}

/**
 * CheckpointService Test Suite
 *
 * Tests persistent storage for LangGraph checkpoints.
 * Follows TDD principles: test behavior, not implementation.
 */
describe('CheckpointService', () => {
	let checkpointService: CheckpointService;
	let mockApp: any;
	let adapter: MockAdapter;

	beforeEach(() => {
		mockApp = createMockApp();
		adapter = mockApp.vault.adapter;
		checkpointService = new CheckpointService(mockApp, 'test-plugin');
	});

	afterEach(() => {
		adapter.clear();
	});

	/**
	 * Test Group: Thread Management
	 *
	 * Tests for creating, listing, and deleting conversation threads.
	 */
	describe('Thread Management', () => {
		/**
		 * Test: Create a new thread
		 *
		 * Behavior: Should generate unique thread ID and save metadata
		 */
		it('should create new thread with generated ID', async () => {
			// Act
			const threadId = await checkpointService.createThread('Test Conversation');

			// Assert
			expect(threadId).toMatch(/^thread-\d+-[a-z0-9]+$/);

			const thread = checkpointService.getThread(threadId);
			expect(thread).toBeDefined();
			expect(thread?.title).toBe('Test Conversation');
			expect(thread?.messageCount).toBe(0);
		});

		/**
		 * Test: Create thread with default title
		 */
		it('should create thread with default title when none provided', async () => {
			const threadId = await checkpointService.createThread();
			const thread = checkpointService.getThread(threadId);

			expect(thread?.title).toMatch(/^Conversation /);
		});

		/**
		 * Test: List all threads
		 *
		 * Behavior: Should return threads sorted by most recent first
		 */
		it('should list threads sorted by most recent', async () => {
			// Arrange: Create multiple threads
			const thread1 = await checkpointService.createThread('Thread 1');
			await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
			const thread2 = await checkpointService.createThread('Thread 2');
			await new Promise(resolve => setTimeout(resolve, 10));
			const thread3 = await checkpointService.createThread('Thread 3');

			// Act
			const threads = checkpointService.listThreads();

			// Assert
			expect(threads).toHaveLength(3);
			expect(threads[0].threadId).toBe(thread3); // Most recent first
			expect(threads[1].threadId).toBe(thread2);
			expect(threads[2].threadId).toBe(thread1);
		});

		/**
		 * Test: Get specific thread
		 */
		it('should get thread by ID', async () => {
			const threadId = await checkpointService.createThread('My Thread');
			const thread = checkpointService.getThread(threadId);

			expect(thread).toBeDefined();
			expect(thread?.threadId).toBe(threadId);
			expect(thread?.title).toBe('My Thread');
		});

		/**
		 * Test: Get non-existent thread
		 */
		it('should return undefined for non-existent thread', () => {
			const thread = checkpointService.getThread('nonexistent-thread');
			expect(thread).toBeUndefined();
		});

		/**
		 * Test: Update thread title
		 */
		it('should update thread title', async () => {
			const threadId = await checkpointService.createThread('Old Title');

			await checkpointService.updateThreadTitle(threadId, 'New Title');

			const thread = checkpointService.getThread(threadId);
			expect(thread?.title).toBe('New Title');
		});

		/**
		 * Test: Delete thread
		 *
		 * Behavior: Should remove thread metadata and all checkpoints
		 */
		it('should delete thread and its checkpoints', async () => {
			const threadId = await checkpointService.createThread('Test Thread');

			// Add a checkpoint
			const checkpoint: Checkpoint = {
				v: 1,
				id: 'checkpoint-1',
				ts: Date.now().toString(),
				channel_values: { messages: ['test'] },
				channel_versions: {},
				versions_seen: {},
				pending_sends: []
			};

			const config: RunnableConfig = {
				configurable: { thread_id: threadId }
			};

			await checkpointService.putTuple(config, checkpoint, { source: 'update', step: 0, writes: null, parents: {} });

			// Delete thread
			await checkpointService.deleteThread(threadId);

			// Verify thread is gone
			expect(checkpointService.getThread(threadId)).toBeUndefined();

			// Verify checkpoint file is removed
			const checkpointPath = `.obsidian/plugins/test-plugin/checkpoints/${threadId}-checkpoint-1.json`;
			expect(await adapter.exists(checkpointPath)).toBe(false);
		});
	});

	/**
	 * Test Group: Checkpoint Storage
	 *
	 * Tests for saving and retrieving checkpoints.
	 */
	describe('Checkpoint Storage', () => {
		/**
		 * Test: Save checkpoint
		 *
		 * Behavior: Should serialize and save checkpoint to disk atomically
		 */
		it('should save checkpoint with atomic write', async () => {
			const threadId = await checkpointService.createThread('Test');

			const checkpoint: Checkpoint = {
				v: 1,
				id: 'checkpoint-1',
				ts: Date.now().toString(),
				channel_values: {
					messages: [
						{ role: 'user', content: 'Hello' },
						{ role: 'assistant', content: 'Hi there!' }
					]
				},
				channel_versions: {},
				versions_seen: {},
				pending_sends: []
			};

			const config: RunnableConfig = {
				configurable: { thread_id: threadId }
			};

			const metadata: CheckpointMetadata = {
				source: 'update',
				step: 1,
				writes: null,
				parents: {}
			};

			// Act
			const result = await checkpointService.putTuple(config, checkpoint, metadata);

			// Assert
			expect(result.configurable?.thread_id).toBe(threadId);
			expect(result.configurable?.checkpoint_id).toBe('checkpoint-1');

			// Verify file was written
			const checkpointPath = `.obsidian/plugins/test-plugin/checkpoints/${threadId}-checkpoint-1.json`;
			expect(await adapter.exists(checkpointPath)).toBe(true);

			// Verify thread metadata was updated
			const thread = checkpointService.getThread(threadId);
			expect(thread?.messageCount).toBe(2);
		});

		/**
		 * Test: Save checkpoint without thread_id
		 *
		 * Behavior: Should throw error
		 */
		it('should throw error when saving checkpoint without thread_id', async () => {
			const checkpoint: Checkpoint = {
				v: 1,
				id: 'checkpoint-1',
				ts: Date.now().toString(),
				channel_values: {},
				channel_versions: {},
				versions_seen: {},
				pending_sends: []
			};

			const config: RunnableConfig = {
				configurable: {} // Missing thread_id
			};

			await expect(
				checkpointService.putTuple(config, checkpoint, { source: 'update', step: 0, writes: null, parents: {} })
			).rejects.toThrow('thread_id is required');
		});

		/**
		 * Test: Get latest checkpoint
		 *
		 * Behavior: Should return most recent checkpoint for thread
		 */
		it('should retrieve latest checkpoint', async () => {
			const threadId = await checkpointService.createThread('Test');

			// Save multiple checkpoints
			const checkpoint1: Checkpoint = {
				v: 1,
				id: 'checkpoint-1',
				ts: new Date('2024-01-01').toISOString(),
				channel_values: { messages: ['message 1'] },
				channel_versions: {},
				versions_seen: {},
				pending_sends: []
			};

			const checkpoint2: Checkpoint = {
				v: 1,
				id: 'checkpoint-2',
				ts: new Date('2024-01-02').toISOString(),
				channel_values: { messages: ['message 1', 'message 2'] },
				channel_versions: {},
				versions_seen: {},
				pending_sends: []
			};

			const config: RunnableConfig = {
				configurable: { thread_id: threadId }
			};

			await checkpointService.putTuple(config, checkpoint1, { source: 'update', step: 0, writes: null, parents: {} });
			await checkpointService.putTuple(config, checkpoint2, { source: 'update', step: 1, writes: null, parents: {} });

			// Act
			const tuple = await checkpointService.getTuple(config);

			// Assert
			expect(tuple).toBeDefined();
			expect(tuple?.checkpoint.id).toBe('checkpoint-2'); // Should get latest
			expect(tuple?.checkpoint.channel_values?.messages).toHaveLength(2);
		});

		/**
		 * Test: Get specific checkpoint by ID
		 */
		it('should retrieve specific checkpoint by ID', async () => {
			const threadId = await checkpointService.createThread('Test');

			const checkpoint1: Checkpoint = {
				v: 1,
				id: 'checkpoint-1',
				ts: Date.now().toString(),
				channel_values: { messages: ['message 1'] },
				channel_versions: {},
				versions_seen: {},
				pending_sends: []
			};

			const checkpoint2: Checkpoint = {
				v: 1,
				id: 'checkpoint-2',
				ts: Date.now().toString(),
				channel_values: { messages: ['message 1', 'message 2'] },
				channel_versions: {},
				versions_seen: {},
				pending_sends: []
			};

			const config: RunnableConfig = {
				configurable: { thread_id: threadId }
			};

			await checkpointService.putTuple(config, checkpoint1, { source: 'update', step: 0, writes: null, parents: {} });
			await checkpointService.putTuple(config, checkpoint2, { source: 'update', step: 1, writes: null, parents: {} });

			// Get specific checkpoint
			const tuple = await checkpointService.getTuple({
				configurable: { thread_id: threadId, checkpoint_id: 'checkpoint-1' }
			});

			expect(tuple?.checkpoint.id).toBe('checkpoint-1');
			expect(tuple?.checkpoint.channel_values?.messages).toHaveLength(1);
		});

		/**
		 * Test: Get checkpoint for non-existent thread
		 */
		it('should return undefined for non-existent thread', async () => {
			const tuple = await checkpointService.getTuple({
				configurable: { thread_id: 'nonexistent' }
			});

			expect(tuple).toBeUndefined();
		});
	});

	/**
	 * Test Group: Atomic Write Operations
	 *
	 * Tests that writes are atomic (temp file + rename pattern)
	 */
	describe('Atomic Writes', () => {
		/**
		 * Test: Atomic write creates temp file first
		 *
		 * Behavior: Should write to .tmp file, then rename
		 */
		it('should use temp file for atomic writes', async () => {
			const threadId = await checkpointService.createThread('Test');

			const checkpoint: Checkpoint = {
				v: 1,
				id: 'checkpoint-1',
				ts: Date.now().toString(),
				channel_values: { messages: [] },
				channel_versions: {},
				versions_seen: {},
				pending_sends: []
			};

			// Spy on adapter methods
			const writeSpy = vi.spyOn(adapter, 'write');
			const renameSpy = vi.spyOn(adapter, 'rename');

			await checkpointService.putTuple(
				{ configurable: { thread_id: threadId } },
				checkpoint,
				{ source: 'update', step: 0, writes: null, parents: {} }
			);

			// Verify temp file was used
			expect(writeSpy).toHaveBeenCalledWith(
				expect.stringContaining('.tmp'),
				expect.any(String)
			);

			// Verify rename was called
			expect(renameSpy).toHaveBeenCalled();
		});
	});

	/**
	 * Test Group: History Management
	 *
	 * Tests for trimming and pruning old data
	 */
	describe('History Management', () => {
		/**
		 * Test: Trim conversation history
		 *
		 * Behavior: Should keep only most recent N messages
		 */
		it('should trim conversation history to max size', async () => {
			const threadId = await checkpointService.createThread('Test');

			// Create checkpoint with many messages
			const messages = Array.from({ length: 100 }, (_, i) => ({
				role: i % 2 === 0 ? 'user' : 'assistant',
				content: `Message ${i}`
			}));

			const checkpoint: Checkpoint = {
				v: 1,
				id: 'checkpoint-1',
				ts: Date.now().toString(),
				channel_values: { messages },
				channel_versions: {},
				versions_seen: {},
				pending_sends: []
			};

			await checkpointService.putTuple(
				{ configurable: { thread_id: threadId } },
				checkpoint,
				{ source: 'update', step: 0, writes: null, parents: {} }
			);

			// Trim to 20 messages
			const wasTrimmed = await checkpointService.trimConversationHistory(threadId, 20);

			expect(wasTrimmed).toBe(true);

			// Verify trimmed checkpoint
			const tuple = await checkpointService.getTuple({
				configurable: { thread_id: threadId }
			});

			expect(tuple?.checkpoint.channel_values?.messages).toHaveLength(20);
		});

		/**
		 * Test: Don't trim if already under limit
		 */
		it('should not trim if history is under max size', async () => {
			const threadId = await checkpointService.createThread('Test');

			const checkpoint: Checkpoint = {
				v: 1,
				id: 'checkpoint-1',
				ts: Date.now().toString(),
				channel_values: {
					messages: [
						{ role: 'user', content: 'Hello' },
						{ role: 'assistant', content: 'Hi' }
					]
				},
				channel_versions: {},
				versions_seen: {},
				pending_sends: []
			};

			await checkpointService.putTuple(
				{ configurable: { thread_id: threadId } },
				checkpoint,
				{ source: 'update', step: 0, writes: null, parents: {} }
			);

			const wasTrimmed = await checkpointService.trimConversationHistory(threadId, 100);

			expect(wasTrimmed).toBe(false);
		});

		/**
		 * Test: Prune old checkpoints
		 *
		 * Behavior: Should delete threads older than retention period
		 */
		it('should prune threads older than retention period', async () => {
			// Create old thread
			const oldThreadId = await checkpointService.createThread('Old Thread');
			const oldThread = checkpointService.getThread(oldThreadId);
			if (oldThread) {
				// Manually set old date
				oldThread.updatedAt = Date.now() - (60 * 24 * 60 * 60 * 1000); // 60 days ago
			}

			// Create recent thread
			const newThreadId = await checkpointService.createThread('New Thread');

			// Prune threads older than 30 days
			const deletedCount = await checkpointService.pruneOldCheckpoints(30);

			expect(deletedCount).toBe(1);
			expect(checkpointService.getThread(oldThreadId)).toBeUndefined();
			expect(checkpointService.getThread(newThreadId)).toBeDefined();
		});
	});

	/**
	 * Test Group: Storage Statistics
	 *
	 * Tests for getting storage information
	 */
	describe('Storage Statistics', () => {
		/**
		 * Test: Get storage stats
		 */
		it('should return storage statistics', async () => {
			// Create threads with checkpoints
			const thread1 = await checkpointService.createThread('Thread 1');
			const thread2 = await checkpointService.createThread('Thread 2');

			const checkpoint: Checkpoint = {
				v: 1,
				id: 'checkpoint-1',
				ts: Date.now().toString(),
				channel_values: { messages: [] },
				channel_versions: {},
				versions_seen: {},
				pending_sends: []
			};

			await checkpointService.putTuple(
				{ configurable: { thread_id: thread1 } },
				checkpoint,
				{ source: 'update', step: 0, writes: null, parents: {} }
			);

			await checkpointService.putTuple(
				{ configurable: { thread_id: thread2 } },
				checkpoint,
				{ source: 'update', step: 0, writes: null, parents: {} }
			);

			const stats = await checkpointService.getStorageStats();

			expect(stats.totalThreads).toBe(2);
			expect(stats.totalCheckpoints).toBe(2);
			expect(stats.oldestThread).toBeDefined();
			expect(stats.newestThread).toBeDefined();
		});

		/**
		 * Test: Empty storage stats
		 */
		it('should return zero stats for empty storage', async () => {
			const stats = await checkpointService.getStorageStats();

			expect(stats.totalThreads).toBe(0);
			expect(stats.totalCheckpoints).toBe(0);
			expect(stats.oldestThread).toBeNull();
			expect(stats.newestThread).toBeNull();
		});
	});

	/**
	 * Test Group: Error Handling
	 *
	 * Tests for graceful error handling
	 */
	describe('Error Handling', () => {
		/**
		 * Test: Handle corrupted checkpoint file
		 */
		it('should handle corrupted checkpoint files gracefully', async () => {
			const threadId = await checkpointService.createThread('Test');

			// Write corrupted checkpoint file
			const checkpointPath = `.obsidian/plugins/test-plugin/checkpoints/${threadId}-corrupted.json`;
			await adapter.write(checkpointPath, 'invalid json {{{');

			// Should not throw, just return empty list
			const tuple = await checkpointService.getTuple({
				configurable: { thread_id: threadId }
			});

			expect(tuple).toBeUndefined();
		});

		/**
		 * Test: Handle missing directories
		 */
		it('should create directories if they don\'t exist', async () => {
			// Fresh service should create directories
			const newService = new CheckpointService(mockApp, 'new-plugin');

			// Should be able to save checkpoint
			const threadId = await newService.createThread('Test');
			const checkpoint: Checkpoint = {
				v: 1,
				id: 'checkpoint-1',
				ts: Date.now().toString(),
				channel_values: {},
				channel_versions: {},
				versions_seen: {},
				pending_sends: []
			};

			await expect(
				newService.putTuple(
					{ configurable: { thread_id: threadId } },
					checkpoint,
					{ source: 'update', step: 0, writes: null, parents: {} }
				)
			).resolves.toBeDefined();
		});
	});
});
