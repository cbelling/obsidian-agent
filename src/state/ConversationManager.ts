import { BaseMessage } from '@langchain/core/messages';
import { CheckpointService } from '../checkpoint/CheckpointService';
import { RunnableConfig } from '@langchain/core/runnables';

/**
 * Represents a conversation thread with messages and metadata
 */
export interface Conversation {
	id: string;
	title: string;
	messages: BaseMessage[];
	createdAt: number;
	updatedAt: number;
	messageCount: number;
}

/**
 * ConversationManager
 *
 * Centralized manager for conversation state and persistence.
 * Provides a single source of truth for conversation data and abstracts
 * the complexity of checkpoint management.
 *
 * Key responsibilities:
 * - Manage conversation lifecycle (create, load, delete)
 * - Track current active conversation
 * - Handle message additions and history
 * - Coordinate with CheckpointService for persistence
 * - Provide clean API for ChatView
 */
export class ConversationManager {
	private currentThreadId: string | null = null;
	private currentMessages: BaseMessage[] = [];

	constructor(
		private checkpointService: CheckpointService
	) {}

	/**
	 * Get the current thread ID
	 */
	getCurrentThreadId(): string | null {
		return this.currentThreadId;
	}

	/**
	 * Get the current conversation
	 */
	async getCurrentConversation(): Promise<Conversation | null> {
		if (!this.currentThreadId) {
			return null;
		}

		const threadMeta = this.checkpointService.getThread(this.currentThreadId);
		if (!threadMeta) {
			return null;
		}

		// Load messages from checkpoint
		await this.loadMessages(this.currentThreadId);

		return {
			id: this.currentThreadId,
			title: threadMeta.title,
			messages: this.currentMessages,
			createdAt: threadMeta.createdAt,
			updatedAt: threadMeta.updatedAt,
			messageCount: this.currentMessages.length
		};
	}

	/**
	 * Create a new conversation thread
	 */
	async createConversation(title?: string): Promise<Conversation> {
		const threadId = await this.checkpointService.createThread(
			title || `Conversation ${new Date().toLocaleString()}`
		);

		this.currentThreadId = threadId;
		this.currentMessages = [];

		const threadMeta = this.checkpointService.getThread(threadId)!;

		return {
			id: threadId,
			title: threadMeta.title,
			messages: [],
			createdAt: threadMeta.createdAt,
			updatedAt: threadMeta.updatedAt,
			messageCount: 0
		};
	}

	/**
	 * Load an existing conversation
	 */
	async loadConversation(threadId: string): Promise<Conversation | null> {
		const threadMeta = this.checkpointService.getThread(threadId);
		if (!threadMeta) {
			return null;
		}

		this.currentThreadId = threadId;
		await this.loadMessages(threadId);

		return {
			id: threadId,
			title: threadMeta.title,
			messages: this.currentMessages,
			createdAt: threadMeta.createdAt,
			updatedAt: threadMeta.updatedAt,
			messageCount: this.currentMessages.length
		};
	}

	/**
	 * Load the most recent conversation, or create a new one if none exist
	 */
	async loadMostRecentOrCreate(): Promise<Conversation> {
		const threads = this.checkpointService.listThreads();

		if (threads.length > 0) {
			// Load most recent thread
			const mostRecent = threads[0];
			const conversation = await this.loadConversation(mostRecent.threadId);
			if (conversation) {
				return conversation;
			}
		}

		// No threads exist, create new one
		return await this.createConversation();
	}

	/**
	 * Delete a conversation thread
	 */
	async deleteConversation(threadId: string): Promise<void> {
		await this.checkpointService.deleteThread(threadId);

		// If we deleted the current conversation, clear state
		if (this.currentThreadId === threadId) {
			this.currentThreadId = null;
			this.currentMessages = [];
		}
	}

	/**
	 * List all conversations
	 */
	listConversations(): Array<{
		id: string;
		title: string;
		createdAt: number;
		updatedAt: number;
		messageCount: number;
	}> {
		return this.checkpointService.listThreads().map(thread => ({
			id: thread.threadId,
			title: thread.title,
			createdAt: thread.createdAt,
			updatedAt: thread.updatedAt,
			messageCount: thread.messageCount
		}));
	}

	/**
	 * Update conversation title
	 */
	async updateConversationTitle(threadId: string, title: string): Promise<void> {
		await this.checkpointService.updateThreadTitle(threadId, title);
	}

	/**
	 * Get current messages in memory
	 */
	getCurrentMessages(): BaseMessage[] {
		return [...this.currentMessages];
	}

	/**
	 * Add a message to the current conversation (in-memory only)
	 * Note: Actual persistence happens when the agent saves checkpoints
	 */
	addMessage(message: BaseMessage): void {
		if (!this.currentThreadId) {
			throw new Error('No active conversation. Create or load a conversation first.');
		}
		this.currentMessages.push(message);
	}

	/**
	 * Clear current conversation messages (in-memory only)
	 */
	clearCurrentMessages(): void {
		this.currentMessages = [];
	}

	/**
	 * Get RunnableConfig for LangGraph agent invocation
	 */
	getAgentConfig(metadata?: Record<string, any>): RunnableConfig {
		if (!this.currentThreadId) {
			throw new Error('No active conversation. Create or load a conversation first.');
		}

		return {
			configurable: { thread_id: this.currentThreadId },
			metadata: metadata || {},
		};
	}

	/**
	 * Load messages from checkpoint
	 */
	private async loadMessages(threadId: string): Promise<void> {
		try {
			const config = {
				configurable: { thread_id: threadId }
			};

			const checkpoint = await this.checkpointService.getTuple(config);

			if (checkpoint && checkpoint.checkpoint.channel_values?.messages) {
				const messages = checkpoint.checkpoint.channel_values.messages;

				if (Array.isArray(messages) && messages.length > 0) {
					this.currentMessages = messages;
					console.log(`[ConversationManager] Loaded ${messages.length} messages for thread ${threadId}`);
				} else {
					this.currentMessages = [];
				}
			} else {
				this.currentMessages = [];
			}
		} catch (error) {
			console.error('[ConversationManager] Error loading messages:', error);
			this.currentMessages = [];
		}
	}

	/**
	 * Sync messages from agent result back to in-memory state
	 * Call this after agent.invoke() to update the conversation state
	 */
	syncFromAgentResult(agentMessages: BaseMessage[]): void {
		if (!this.currentThreadId) {
			throw new Error('No active conversation');
		}
		this.currentMessages = agentMessages;
	}

	/**
	 * Prune old conversations based on retention policy
	 */
	async pruneOldConversations(retentionDays: number): Promise<number> {
		return await this.checkpointService.pruneOldCheckpoints(retentionDays);
	}

	/**
	 * Trim conversation history to max size
	 */
	async trimConversationHistory(threadId: string, maxHistorySize: number): Promise<boolean> {
		return await this.checkpointService.trimConversationHistory(threadId, maxHistorySize);
	}

	/**
	 * Get storage statistics
	 */
	async getStorageStats(): Promise<{
		totalThreads: number;
		totalCheckpoints: number;
		oldestThread: number | null;
		newestThread: number | null;
	}> {
		return await this.checkpointService.getStorageStats();
	}
}
