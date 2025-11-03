/**
 * Rate Limiter
 *
 * Implements token bucket algorithm to prevent excessive API calls
 * and respect rate limits.
 */

export interface RateLimiterOptions {
	tokensPerInterval: number;
	interval: number; // in milliseconds
	maxTokens?: number;
}

export class RateLimiter {
	private tokens: number;
	private readonly maxTokens: number;
	private readonly tokensPerInterval: number;
	private readonly interval: number;
	private lastRefill: number;

	constructor(options: RateLimiterOptions) {
		this.tokensPerInterval = options.tokensPerInterval;
		this.interval = options.interval;
		this.maxTokens = options.maxTokens || options.tokensPerInterval;
		this.tokens = this.maxTokens;
		this.lastRefill = Date.now();
	}

	/**
	 * Try to remove a token from the bucket
	 * Returns true if successful, false if rate limited
	 */
	tryRemoveTokens(count: number = 1): boolean {
		this.refill();

		if (this.tokens >= count) {
			this.tokens -= count;
			return true;
		}

		return false;
	}

	/**
	 * Wait until tokens are available, then remove them
	 */
	async removeTokens(count: number = 1): Promise<void> {
		while (!this.tryRemoveTokens(count)) {
			const waitTime = this.getTimeUntilNextToken();
			await this.sleep(waitTime);
		}
	}

	/**
	 * Refill tokens based on elapsed time
	 */
	private refill(): void {
		const now = Date.now();
		const elapsed = now - this.lastRefill;
		const tokensToAdd = (elapsed / this.interval) * this.tokensPerInterval;

		if (tokensToAdd > 0) {
			this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
			this.lastRefill = now;
		}
	}

	/**
	 * Get time in milliseconds until next token is available
	 */
	private getTimeUntilNextToken(): number {
		const now = Date.now();
		const elapsed = now - this.lastRefill;
		const timeUntilRefill = this.interval - elapsed;
		return Math.max(0, timeUntilRefill);
	}

	/**
	 * Get current number of available tokens
	 */
	getAvailableTokens(): number {
		this.refill();
		return Math.floor(this.tokens);
	}

	/**
	 * Sleep for a specified duration
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Reset the rate limiter to full capacity
	 */
	reset(): void {
		this.tokens = this.maxTokens;
		this.lastRefill = Date.now();
	}
}

/**
 * Pre-configured rate limiters for common use cases
 */
export class RateLimiters {
	// Anthropic API: ~50 requests per minute per tier
	// Conservative: 40 requests per minute
	static readonly ANTHROPIC_API = new RateLimiter({
		tokensPerInterval: 40,
		interval: 60000, // 1 minute
		maxTokens: 40
	});

	// LangSmith API: More generous limits
	// Conservative: 100 requests per minute
	static readonly LANGSMITH_API = new RateLimiter({
		tokensPerInterval: 100,
		interval: 60000, // 1 minute
		maxTokens: 100
	});
}
