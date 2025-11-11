/**
 * Cache Entry - stores value with timestamp and TTL
 */
export interface CacheEntry<T> {
	value: T;
	timestamp: number;
	ttl: number;
}

/**
 * Cache - In-memory cache with TTL support
 *
 * Provides caching for frequently accessed data with automatic expiration
 */
export class Cache<T> {
	private cache: Map<string, CacheEntry<T>> = new Map();
	private readonly defaultTTL: number;

	/**
	 * Create a new cache
	 * @param defaultTTL - Default time-to-live in milliseconds (default: 60000ms = 1 minute)
	 */
	constructor(defaultTTL: number = 60000) {
		this.defaultTTL = defaultTTL;
	}

	/**
	 * Set a value in the cache
	 * @param key - Cache key
	 * @param value - Value to cache
	 * @param ttl - Optional TTL override for this entry
	 */
	set(key: string, value: T, ttl?: number): void {
		this.cache.set(key, {
			value,
			timestamp: Date.now(),
			ttl: ttl || this.defaultTTL,
		});
	}

	/**
	 * Get a value from the cache
	 * @param key - Cache key
	 * @returns Cached value or null if not found or expired
	 */
	get(key: string): T | null {
		const entry = this.cache.get(key);

		if (!entry) {
			return null;
		}

		const age = Date.now() - entry.timestamp;

		// Check if expired
		if (age > entry.ttl) {
			this.cache.delete(key);
			return null;
		}

		return entry.value;
	}

	/**
	 * Check if a key exists in the cache (and is not expired)
	 * @param key - Cache key
	 * @returns True if key exists and is not expired
	 */
	has(key: string): boolean {
		return this.get(key) !== null;
	}

	/**
	 * Delete a key from the cache
	 * @param key - Cache key
	 */
	delete(key: string): void {
		this.cache.delete(key);
	}

	/**
	 * Clear all entries from the cache
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Get the number of entries in the cache
	 */
	size(): number {
		return this.cache.size;
	}

	/**
	 * Prune expired entries from the cache
	 * @returns Number of entries pruned
	 */
	prune(): number {
		const now = Date.now();
		let pruned = 0;

		for (const [key, entry] of this.cache.entries()) {
			const age = now - entry.timestamp;
			if (age > entry.ttl) {
				this.cache.delete(key);
				pruned++;
			}
		}

		return pruned;
	}

	/**
	 * Get all keys in the cache (including expired ones)
	 */
	keys(): string[] {
		return Array.from(this.cache.keys());
	}

	/**
	 * Get cache statistics
	 */
	stats(): {
		totalEntries: number;
		expiredEntries: number;
		validEntries: number;
	} {
		const now = Date.now();
		let expired = 0;

		for (const entry of this.cache.values()) {
			const age = now - entry.timestamp;
			if (age > entry.ttl) {
				expired++;
			}
		}

		return {
			totalEntries: this.cache.size,
			expiredEntries: expired,
			validEntries: this.cache.size - expired,
		};
	}
}
