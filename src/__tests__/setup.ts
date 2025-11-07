import { vi } from 'vitest';

/**
 * Test Setup File
 *
 * This file runs before all tests to set up the test environment.
 * It mocks Obsidian APIs that don't exist in the test environment.
 */

/**
 * Mock Obsidian API
 *
 * Why? Obsidian APIs (App, Plugin, Vault) only exist when running inside
 * Obsidian. In tests, we need to fake them.
 */

// Mock global Obsidian classes
(global as any).App = vi.fn();
(global as any).Plugin = vi.fn();
(global as any).PluginSettingTab = vi.fn();
(global as any).Setting = vi.fn();
(global as any).Notice = vi.fn();
(global as any).TFile = vi.fn();
(global as any).TFolder = vi.fn();
(global as any).Vault = vi.fn();
(global as any).MetadataCache = vi.fn();
(global as any).ItemView = vi.fn();
(global as any).WorkspaceLeaf = vi.fn();

/**
 * Mock console methods
 *
 * Why? Tests can be noisy with console.log everywhere.
 * We mock them to keep test output clean.
 *
 * Note: console.error is NOT mocked so we can still see real errors.
 */
const originalConsole = global.console;
global.console = {
	...originalConsole,
	log: vi.fn(),
	debug: vi.fn(),
	info: vi.fn(),
	warn: vi.fn(),
	// Keep error for debugging
	error: originalConsole.error
};
