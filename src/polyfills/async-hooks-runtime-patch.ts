/**
 * Runtime patcher for AsyncLocalStorage.snapshot method
 *
 * Node.js's built-in AsyncLocalStorage (available in desktop Obsidian via Electron)
 * does NOT include a snapshot() method, but LangSmith's tracing code expects it.
 *
 * This module patches the snapshot() method onto any AsyncLocalStorage instance
 * that's missing it, allowing LangSmith tracing to work in desktop Obsidian.
 *
 * IMPORTANT: This must be imported and called BEFORE any LangSmith code runs.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

interface AsyncLocalStorageInstance {
	getStore(): any;
	run<R>(store: any, callback: () => R): R;
	enterWith(store: any): void;
	snapshot?: () => { store: any };
}

/**
 * Patches AsyncLocalStorage to add snapshot() method if missing.
 *
 * CRITICAL: LangSmith calls AsyncLocalStorage.snapshot() as a STATIC method,
 * not an instance method. This is different from the newer Node.js API where
 * snapshot() is an instance method.
 *
 * This patch adds snapshot() as both:
 * 1. A static method on the AsyncLocalStorage class (for LangSmith)
 * 2. An instance method on the prototype (for completeness)
 */
export function patchAsyncLocalStorageSnapshot(): void {
	try {
		// We need to patch the REAL Node.js AsyncLocalStorage, not our bundled stub
		// The bundled code might import from our stub, but at runtime in Electron,
		// require('node:async_hooks') returns Node's actual module

		// First, check if we're in a Node.js environment (desktop Obsidian)
		if (typeof process === 'undefined' || !process.versions || !process.versions.node) {
			console.log('[AsyncLocalStorage Patch] Not in Node.js environment, skipping');
			return;
		}

		// Try to get the REAL Node.js async_hooks module
		// This bypasses our esbuild alias because we're using require at runtime
		let realAsyncHooks: any;
		try {
			// Use eval to prevent esbuild from replacing this at build time
			// eslint-disable-next-line @typescript-eslint/no-implied-eval
			const requireFunc = new Function('moduleName', 'return require(moduleName)');
			realAsyncHooks = requireFunc('async_hooks');

			if (!realAsyncHooks || !realAsyncHooks.AsyncLocalStorage) {
				console.log('[AsyncLocalStorage Patch] async_hooks available but no AsyncLocalStorage');
				return;
			}
		} catch (e) {
			console.log('[AsyncLocalStorage Patch] Failed to load real async_hooks:', e);
			return;
		}

		const RealAsyncLocalStorage = realAsyncHooks.AsyncLocalStorage;

		// CRITICAL: Add snapshot as a STATIC method (what LangSmith actually calls)
		if (!RealAsyncLocalStorage.snapshot) {
			RealAsyncLocalStorage.snapshot = function snapshot() {
				// LangSmith expects snapshot() to return a function that preserves async context
				// The returned function should accept a callback and execute it in the captured context
				//
				// Since we don't have true async context snapshotting in older Node versions,
				// we return a pass-through function that just executes the callback directly.
				// This preserves the current execution context without complex state management.
				return function runInSnapshot<T>(callback: () => T): T {
					return callback();
				};
			};
			console.log('[AsyncLocalStorage Patch] Added static AsyncLocalStorage.snapshot() method');
		} else {
			console.log('[AsyncLocalStorage Patch] Static snapshot() already exists');
		}

		// Also add instance method for completeness (newer Node.js API style)
		if (!RealAsyncLocalStorage.prototype.snapshot) {
			RealAsyncLocalStorage.prototype.snapshot = function snapshot(this: AsyncLocalStorageInstance) {
				// Instance version returns a snapshot function
				return function runInSnapshot<T>(callback: () => T): T {
					return callback();
				};
			};
			console.log('[AsyncLocalStorage Patch] Added instance snapshot() method to prototype');
		}

		console.log('[AsyncLocalStorage Patch] Successfully patched AsyncLocalStorage.snapshot (static + instance)');
	} catch (error) {
		// Log error but don't crash - the polyfill will handle mobile platforms
		console.error('[AsyncLocalStorage Patch] Failed to patch AsyncLocalStorage:', error);
	}
}

/**
 * Patches a specific AsyncLocalStorage instance to add snapshot() if missing.
 * Useful for instances created before the prototype patch.
 */
export function patchAsyncLocalStorageInstance(instance: AsyncLocalStorageInstance): void {
	if (!instance || typeof instance !== 'object') {
		return;
	}

	// If snapshot already exists, nothing to do
	if (typeof instance.snapshot === 'function') {
		return;
	}

	// Add snapshot method to this specific instance
	instance.snapshot = function snapshot(this: AsyncLocalStorageInstance) {
		return {
			store: this.getStore()
		};
	};
}
