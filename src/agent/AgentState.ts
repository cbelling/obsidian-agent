import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

/**
 * Agent State Schema
 *
 * Defines the structure of the state that the agent maintains across
 * its execution. This includes the conversation history and any additional
 * context like vault files accessed.
 */
export const AgentState = Annotation.Root({
	/**
	 * Messages array - accumulates all conversation messages
	 * Uses a reducer to concatenate new messages with existing ones
	 */
	messages: Annotation<BaseMessage[]>({
		reducer: (x, y) => x.concat(y),
		default: () => [],
	}),

	/**
	 * Vault context - tracks which files have been accessed
	 * Uses a Set to ensure unique file paths
	 */
	vaultContext: Annotation<string[]>({
		reducer: (x, y) => [...new Set([...x, ...y])],
		default: () => [],
	}),
});

// Export the type for use in other modules
export type AgentStateType = typeof AgentState.State;
