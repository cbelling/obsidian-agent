/**
 * Polyfill for node:async_hooks on mobile platforms
 *
 * LangChain/LangGraph require AsyncLocalStorage for context management,
 * but this is not available on iOS/Android. This polyfill provides a
 * mock implementation that allows LangGraph to run on mobile.
 */

import { Platform } from 'obsidian';
import {
	AsyncLocalStorageProviderSingleton,
	MockAsyncLocalStorage
} from '@langchain/core/singletons';

/**
 * Initialize AsyncLocalStorage polyfill for mobile platforms
 * Must be called before any LangChain/LangGraph code runs
 */
export function initializeAsyncLocalStoragePolyfill(): void {
	// Always use MockAsyncLocalStorage in Obsidian
	// Obsidian doesn't have full Node.js async_hooks support, even on desktop
	console.log('[Polyfill] Initializing MockAsyncLocalStorage for Obsidian');

	// Use LangChain's built-in mock implementation
	AsyncLocalStorageProviderSingleton.initializeGlobalInstance(
		new MockAsyncLocalStorage()
	);

	console.log('[Polyfill] MockAsyncLocalStorage initialized successfully');
}
