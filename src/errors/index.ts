/**
 * Error Handling Module
 *
 * Provides comprehensive error handling, retry logic, and rate limiting
 * for the Obsidian Agent plugin.
 */

export { AgentError, ErrorCode, ErrorHandler } from './ErrorHandler';
export { RetryHandler } from './RetryHandler';
export type { RetryOptions } from './RetryHandler';
export { RateLimiter, RateLimiters } from './RateLimiter';
export type { RateLimiterOptions } from './RateLimiter';
