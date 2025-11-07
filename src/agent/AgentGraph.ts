import { StateGraph, START, END, CompiledStateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { Anthropic } from "@anthropic-ai/sdk";
import { AgentState, AgentStateType } from "./AgentState";
import {
	AIMessage,
	BaseMessage,
	HumanMessage,
} from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { CheckpointService } from "../checkpoint/CheckpointService";
import { wrapSDK } from "langsmith/wrappers";
import { traceable } from "langsmith/traceable";
import { ErrorHandler, AgentError, ErrorCode } from "../errors/ErrorHandler";
import { RetryHandler } from "../errors/RetryHandler";
import { RateLimiters } from "../errors/RateLimiter";

/**
 * Configuration constants for the agent
 */
const AGENT_CONFIG = {
	MODEL: "claude-sonnet-4-5-20250929",
	MAX_TOKENS: 4096,
	RETRY_ATTEMPTS: 3,
	RETRY_BASE_DELAY: 1000,
	RETRY_MAX_DELAY: 30000,
} as const;

/**
 * Agent System Prompt
 *
 * Defines the identity and capabilities of the Obsidian Agent
 */
const AGENT_SYSTEM_PROMPT = `You are Obsidian Agent, an AI assistant integrated into Obsidian.

CAPABILITIES:
- You have READ-ONLY access to the user's Obsidian vault
- You can search for files by name, content, and tags
- You can read the contents of any note in the vault
- You can list files and understand the vault structure
- You can see links between notes and backlinks

LIMITATIONS:
- You CANNOT create, modify, or delete files (read-only mode)
- You CANNOT execute any vault modifications
- If asked to create or modify notes, politely explain this will be available in V2.0

BEHAVIOR:
- When users ask about their notes, proactively use your vault search tools
- Quote relevant passages from notes when answering questions
- Reference specific files by name when providing information
- Be transparent about which files you've accessed
- Help users discover connections in their knowledge base

CONTEXT:
- You maintain conversation history across sessions
- You can reference earlier parts of the conversation
- Track which files have been accessed in this conversation
`;

/**
 * Anthropic message format
 */
interface AnthropicMessage {
	role: "user" | "assistant";
	content: string;
}

/**
 * Anthropic tool format - matches Anthropic API Tool type
 */
interface AnthropicTool {
	name: string;
	description: string;
	input_schema: {
		type: string;
		[key: string]: any;
	};
}

/**
 * ObsidianAgent
 *
 * LangGraph-powered agent with the Anthropic SDK for conversational AI in Obsidian.
 * Handles tool execution, state management, error handling, and optional LangSmith tracing.
 */
export class ObsidianAgent {
	private agent: CompiledStateGraph<AgentStateType, Partial<AgentStateType>, "__start__" | "agent" | "tools">;
	private anthropic: Anthropic;
	private apiKey: string;
	private tools: DynamicStructuredTool[];
	private checkpointer: CheckpointService;
	private langsmithEnabled: boolean;

	constructor(
		apiKey: string,
		tools: DynamicStructuredTool[] = [],
		checkpointer: CheckpointService,
		langsmithEnabled: boolean = false
	) {
		this.apiKey = apiKey;
		this.tools = tools;
		this.checkpointer = checkpointer;
		this.langsmithEnabled = langsmithEnabled;

		// Validate API key
		if (!apiKey || !apiKey.startsWith('sk-ant-')) {
			throw new AgentError(
				'Invalid API key format. API key must start with "sk-ant-"',
				ErrorCode.API_KEY_INVALID,
				undefined,
				false
			);
		}

		const baseAnthropic = new Anthropic({
			apiKey,
			dangerouslyAllowBrowser: true // Required for Obsidian (Electron environment)
		});

		// Wrap Anthropic SDK with Langsmith tracing if enabled
		// If LangSmith fails, gracefully degrade to non-traced SDK
		if (this.langsmithEnabled) {
			try {
				this.anthropic = wrapSDK(baseAnthropic);
				console.log('[Obsidian Agent] LangSmith tracing enabled');
			} catch (error) {
				console.warn('[Obsidian Agent] LangSmith initialization failed, continuing without tracing:', error);
				this.anthropic = baseAnthropic;
				this.langsmithEnabled = false; // Disable for this session
			}
		} else {
			this.anthropic = baseAnthropic;
		}

		this.agent = this.buildAgent();
	}

	/**
	 * Convert LangChain BaseMessage to Anthropic message format
	 */
	private convertToAnthropicMessages(messages: BaseMessage[]): AnthropicMessage[] {
		return messages.map((msg) => {
			if (msg instanceof HumanMessage) {
				return { role: "user" as const, content: msg.content as string };
			} else if (msg instanceof AIMessage) {
				return { role: "assistant" as const, content: msg.content as string };
			}
			// Fallback for other message types
			return { role: "user" as const, content: String(msg.content) };
		});
	}

	/**
	 * Convert LangChain tools to Anthropic tool format
	 */
	private convertToAnthropicTools(tools: DynamicStructuredTool[]): AnthropicTool[] {
		return tools.map((tool) => {
			const jsonSchema = tool.schema as any;

			// Ensure the schema has the required 'type' field
			if (!jsonSchema.type) {
				jsonSchema.type = 'object';
			}

			return {
				name: tool.name,
				description: tool.description,
				input_schema: jsonSchema,
			};
		});
	}

	/**
	 * Parse Anthropic API response into LangChain AIMessage
	 */
	private parseAnthropicResponse(response: Anthropic.Message): AIMessage {
		let content = "";
		const toolCalls: any[] = [];

		for (const block of response.content) {
			if (block.type === "text") {
				content += block.text;
			} else if (block.type === "tool_use") {
				toolCalls.push({
					name: block.name,
					args: block.input,
					id: block.id,
				});
			}
		}

		return new AIMessage({
			content: content || "Thinking...",
			tool_calls: toolCalls,
		});
	}

	private buildAgent() {
		// Create tool node
		const toolNode = new ToolNode<AgentStateType>(this.tools);

		// Define agent logic - calls Anthropic API
		const callAgentBase = async (state: AgentStateType) => {
			try {
				// Apply rate limiting
				await RateLimiters.ANTHROPIC_API.removeTokens(1);

				// Convert messages and tools to Anthropic format
				const anthropicMessages = this.convertToAnthropicMessages(state.messages);
				const anthropicTools = this.convertToAnthropicTools(this.tools);

				// Call Anthropic API with retry logic
				const response = await RetryHandler.withRetry(
					async () => {
						return await this.anthropic.messages.create({
							model: AGENT_CONFIG.MODEL,
							max_tokens: AGENT_CONFIG.MAX_TOKENS,
							system: AGENT_SYSTEM_PROMPT,
							messages: anthropicMessages,
							tools: anthropicTools as any, // Cast needed due to Anthropic SDK type complexity
						});
					},
					{
						maxAttempts: AGENT_CONFIG.RETRY_ATTEMPTS,
						baseDelay: AGENT_CONFIG.RETRY_BASE_DELAY,
						maxDelay: AGENT_CONFIG.RETRY_MAX_DELAY,
						onRetry: (error, attempt, nextDelay) => {
							console.log(`[Obsidian Agent] API call failed (attempt ${attempt}), retrying in ${nextDelay}ms:`, error.code);
						}
					}
				);

				// Parse response into AIMessage
				const aiMessage = this.parseAnthropicResponse(response);

				return { messages: [aiMessage] };
			} catch (error) {
				// Handle and wrap error
				const agentError = ErrorHandler.handle(error);
				ErrorHandler.log(agentError);

				// Return error message to user
				const errorMessage = new AIMessage({
					content: `I encountered an error: ${agentError.getUserMessage()}`,
					tool_calls: [],
				});

				return { messages: [errorMessage] };
			}
		};

		// Wrap with traceable if Langsmith is enabled
		// If tracing fails, gracefully degrade to non-traced execution
		let callAgent = callAgentBase;
		if (this.langsmithEnabled) {
			try {
				callAgent = traceable(callAgentBase, {
					name: "obsidian_agent_call",
					run_type: "llm",
					tags: ["obsidian", "agent", "claude"]
				});
			} catch (error) {
				console.warn('[Obsidian Agent] LangSmith traceable wrapper failed, continuing without tracing:', error);
				callAgent = callAgentBase;
			}
		}

		// Routing logic - determine if we should continue with tools or end
		const shouldContinue = (state: AgentStateType): "tools" | typeof END => {
			const lastMessage = state.messages[state.messages.length - 1];
			if (lastMessage && lastMessage instanceof AIMessage) {
				const aiMsg = lastMessage as AIMessage;
				if (aiMsg.tool_calls && aiMsg.tool_calls.length > 0) {
					return "tools";
				}
			}
			return END;
		};

		// Build the graph
		const workflow = new StateGraph(AgentState)
			.addNode("agent", callAgent)
			.addNode("tools", toolNode)
			.addEdge(START, "agent")
			.addConditionalEdges("agent", shouldContinue)
			.addEdge("tools", "agent");

		// Compile with persistent checkpointer
		return workflow.compile({ checkpointer: this.checkpointer });
	}

	/**
	 * Invoke the agent with a message
	 */
	async invoke(input: { messages: BaseMessage[] }, config?: any): Promise<AgentStateType> {
		const result = await this.agent.invoke(input, config);
		return result as AgentStateType;
	}

	/**
	 * Stream the agent's response
	 */
	async stream(input: { messages: BaseMessage[] }, config?: any) {
		return await this.agent.stream(input, {
			...config,
			streamMode: "values",
		});
	}
}
