/**
 * Retry Handler with Exponential Backoff
 *
 * Provides automatic retry logic for operations that may fail transiently,
 * such as API calls, network requests, etc.
 */

import { AgentError, ErrorHandler } from './ErrorHandler';

export interface RetryOptions {
	maxAttempts?: number;
	baseDelay?: number;
	maxDelay?: number;
	onRetry?: (error: AgentError, attempt: number, nextDelay: number) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
	maxAttempts: 3,
	baseDelay: 1000,
	maxDelay: 30000,
	onRetry: () => {}
};

export class RetryHandler {
	/**
	 * Execute a function with automatic retry logic
	 */
	static async withRetry<T>(
		fn: () => Promise<T>,
		options: RetryOptions = {}
	): Promise<T> {
		const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
		let lastError: AgentError | null = null;

		for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
			try {
				return await fn();
			} catch (error) {
				// Convert to AgentError
				const agentError = ErrorHandler.handle(error);
				lastError = agentError;

				// Log the error
				ErrorHandler.log(agentError);

				// Check if we should retry
				if (!ErrorHandler.shouldRetry(agentError, attempt, opts.maxAttempts)) {
					throw agentError;
				}

				// Calculate backoff delay
				const delay = ErrorHandler.getBackoffDelay(attempt, opts.baseDelay, opts.maxDelay);

				// Call retry callback
				opts.onRetry(agentError, attempt + 1, delay);

				// Wait before retrying
				await this.sleep(delay);
			}
		}

		// If we've exhausted all retries, throw the last error
		throw lastError || new Error('All retry attempts failed');
	}

	/**
	 * Sleep for a specified duration
	 */
	private static sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}
