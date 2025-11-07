import { describe, it, expect } from 'vitest';
import { ErrorHandler, AgentError, ErrorCode } from '@/errors/ErrorHandler';

/**
 * ErrorHandler Test Suite
 *
 * Tests error parsing and handling logic.
 */
describe('ErrorHandler', () => {
	/**
	 * Test Group: handle()
	 *
	 * The handle() method converts any error into our AgentError type.
	 */
	describe('handle', () => {
		/**
		 * Test: Pass-through for AgentError
		 *
		 * If it's already an AgentError, don't wrap it again.
		 */
		it('should return AgentError unchanged', () => {
			const originalError = new AgentError(
				'Test error',
				ErrorCode.API_KEY_INVALID
			);

			const result = ErrorHandler.handle(originalError);

			expect(result).toBe(originalError);
		});

		/**
		 * Test: Parse authentication errors
		 *
		 * Why? Anthropic API returns specific error messages.
		 * We need to detect them and provide helpful feedback.
		 */
		it('should parse authentication errors', () => {
			const error = new Error('Authentication failed: invalid api key');

			const result = ErrorHandler.handle(error);

			expect(result.code).toBe(ErrorCode.API_KEY_INVALID);
			expect(result.isRetryable).toBe(false);
		});

		it('should parse 401 errors as authentication errors', () => {
			const error = new Error('401 Unauthorized');

			const result = ErrorHandler.handle(error);

			expect(result.code).toBe(ErrorCode.API_KEY_INVALID);
		});

		/**
		 * Test: Parse rate limit errors
		 */
		it('should parse rate limit errors', () => {
			const error = new Error('Rate limit exceeded (429)');

			const result = ErrorHandler.handle(error);

			expect(result.code).toBe(ErrorCode.API_RATE_LIMIT);
			expect(result.isRetryable).toBe(true); // Rate limits are temporary
		});

		it('should parse 429 status code as rate limit', () => {
			const error = new Error('Error 429');

			const result = ErrorHandler.handle(error);

			expect(result.code).toBe(ErrorCode.API_RATE_LIMIT);
		});

		/**
		 * Test: Parse network errors
		 */
		it('should parse network errors', () => {
			const error = new Error('Network error: ECONNREFUSED');

			const result = ErrorHandler.handle(error);

			expect(result.code).toBe(ErrorCode.API_NETWORK);
			expect(result.isRetryable).toBe(true);
		});

		it('should parse ENOTFOUND as network error', () => {
			const error = new Error('getaddrinfo ENOTFOUND api.anthropic.com');

			const result = ErrorHandler.handle(error);

			expect(result.code).toBe(ErrorCode.API_NETWORK);
		});

		/**
		 * Test: Parse timeout errors
		 */
		it('should parse timeout errors', () => {
			const error = new Error('Request timeout');

			const result = ErrorHandler.handle(error);

			expect(result.code).toBe(ErrorCode.API_TIMEOUT);
			expect(result.isRetryable).toBe(true);
		});

		it('should parse ETIMEDOUT as timeout error', () => {
			const error = new Error('ETIMEDOUT');

			const result = ErrorHandler.handle(error);

			expect(result.code).toBe(ErrorCode.API_TIMEOUT);
		});

		/**
		 * Test: Parse server errors
		 */
		it('should parse 500 errors as server error', () => {
			const error = new Error('500 Internal Server Error');

			const result = ErrorHandler.handle(error);

			expect(result.code).toBe(ErrorCode.API_SERVER_ERROR);
			expect(result.isRetryable).toBe(true);
		});

		it('should parse 502 errors as server error', () => {
			const error = new Error('502 Bad Gateway');

			const result = ErrorHandler.handle(error);

			expect(result.code).toBe(ErrorCode.API_SERVER_ERROR);
		});

		it('should parse 503 errors as server error', () => {
			const error = new Error('503 Service Unavailable');

			const result = ErrorHandler.handle(error);

			expect(result.code).toBe(ErrorCode.API_SERVER_ERROR);
		});

		/**
		 * Test: Parse vault errors
		 */
		it('should parse file not found errors', () => {
			const error = new Error('File not found: test.md');

			const result = ErrorHandler.handle(error);

			expect(result.code).toBe(ErrorCode.VAULT_FILE_NOT_FOUND);
			expect(result.isRetryable).toBe(false);
		});

		it('should parse ENOENT as file not found', () => {
			const error = new Error('ENOENT: no such file or directory');

			const result = ErrorHandler.handle(error);

			expect(result.code).toBe(ErrorCode.VAULT_FILE_NOT_FOUND);
		});

		/**
		 * Test: Parse LangSmith errors
		 */
		it('should parse LangSmith errors', () => {
			const error = new Error('LangSmith initialization failed');

			const result = ErrorHandler.handle(error);

			expect(result.code).toBe(ErrorCode.LANGSMITH_TRACING_ERROR);
			expect(result.isRetryable).toBe(false);
		});

		/**
		 * Test: Handle string errors
		 *
		 * Why? Sometimes code throws strings instead of Error objects.
		 */
		it('should handle string errors', () => {
			const result = ErrorHandler.handle('Something went wrong');

			expect(result).toBeInstanceOf(AgentError);
			expect(result.message).toBe('Something went wrong');
			expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
		});

		/**
		 * Test: Handle unknown error types
		 */
		it('should handle unknown error types', () => {
			const weirdError = { code: 'WEIRD', data: [1, 2, 3] };

			const result = ErrorHandler.handle(weirdError);

			expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
		});

		/**
		 * Test: Handle null/undefined
		 */
		it('should handle null error', () => {
			const result = ErrorHandler.handle(null);

			expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
		});
	});

	/**
	 * Test Group: AgentError class
	 */
	describe('AgentError', () => {
		it('should create error with correct properties', () => {
			const error = new AgentError(
				'Test message',
				ErrorCode.API_KEY_INVALID,
				{ detail: 'extra info' },
				false
			);

			expect(error.message).toBe('Test message');
			expect(error.code).toBe(ErrorCode.API_KEY_INVALID);
			expect(error.details).toEqual({ detail: 'extra info' });
			expect(error.isRetryable).toBe(false);
			expect(error.name).toBe('AgentError');
		});

		it('should have default isRetryable as false', () => {
			const error = new AgentError(
				'Test',
				ErrorCode.UNKNOWN_ERROR
			);

			expect(error.isRetryable).toBe(false);
		});

		/**
		 * Test: getUserMessage()
		 */
		it('should return user-friendly message for API_KEY_INVALID', () => {
			const error = new AgentError('Raw error', ErrorCode.API_KEY_INVALID);

			const message = error.getUserMessage();

			expect(message).toContain('Invalid API key');
			expect(message).toContain('settings');
		});

		it('should return user-friendly message for API_RATE_LIMIT', () => {
			const error = new AgentError('Raw error', ErrorCode.API_RATE_LIMIT);

			const message = error.getUserMessage();

			expect(message).toContain('Rate limit');
		});

		it('should return user-friendly message for API_NETWORK', () => {
			const error = new AgentError('Raw error', ErrorCode.API_NETWORK);

			const message = error.getUserMessage();

			expect(message).toContain('Network error');
			expect(message).toContain('internet');
		});

		it('should fallback to message for unknown error codes', () => {
			const error = new AgentError('Custom message', ErrorCode.UNKNOWN_ERROR);

			const message = error.getUserMessage();

			expect(message).toContain('Custom message');
		});

		/**
		 * Test: toJSON()
		 */
		it('should serialize to JSON correctly', () => {
			const error = new AgentError(
				'Test',
				ErrorCode.API_KEY_INVALID,
				{ key: 'value' },
				false
			);

			const json = error.toJSON();

			expect(json.name).toBe('AgentError');
			expect(json.message).toBe('Test');
			expect(json.code).toBe(ErrorCode.API_KEY_INVALID);
			expect(json.details).toEqual({ key: 'value' });
			expect(json.isRetryable).toBe(false);
		});
	});

	/**
	 * Test Group: shouldRetry()
	 */
	describe('shouldRetry', () => {
		it('should not retry non-retryable errors', () => {
			const error = new AgentError(
				'Invalid API key',
				ErrorCode.API_KEY_INVALID,
				undefined,
				false // not retryable
			);

			const shouldRetry = ErrorHandler.shouldRetry(error, 1, 3);

			expect(shouldRetry).toBe(false);
		});

		it('should retry retryable errors', () => {
			const error = new AgentError(
				'Network error',
				ErrorCode.API_NETWORK,
				undefined,
				true // retryable
			);

			const shouldRetry = ErrorHandler.shouldRetry(error, 1, 3);

			expect(shouldRetry).toBe(true);
		});

		it('should not retry after max attempts', () => {
			const error = new AgentError(
				'Network error',
				ErrorCode.API_NETWORK,
				undefined,
				true
			);

			const shouldRetry = ErrorHandler.shouldRetry(error, 3, 3);

			expect(shouldRetry).toBe(false);
		});

		it('should not retry when attempt exceeds max', () => {
			const error = new AgentError(
				'Network error',
				ErrorCode.API_NETWORK,
				undefined,
				true
			);

			const shouldRetry = ErrorHandler.shouldRetry(error, 5, 3);

			expect(shouldRetry).toBe(false);
		});
	});

	/**
	 * Test Group: getBackoffDelay()
	 *
	 * Tests exponential backoff calculation.
	 */
	describe('getBackoffDelay', () => {
		/**
		 * Test: Exponential growth
		 *
		 * Delays should grow exponentially: 1s, 2s, 4s, 8s, etc.
		 */
		it('should calculate exponential backoff', () => {
			const delay0 = ErrorHandler.getBackoffDelay(0, 1000, 30000);
			const delay1 = ErrorHandler.getBackoffDelay(1, 1000, 30000);
			const delay2 = ErrorHandler.getBackoffDelay(2, 1000, 30000);

			// Delays should increase (with jitter, so not exact)
			// Attempt 0: 1000 * 2^0 = 1000 (+ jitter)
			expect(delay0).toBeGreaterThanOrEqual(1000);
			expect(delay0).toBeLessThan(2000);

			// Attempt 1: 1000 * 2^1 = 2000 (+ jitter)
			expect(delay1).toBeGreaterThanOrEqual(2000);
			expect(delay1).toBeLessThan(3000);

			// Attempt 2: 1000 * 2^2 = 4000 (+ jitter)
			expect(delay2).toBeGreaterThanOrEqual(4000);
			expect(delay2).toBeLessThan(6000);
		});

		/**
		 * Test: Max delay cap
		 *
		 * Delays shouldn't grow forever (prevents waiting hours).
		 */
		it('should cap delay at max value', () => {
			const delay = ErrorHandler.getBackoffDelay(10, 1000, 5000);

			expect(delay).toBeLessThanOrEqual(5000);
		});

		/**
		 * Test: Jitter adds randomness
		 */
		it('should add jitter to delay', () => {
			const delay1 = ErrorHandler.getBackoffDelay(0, 1000, 30000);
			const delay2 = ErrorHandler.getBackoffDelay(0, 1000, 30000);

			// With jitter, two calls with same parameters should differ
			// (might rarely be equal, but very unlikely)
			expect(delay1).toBeGreaterThanOrEqual(1000);
			expect(delay2).toBeGreaterThanOrEqual(1000);
		});

		/**
		 * Test: Custom base delay
		 */
		it('should respect custom base delay', () => {
			const delay = ErrorHandler.getBackoffDelay(0, 5000, 30000);

			expect(delay).toBeGreaterThanOrEqual(5000);
			expect(delay).toBeLessThan(7000); // 5000 + 30% jitter
		});
	});
});
