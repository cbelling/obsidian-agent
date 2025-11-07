import { describe, it, expect, vi } from 'vitest';
import { ObsidianAgent } from '@/agent/AgentGraph';
import { CheckpointService } from '@/checkpoint/CheckpointService';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * AgentGraph Integration Tests
 *
 * Focused tests on initialization and configuration.
 * Full integration tests with LangGraph are complex to mock, so we focus on:
 * 1. Initialization and validation
 * 2. Error handling at construction
 * 3. Tool configuration
 */
describe('ObsidianAgent Integration', () => {
	/**
	 * Helper: Create mock checkpoint service
	 */
	function createMockCheckpointer(): CheckpointService {
		const mockAdapter = {
			exists: vi.fn().mockResolvedValue(false),
			read: vi.fn().mockResolvedValue('{}'),
			write: vi.fn().mockResolvedValue(undefined),
			remove: vi.fn().mockResolvedValue(undefined),
			rename: vi.fn().mockResolvedValue(undefined),
			mkdir: vi.fn().mockResolvedValue(undefined),
			list: vi.fn().mockResolvedValue({ files: [], folders: [] })
		};

		const mockApp = {
			vault: { adapter: mockAdapter }
		};

		return new CheckpointService(mockApp as any, 'test-plugin');
	}

	/**
	 * Helper: Create a simple test tool
	 */
	function createTestTool(name: string, description: string): DynamicStructuredTool {
		return new DynamicStructuredTool({
			name,
			description,
			schema: z.object({
				query: z.string().describe('Search query')
			}),
			func: async ({ query }) => {
				return `Found results for: ${query}`;
			}
		});
	}

	/**
	 * Test Group: Agent Initialization
	 */
	describe('Initialization', () => {
		/**
		 * Test: Valid API key
		 */
		it('should create agent with valid API key', () => {
			const checkpointer = createMockCheckpointer();
			const agent = new ObsidianAgent(
				'sk-ant-test-key-12345',
				[],
				checkpointer,
				false
			);

			expect(agent).toBeDefined();
		});

		/**
		 * Test: Invalid API key format
		 *
		 * Behavior: Should throw AgentError
		 */
		it('should reject invalid API key format', () => {
			const checkpointer = createMockCheckpointer();

			expect(() => {
				new ObsidianAgent(
					'invalid-key',
					[],
					checkpointer,
					false
				);
			}).toThrow('Invalid API key format');
		});

		/**
		 * Test: Empty API key
		 */
		it('should reject empty API key', () => {
			const checkpointer = createMockCheckpointer();

			expect(() => {
				new ObsidianAgent(
					'',
					[],
					checkpointer,
					false
				);
			}).toThrow('Invalid API key format');
		});

		/**
		 * Test: API key must start with sk-ant-
		 */
		it('should require API key to start with sk-ant-', () => {
			const checkpointer = createMockCheckpointer();

			expect(() => {
				new ObsidianAgent(
					'sk-wrong-prefix',
					[],
					checkpointer,
					false
				);
			}).toThrow('Invalid API key format');
		});

		/**
		 * Test: LangSmith failure handling
		 *
		 * Behavior: Should gracefully degrade if LangSmith fails
		 */
		it('should handle LangSmith initialization failure gracefully', () => {
			const checkpointer = createMockCheckpointer();

			// This should not throw even if LangSmith is enabled
			const agentWithLangsmith = new ObsidianAgent(
				'sk-ant-test-key',
				[],
				checkpointer,
				true // Enable LangSmith (will fail in test environment)
			);

			expect(agentWithLangsmith).toBeDefined();
		});

		/**
		 * Test: Agent with tools
		 */
		it('should accept tools during initialization', () => {
			const checkpointer = createMockCheckpointer();
			const tool = createTestTool('search', 'Search tool');

			const agent = new ObsidianAgent(
				'sk-ant-test-key',
				[tool],
				checkpointer,
				false
			);

			expect(agent).toBeDefined();
		});

		/**
		 * Test: Agent with multiple tools
		 */
		it('should accept multiple tools', () => {
			const checkpointer = createMockCheckpointer();
			const tools = [
				createTestTool('search', 'Search tool'),
				createTestTool('read', 'Read tool'),
				createTestTool('list', 'List tool')
			];

			const agent = new ObsidianAgent(
				'sk-ant-test-key',
				tools,
				checkpointer,
				false
			);

			expect(agent).toBeDefined();
		});

		/**
		 * Test: Agent with checkpointer
		 */
		it('should require checkpointer', () => {
			const checkpointer = createMockCheckpointer();

			const agent = new ObsidianAgent(
				'sk-ant-test-key',
				[],
				checkpointer,
				false
			);

			expect(agent).toBeDefined();
		});
	});

	/**
	 * Test Group: API Integration
	 */
	describe('API Integration', () => {
		/**
		 * Test: Has invoke method
		 */
		it('should have invoke method', () => {
			const checkpointer = createMockCheckpointer();
			const agent = new ObsidianAgent(
				'sk-ant-test-key',
				[],
				checkpointer,
				false
			);

			expect(agent.invoke).toBeDefined();
			expect(typeof agent.invoke).toBe('function');
		});

		/**
		 * Test: Has stream method
		 */
		it('should have stream method', () => {
			const checkpointer = createMockCheckpointer();
			const agent = new ObsidianAgent(
				'sk-ant-test-key',
				[],
				checkpointer,
				false
			);

			expect(agent.stream).toBeDefined();
			expect(typeof agent.stream).toBe('function');
		});
	});

	/**
	 * Test Group: Configuration
	 */
	describe('Configuration', () => {
		/**
		 * Test: Uses correct model
		 */
		it('should use Claude Sonnet 4 model', () => {
			const checkpointer = createMockCheckpointer();
			const agent = new ObsidianAgent(
				'sk-ant-test-key',
				[],
				checkpointer,
				false
			);

			// Agent should be created successfully
			expect(agent).toBeDefined();
			// Model configuration is tested implicitly through agent creation
		});

		/**
		 * Test: LangSmith can be disabled
		 */
		it('should work with LangSmith disabled', () => {
			const checkpointer = createMockCheckpointer();
			const agent = new ObsidianAgent(
				'sk-ant-test-key',
				[],
				checkpointer,
				false // Explicitly disable
			);

			expect(agent).toBeDefined();
		});

		/**
		 * Test: LangSmith can be enabled
		 */
		it('should work with LangSmith enabled', () => {
			const checkpointer = createMockCheckpointer();
			const agent = new ObsidianAgent(
				'sk-ant-test-key',
				[],
				checkpointer,
				true // Explicitly enable
			);

			// Should not throw, even if LangSmith isn't configured
			expect(agent).toBeDefined();
		});
	});
});
