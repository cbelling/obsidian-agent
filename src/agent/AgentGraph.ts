import { StateGraph, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { Anthropic } from "@anthropic-ai/sdk";
import { zodToJsonSchema } from "zod-to-json-schema";
import { AgentState, AgentStateType } from "./AgentState";
import {
	AIMessage,
	BaseMessage,
	HumanMessage,
	SystemMessage,
} from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { CheckpointService } from "../checkpoint/CheckpointService";
import { wrapSDK } from "langsmith/wrappers";
import { traceable } from "langsmith/traceable";

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
 * Create Agent Graph
 *
 * Builds the LangGraph agent with the defined state schema, tools, and logic
 */
export class ObsidianAgent {
	private agent: any;
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

		const baseAnthropic = new Anthropic({
			apiKey,
			dangerouslyAllowBrowser: true // Required for Obsidian (Electron environment)
		});

		// Wrap Anthropic SDK with Langsmith tracing if enabled
		this.anthropic = this.langsmithEnabled
			? wrapSDK(baseAnthropic)
			: baseAnthropic;

		this.agent = this.buildAgent();
	}

	private buildAgent() {
		// Create tool node
		const toolNode = new ToolNode<AgentStateType>(this.tools);

		// Define agent logic - calls Anthropic API
		const callAgentBase = async (state: AgentStateType) => {
			// Prepare messages - convert BaseMessage to Anthropic format
			const anthropicMessages: Array<{ role: "user" | "assistant"; content: string }> = state.messages.map((msg) => {
				if (msg instanceof HumanMessage) {
					return { role: "user" as const, content: msg.content as string };
				} else if (msg instanceof AIMessage) {
					return {
						role: "assistant" as const,
						content: msg.content as string,
					};
				}
				return { role: "user" as const, content: String(msg.content) };
			});

			// Call Anthropic API
			// Convert tools to Anthropic format with proper JSON Schema
			const anthropicTools = this.tools.map((t) => {
				// t.schema is already a JSON Schema from LangChain tools
				const jsonSchema = t.schema as any;

				// Ensure the schema has the required 'type' field
				if (!jsonSchema.type) {
					jsonSchema.type = 'object';
				}

				return {
					name: t.name,
					description: t.description,
					input_schema: jsonSchema,
				};
			});

			const response = await this.anthropic.messages.create({
				model: "claude-sonnet-4-5-20250929",
				max_tokens: 4096,
				system: AGENT_SYSTEM_PROMPT, // System prompt goes here, not in messages
				messages: anthropicMessages,
				tools: anthropicTools,
			});

			// Convert response to AIMessage
			let content = "";
			let toolCalls: any[] = [];

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

			const aiMessage = new AIMessage({
				content: content || "Thinking...",
				tool_calls: toolCalls,
			});

			return { messages: [aiMessage] };
		};

		// Wrap with traceable if Langsmith is enabled
		const callAgent = this.langsmithEnabled
			? traceable(callAgentBase, {
				name: "obsidian_agent_call",
				run_type: "llm",
				tags: ["obsidian", "agent", "claude"]
			})
			: callAgentBase;

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
	async invoke(input: { messages: BaseMessage[] }, config?: any) {
		return await this.agent.invoke(input, config);
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
