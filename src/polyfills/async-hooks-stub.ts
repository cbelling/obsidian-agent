/**
 * Stub for node:async_hooks module
 *
 * This stub is used by esbuild to replace imports of 'node:async_hooks'
 * The actual AsyncLocalStorage functionality is provided by LangChain's
 * MockAsyncLocalStorage, which is initialized in our polyfill.
 *
 * This stub just needs to export an AsyncLocalStorage class that won't
 * cause the module to fail loading. The actual implementation is handled
 * by LangChain's singleton pattern.
 */

// Dummy AsyncLocalStorage that will never actually be used
// The real implementation comes from LangChain's MockAsyncLocalStorage
export class AsyncLocalStorage<T = any> {
	private store: T | undefined;

	getStore(): T | undefined {
		return this.store;
	}

	run<R>(store: T, callback: () => R): R {
		this.store = store;
		try {
			return callback();
		} finally {
			this.store = undefined;
		}
	}

	enterWith(store: T): void {
		this.store = store;
	}
}

// Export default for compatibility
export default {
	AsyncLocalStorage
};
