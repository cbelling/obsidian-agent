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
	if (Platform.isMobile) {
		console.log('[Polyfill] Initializing MockAsyncLocalStorage for mobile platform');

		// Use LangChain's built-in mock implementation
		AsyncLocalStorageProviderSingleton.initializeGlobalInstance(
			new MockAsyncLocalStorage()
		);

		console.log('[Polyfill] MockAsyncLocalStorage initialized successfully');
	} else {
		// On desktop, use the real AsyncLocalStorage from node:async_hooks
		// This is automatically initialized by LangChain when it imports
		console.log('[Polyfill] Using native AsyncLocalStorage on desktop platform');
	}
}
