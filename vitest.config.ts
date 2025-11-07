import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	test: {
		// Use globals like 'describe', 'it', 'expect' without importing
		globals: true,

		// Simulate browser environment (Obsidian is Electron-based)
		environment: 'jsdom',

		// Run this file before any tests (sets up mocks)
		setupFiles: ['./src/__tests__/setup.ts'],

		// Code coverage configuration
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'src/__tests__/',
				'**/*.d.ts',
				'**/*.config.*',
				'**/mockdata/**',
			],
			// Coverage thresholds
			statements: 80,
			branches: 75,
			functions: 80,
			lines: 80,
		},
	},
	resolve: {
		// Allow importing with '@/' instead of '../../'
		alias: {
			'@': path.resolve(__dirname, './src'),
			// Mock obsidian module
			'obsidian': path.resolve(__dirname, './src/__tests__/mocks/obsidian-module.ts'),
		},
	},
});
