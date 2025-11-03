/**
 * Error handling system for the Obsidian Agent
 *
 * Provides structured error types, error codes, and error handling utilities
 * to improve reliability and user experience.
 */

export enum ErrorCode {
	// API Errors
	API_KEY_INVALID = 'API_KEY_INVALID',
	API_RATE_LIMIT = 'API_RATE_LIMIT',
	API_NETWORK = 'API_NETWORK',
	API_TIMEOUT = 'API_TIMEOUT',
	API_SERVER_ERROR = 'API_SERVER_ERROR',

	// Vault Errors
	VAULT_FILE_NOT_FOUND = 'VAULT_FILE_NOT_FOUND',
	VAULT_READ_ERROR = 'VAULT_READ_ERROR',
	VAULT_SEARCH_ERROR = 'VAULT_SEARCH_ERROR',

	// Agent Errors
	AGENT_INITIALIZATION_ERROR = 'AGENT_INITIALIZATION_ERROR',
	AGENT_EXECUTION_ERROR = 'AGENT_EXECUTION_ERROR',
	TOOL_EXECUTION_ERROR = 'TOOL_EXECUTION_ERROR',

	// Checkpoint Errors
	CHECKPOINT_SAVE_ERROR = 'CHECKPOINT_SAVE_ERROR',
	CHECKPOINT_LOAD_ERROR = 'CHECKPOINT_LOAD_ERROR',

	// LangSmith Errors
	LANGSMITH_INITIALIZATION_ERROR = 'LANGSMITH_INITIALIZATION_ERROR',
	LANGSMITH_TRACING_ERROR = 'LANGSMITH_TRACING_ERROR',

	// Unknown
	UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class AgentError extends Error {
	constructor(
		message: string,
		public readonly code: ErrorCode,
		public readonly details?: Record<string, unknown>,
		public readonly isRetryable: boolean = false,
		public readonly originalError?: Error
	) {
		super(message);
		this.name = 'AgentError';

		// Maintain proper stack trace
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, AgentError);
		}
	}

	/**
	 * Get a user-friendly error message
	 */
	getUserMessage(): string {
		switch (this.code) {
			case ErrorCode.API_KEY_INVALID:
				return 'Invalid API key. Please check your settings and ensure your Anthropic API key is correct.';
			case ErrorCode.API_RATE_LIMIT:
				return 'Rate limit exceeded. Please wait a moment and try again.';
			case ErrorCode.API_NETWORK:
				return 'Network error. Please check your internet connection and try again.';
			case ErrorCode.API_TIMEOUT:
				return 'Request timed out. Please try again.';
			case ErrorCode.API_SERVER_ERROR:
				return 'Anthropic API server error. Please try again later.';
			case ErrorCode.VAULT_FILE_NOT_FOUND:
				return 'File not found in vault.';
			case ErrorCode.VAULT_READ_ERROR:
				return 'Error reading vault file.';
			case ErrorCode.VAULT_SEARCH_ERROR:
				return 'Error searching vault.';
			case ErrorCode.AGENT_INITIALIZATION_ERROR:
				return 'Failed to initialize agent. Please check your settings.';
			case ErrorCode.AGENT_EXECUTION_ERROR:
				return 'Error executing agent. Please try again.';
			case ErrorCode.TOOL_EXECUTION_ERROR:
				return 'Error executing tool.';
			case ErrorCode.CHECKPOINT_SAVE_ERROR:
				return 'Error saving conversation state.';
			case ErrorCode.CHECKPOINT_LOAD_ERROR:
				return 'Error loading conversation state.';
			case ErrorCode.LANGSMITH_INITIALIZATION_ERROR:
				return 'LangSmith initialization failed. Continuing without tracing.';
			case ErrorCode.LANGSMITH_TRACING_ERROR:
				return 'LangSmith tracing error. Continuing without tracing.';
			default:
				return this.message || 'An unknown error occurred.';
		}
	}

	/**
	 * Convert to JSON for logging
	 */
	toJSON(): Record<string, unknown> {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			details: this.details,
			isRetryable: this.isRetryable,
			stack: this.stack,
			originalError: this.originalError?.message
		};
	}
}

export class ErrorHandler {
	/**
	 * Parse and handle errors from various sources
	 */
	static handle(error: unknown): AgentError {
		// Already an AgentError
		if (error instanceof AgentError) {
			return error;
		}

		// Standard Error
		if (error instanceof Error) {
			return this.parseError(error);
		}

		// String error
		if (typeof error === 'string') {
			return new AgentError(
				error,
				ErrorCode.UNKNOWN_ERROR,
				undefined,
				false
			);
		}

		// Unknown error type
		return new AgentError(
			'An unknown error occurred',
			ErrorCode.UNKNOWN_ERROR,
			{ originalError: error },
			false
		);
	}

	/**
	 * Parse standard Error into AgentError
	 */
	private static parseError(error: Error): AgentError {
		const message = error.message.toLowerCase();

		// Anthropic API errors
		if (message.includes('authentication') || message.includes('invalid api key') || message.includes('401')) {
			return new AgentError(
				'Invalid API key',
				ErrorCode.API_KEY_INVALID,
				{ originalMessage: error.message },
				false,
				error
			);
		}

		if (message.includes('rate limit') || message.includes('429')) {
			return new AgentError(
				'Rate limit exceeded',
				ErrorCode.API_RATE_LIMIT,
				{ originalMessage: error.message },
				true, // Retryable with backoff
				error
			);
		}

		if (message.includes('network') || message.includes('econnrefused') || message.includes('enotfound')) {
			return new AgentError(
				'Network error',
				ErrorCode.API_NETWORK,
				{ originalMessage: error.message },
				true,
				error
			);
		}

		if (message.includes('timeout') || message.includes('etimedout')) {
			return new AgentError(
				'Request timeout',
				ErrorCode.API_TIMEOUT,
				{ originalMessage: error.message },
				true,
				error
			);
		}

		if (message.includes('500') || message.includes('502') || message.includes('503')) {
			return new AgentError(
				'Server error',
				ErrorCode.API_SERVER_ERROR,
				{ originalMessage: error.message },
				true,
				error
			);
		}

		// Vault errors
		if (message.includes('file not found') || message.includes('enoent')) {
			return new AgentError(
				'File not found',
				ErrorCode.VAULT_FILE_NOT_FOUND,
				{ originalMessage: error.message },
				false,
				error
			);
		}

		// LangSmith errors
		if (message.includes('langsmith') || message.includes('langchain')) {
			return new AgentError(
				'LangSmith error',
				ErrorCode.LANGSMITH_TRACING_ERROR,
				{ originalMessage: error.message },
				false,
				error
			);
		}

		// Default: unknown error
		return new AgentError(
			error.message || 'Unknown error',
			ErrorCode.UNKNOWN_ERROR,
			{ originalMessage: error.message },
			false,
			error
		);
	}

	/**
	 * Log error with appropriate level
	 */
	static log(error: AgentError): void {
		const logData = {
			code: error.code,
			message: error.message,
			retryable: error.isRetryable,
			details: error.details
		};

		if (error.isRetryable) {
			console.warn('[Obsidian Agent] Retryable error:', logData);
		} else {
			console.error('[Obsidian Agent] Error:', logData, error);
		}
	}

	/**
	 * Determine if an error should trigger a retry
	 */
	static shouldRetry(error: AgentError, attempt: number, maxAttempts: number): boolean {
		if (attempt >= maxAttempts) {
			return false;
		}

		return error.isRetryable;
	}

	/**
	 * Calculate exponential backoff delay
	 */
	static getBackoffDelay(attempt: number, baseDelay: number = 1000, maxDelay: number = 30000): number {
		const exponentialDelay = baseDelay * Math.pow(2, attempt);
		const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
		return Math.min(exponentialDelay + jitter, maxDelay);
	}
}
