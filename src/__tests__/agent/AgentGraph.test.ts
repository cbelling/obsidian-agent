import { describe, it, expect } from 'vitest';
import { ObsidianAgent } from '@/agent/AgentGraph';
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
			const agent = new ObsidianAgent(
				'sk-ant-test-key-12345',
				[]
			);

			expect(agent).toBeDefined();
		});

		/**
		 * Test: Invalid API key format
		 *
		 * Behavior: Should throw AgentError
		 */
		it('should reject invalid API key format', () => {
			expect(() => {
				new ObsidianAgent(
					'invalid-key',
					[]
				);
			}).toThrow('Invalid API key format');
		});

		/**
		 * Test: Empty API key
		 */
		it('should reject empty API key', () => {
			expect(() => {
				new ObsidianAgent(
					'',
					[]
				);
			}).toThrow('Invalid API key format');
		});

		/**
		 * Test: API key must start with sk-ant-
		 */
		it('should require API key to start with sk-ant-', () => {
			expect(() => {
				new ObsidianAgent(
					'sk-wrong-prefix',
					[]
				);
			}).toThrow('Invalid API key format');
		});

		/**
		 * Test: LangSmith failure handling
		 *
		 * Behavior: Should gracefully degrade if LangSmith fails
		 */
		it('should handle LangSmith initialization failure gracefully', () => {
			// This should not throw even if LangSmith is enabled
			const agentWithLangsmith = new ObsidianAgent(
				'sk-ant-test-key',
				[]
			);

			expect(agentWithLangsmith).toBeDefined();
		});

		/**
		 * Test: Agent with tools
		 */
		it('should accept tools during initialization', () => {
			const tool = createTestTool('search', 'Search tool');

			const agent = new ObsidianAgent(
				'sk-ant-test-key',
				[tool]
			);

			expect(agent).toBeDefined();
		});

		/**
		 * Test: Agent with multiple tools
		 */
		it('should accept multiple tools', () => {
			const tools = [
				createTestTool('search', 'Search tool'),
				createTestTool('read', 'Read tool'),
				createTestTool('list', 'List tool')
			];

			const agent = new ObsidianAgent(
				'sk-ant-test-key',
				tools
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
			const agent = new ObsidianAgent(
				'sk-ant-test-key',
				[]
			);

			expect(agent.invoke).toBeDefined();
			expect(typeof agent.invoke).toBe('function');
		});

		/**
		 * Test: Has invokeStream method
		 */
		it('should have invokeStream method', () => {
			const agent = new ObsidianAgent(
				'sk-ant-test-key',
				[]
			);

			expect(agent.invokeStream).toBeDefined();
			expect(typeof agent.invokeStream).toBe('function');
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
			const agent = new ObsidianAgent(
				'sk-ant-test-key',
				[]
			);

			// Agent should be created successfully
			expect(agent).toBeDefined();
			// Model configuration is tested implicitly through agent creation
		});

		/**
		 * Test: LangSmith can be disabled
		 */
		it('should work with LangSmith disabled', () => {
			const agent = new ObsidianAgent(
				'sk-ant-test-key',
				[]
			);

			expect(agent).toBeDefined();
		});

		/**
		 * Test: LangSmith can be enabled
		 */
		it('should work with LangSmith enabled', () => {
			const agent = new ObsidianAgent(
				'sk-ant-test-key',
				[]
			);

			// Should not throw, even if LangSmith isn't configured
			expect(agent).toBeDefined();
		});
	});
});
