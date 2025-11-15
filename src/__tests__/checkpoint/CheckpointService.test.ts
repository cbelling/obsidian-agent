import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CheckpointService, ThreadMetadata, StoredMessage } from '@/checkpoint/CheckpointService';

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
 * Tests persistent storage for conversation messages.
 * Follows TDD principles: test behavior, not implementation.
 */
describe('CheckpointService', () => {
	let checkpointService: CheckpointService;
	let mockApp: any;
	let adapter: MockAdapter;

	beforeEach(async () => {
		mockApp = createMockApp();
		adapter = mockApp.vault.adapter;
		checkpointService = new CheckpointService(mockApp, 'test-plugin');
		// Wait for async initialization
		await new Promise(resolve => setTimeout(resolve, 10));
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
		 * Behavior: Should remove thread metadata and conversation file
		 */
		it('should delete thread and its messages', async () => {
			const threadId = await checkpointService.createThread('Test Thread');

			// Add messages
			const messages: StoredMessage[] = [
				{ role: 'human', content: 'Hello' },
				{ role: 'ai', content: 'Hi there!' }
			];

			await checkpointService.saveMessages(threadId, messages);

			// Delete thread
			await checkpointService.deleteThread(threadId);

			// Verify thread is gone
			expect(checkpointService.getThread(threadId)).toBeUndefined();

			// Verify conversation file is removed
			const conversationPath = `.obsidian/plugins/test-plugin/conversations/${threadId}.json`;
			expect(await adapter.exists(conversationPath)).toBe(false);
		});
	});

	/**
	 * Test Group: Message Storage
	 *
	 * Tests for saving and retrieving messages.
	 */
	describe('Message Storage', () => {
		/**
		 * Test: Save messages
		 *
		 * Behavior: Should serialize and save messages to disk atomically
		 */
		it('should save messages with atomic write', async () => {
			const threadId = await checkpointService.createThread('Test');

			const messages: StoredMessage[] = [
				{ role: 'human', content: 'Hello' },
				{ role: 'ai', content: 'Hi there!' }
			];

			// Act
			await checkpointService.saveMessages(threadId, messages);

			// Verify file was written
			const conversationPath = `.obsidian/plugins/test-plugin/conversations/${threadId}.json`;
			expect(await adapter.exists(conversationPath)).toBe(true);

			// Verify thread metadata was updated
			const thread = checkpointService.getThread(threadId);
			expect(thread?.messageCount).toBe(2);
		});

		/**
		 * Test: Load messages
		 *
		 * Behavior: Should retrieve saved messages from disk
		 */
		it('should load saved messages', async () => {
			const threadId = await checkpointService.createThread('Test');

			const messages: StoredMessage[] = [
				{ role: 'human', content: 'Hello' },
				{ role: 'ai', content: 'Hi there!' },
				{ role: 'human', content: 'How are you?' },
				{ role: 'ai', content: 'I am doing well, thank you!' }
			];

			await checkpointService.saveMessages(threadId, messages);

			// Act
			const loadedMessages = await checkpointService.loadMessages(threadId);

			// Assert
			expect(loadedMessages).toHaveLength(4);
			expect(loadedMessages[0].role).toBe('human');
			expect(loadedMessages[0].content).toBe('Hello');
			expect(loadedMessages[3].role).toBe('ai');
			expect(loadedMessages[3].content).toBe('I am doing well, thank you!');
		});

		/**
		 * Test: Load messages for non-existent thread
		 */
		it('should return empty array for non-existent thread', async () => {
			const messages = await checkpointService.loadMessages('nonexistent');

			expect(messages).toEqual([]);
		});

		/**
		 * Test: Update messages
		 *
		 * Behavior: Should replace existing messages with new ones
		 */
		it('should update messages for existing thread', async () => {
			const threadId = await checkpointService.createThread('Test');

			const messages1: StoredMessage[] = [
				{ role: 'human', content: 'First message' }
			];

			await checkpointService.saveMessages(threadId, messages1);

			const messages2: StoredMessage[] = [
				{ role: 'human', content: 'First message' },
				{ role: 'ai', content: 'Second message' }
			];

			await checkpointService.saveMessages(threadId, messages2);

			// Act
			const loadedMessages = await checkpointService.loadMessages(threadId);

			// Assert
			expect(loadedMessages).toHaveLength(2);
			expect(loadedMessages[1].content).toBe('Second message');

			// Verify message count updated
			const thread = checkpointService.getThread(threadId);
			expect(thread?.messageCount).toBe(2);
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

			const messages: StoredMessage[] = [
				{ role: 'human', content: 'Test message' }
			];

			// Spy on adapter methods
			const writeSpy = vi.spyOn(adapter, 'write');
			const renameSpy = vi.spyOn(adapter, 'rename');

			await checkpointService.saveMessages(threadId, messages);

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
	 * Tests for pruning old data
	 */
	describe('History Management', () => {
		/**
		 * Test: Prune old conversations
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
			const deletedCount = await checkpointService.pruneOldConversations(30);

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
			// Create threads with messages
			const thread1 = await checkpointService.createThread('Thread 1');
			const thread2 = await checkpointService.createThread('Thread 2');

			const messages1: StoredMessage[] = [
				{ role: 'human', content: 'Hello' },
				{ role: 'ai', content: 'Hi!' }
			];

			const messages2: StoredMessage[] = [
				{ role: 'human', content: 'Test' }
			];

			await checkpointService.saveMessages(thread1, messages1);
			await checkpointService.saveMessages(thread2, messages2);

			const stats = await checkpointService.getStorageStats();

			expect(stats.totalThreads).toBe(2);
			expect(stats.totalMessages).toBe(3);
			expect(stats.oldestThread).toBeDefined();
			expect(stats.newestThread).toBeDefined();
		});

		/**
		 * Test: Empty storage stats
		 */
		it('should return zero stats for empty storage', async () => {
			const stats = await checkpointService.getStorageStats();

			expect(stats.totalThreads).toBe(0);
			expect(stats.totalMessages).toBe(0);
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
		 * Test: Handle corrupted conversation file
		 */
		it('should handle corrupted conversation files gracefully', async () => {
			const threadId = await checkpointService.createThread('Test');

			// Write corrupted conversation file
			const conversationPath = `.obsidian/plugins/test-plugin/conversations/${threadId}.json`;
			await adapter.write(conversationPath, 'invalid json {{{');

			// Should not throw, just return empty array
			const messages = await checkpointService.loadMessages(threadId);

			expect(messages).toEqual([]);
		});

		/**
		 * Test: Handle missing directories
		 */
		it('should create directories if they don\'t exist', async () => {
			// Fresh service should create directories
			const newService = new CheckpointService(mockApp, 'new-plugin');

			// Wait for async directory creation
			await new Promise(resolve => setTimeout(resolve, 10));

			// Should be able to save messages
			const threadId = await newService.createThread('Test');
			const messages: StoredMessage[] = [
				{ role: 'human', content: 'Test' }
			];

			await expect(
				newService.saveMessages(threadId, messages)
			).resolves.toBeUndefined();
		});
	});
});
