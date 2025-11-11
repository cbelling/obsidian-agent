# Testing Specification: Obsidian Agent

**Version:** 1.0.0
**Date:** 2025-11-07
**Status:** Implementation Guide
**Audience:** Developers new to testing

---

## Table of Contents

1. [Introduction to Testing](#introduction-to-testing)
2. [Why We Need Tests](#why-we-need-tests)
3. [Testing Strategy Overview](#testing-strategy-overview)
4. [Phase 1: Setup Testing Infrastructure](#phase-1-setup-testing-infrastructure)
5. [Phase 2: Unit Tests](#phase-2-unit-tests)
6. [Phase 3: Integration Tests](#phase-3-integration-tests)
7. [Phase 4: Test Coverage & CI](#phase-4-test-coverage--ci)
8. [Best Practices & Patterns](#best-practices--patterns)

---

## Introduction to Testing

### What is Testing?

Testing is the practice of writing code that **verifies your application code works correctly**. Instead of manually clicking through your application every time you make a change, you write automated tests that can check if everything still works.

Think of it like this:
- **Without tests**: Make a change → Open Obsidian → Click around → Hope nothing broke
- **With tests**: Make a change → Run `npm test` → Get instant feedback on what broke

### Types of Tests (Simplified)

1. **Unit Tests**: Test individual functions/classes in isolation
   - Example: "Does `VaultService.searchByFilename()` return the right files?"

2. **Integration Tests**: Test how multiple pieces work together
   - Example: "Does the agent call VaultService correctly and return a good answer?"

3. **End-to-End Tests**: Test the entire application like a user would
   - Example: "Can I type a message in the chat and get a response?"

For this project, we'll focus on **Unit Tests** and **Integration Tests**. E2E tests are harder with Obsidian plugins.

---

## Why We Need Tests

### 1. **Catch Bugs Early**

**Without tests:**
```typescript
// You change VaultService
vaultService.searchByFilename(query);

// Later, the agent breaks because it expected different output
// You only find out when a user reports it
```

**With tests:**
```typescript
// You change VaultService
vaultService.searchByFilename(query);

// Tests run automatically
// ❌ FAIL: AgentGraph.test.ts - Agent can't find files
// You fix it immediately before anyone sees the bug
```

### 2. **Confidence to Refactor**

Right now, if you want to simplify the code or improve performance, you might be scared to break something. With tests, you can refactor boldly:

```typescript
// Refactor VaultService to be faster
// Run tests → All pass ✓
// You KNOW nothing broke
```

### 3. **Documentation**

Tests show how code is supposed to be used:

```typescript
// This test documents that searchByFilename is case-insensitive
it('should search case-insensitively', () => {
    const results = vaultService.searchByFilename('MEETING');
    expect(results).toContain('meeting-notes.md');
});
```

### 4. **Better Design**

Code that's hard to test is usually hard to use. Writing tests forces you to write cleaner, more modular code.

---

## Testing Strategy Overview

### Our Approach

```
┌─────────────────────────────────────────┐
│  Phase 1: Setup (Foundation)           │
│  - Install Vitest                       │
│  - Configure test environment           │
│  - Create mock utilities                │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Phase 2: Unit Tests (Core Logic)      │
│  - VaultService (file operations)       │
│  - ErrorHandler (error parsing)         │
│  - RateLimiter (token bucket)           │
│  - RetryHandler (exponential backoff)   │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Phase 3: Integration Tests (System)   │
│  - VaultTools (tools + VaultService)    │
│  - AgentGraph (agent + tools + API)     │
│  - ChatView (UI + agent interaction)    │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Phase 4: Coverage & CI (Quality)      │
│  - Measure test coverage                │
│  - Set up GitHub Actions                │
│  - Enforce coverage thresholds          │
└─────────────────────────────────────────┘
```

### Why This Order?

1. **Foundation first**: Can't write tests without tools
2. **Simple before complex**: Master unit tests, then tackle integration
3. **Core before UI**: Business logic is more critical than UI
4. **Automation last**: Only automate once tests are valuable

---

## Phase 1: Setup Testing Infrastructure

### Goal

Get a testing framework running so we can write and run tests.

### Why Vitest?

We chose **Vitest** over other frameworks (Jest, Mocha) because:

1. **Fast**: Uses Vite's build system (already in the project)
2. **Modern**: Built for TypeScript and ESM
3. **Compatible**: API is similar to Jest (widely known)
4. **Great DX**: Excellent error messages and UI

### Step 1: Install Dependencies

```bash
npm install --save-dev vitest @vitest/ui jsdom
npm install --save-dev @types/node
```

**What each package does:**
- `vitest`: The test runner (like a mini program that runs your tests)
- `@vitest/ui`: Visual test UI in the browser (helpful for debugging)
- `jsdom`: Fake browser environment (Obsidian runs in Electron, which is browser-like)
- `@types/node`: TypeScript types for Node.js APIs

### Step 2: Configure Vitest

**File:** `vitest.config.ts`

```typescript
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
            ],
        },
    },
    resolve: {
        // Allow importing with '@/' instead of '../../'
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
```

**Why each option?**
- `globals: true` → Less boilerplate (don't need to import `describe`, `it` everywhere)
- `environment: 'jsdom'` → Tests can use browser APIs that Obsidian uses
- `setupFiles` → Run common setup code before all tests
- `coverage` → Track which code is tested (we'll use this later)
- `alias` → Cleaner imports (`@/vault/VaultService` vs `../../vault/VaultService`)

### Step 3: Create Test Setup File

**File:** `src/__tests__/setup.ts`

```typescript
import { vi } from 'vitest';

/**
 * Mock Obsidian API
 *
 * Why? Obsidian APIs (App, Plugin, Vault) only exist when running inside
 * Obsidian. In tests, we need to fake them.
 */

// Mock global Obsidian classes
global.App = vi.fn() as any;
global.Plugin = vi.fn() as any;
global.PluginSettingTab = vi.fn() as any;
global.Setting = vi.fn() as any;
global.Notice = vi.fn() as any;
global.TFile = vi.fn() as any;
global.TFolder = vi.fn() as any;

/**
 * Mock console methods
 *
 * Why? Tests can be noisy with console.log everywhere.
 * We mock them to keep test output clean.
 *
 * Note: console.error is NOT mocked so we can still see real errors.
 */
global.console = {
    ...console,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    // Keep error for debugging
    error: console.error
};
```

**What's `vi.fn()`?**
- A "mock function" - a fake function that you can control in tests
- You can check if it was called, what arguments it received, etc.
- Example: `expect(console.log).toHaveBeenCalledWith('Hello')`

### Step 4: Add NPM Scripts

**File:** `package.json` (add to `scripts` section)

```json
{
    "scripts": {
        "test": "vitest",
        "test:ui": "vitest --ui",
        "test:coverage": "vitest run --coverage",
        "test:watch": "vitest watch"
    }
}
```

**What each script does:**
- `npm test` → Run tests once and exit
- `npm run test:ui` → Open visual test interface in browser
- `npm run test:coverage` → Show which code is tested
- `npm run test:watch` → Re-run tests when files change (useful during development)

### Step 5: Create Mock Utilities

**File:** `src/__tests__/mocks/obsidian.ts`

```typescript
import { vi } from 'vitest';

/**
 * MockVault
 *
 * A fake Obsidian Vault that stores files in memory instead of disk.
 * This lets us test VaultService without needing an actual Obsidian vault.
 */
export class MockVault {
    // Store files in a Map: path → content
    private files: Map<string, string> = new Map();

    /**
     * Add a fake file (used in test setup)
     */
    addFile(path: string, content: string): void {
        this.files.set(path, content);
    }

    /**
     * Mock: Vault.getAbstractFileByPath()
     * Returns a fake TFile object if the file exists
     */
    getAbstractFileByPath(path: string): any {
        if (this.files.has(path)) {
            return {
                path,
                basename: path.split('/').pop()?.replace('.md', '') || '',
                stat: {
                    ctime: Date.now(),
                    mtime: Date.now(),
                    size: this.files.get(path)?.length || 0
                }
            };
        }
        return null;
    }

    /**
     * Mock: Vault.read()
     * Returns the content of a fake file
     */
    async read(file: any): Promise<string> {
        return this.files.get(file.path) || '';
    }

    /**
     * Mock: Vault.getMarkdownFiles()
     * Returns all fake files as TFile objects
     */
    getMarkdownFiles(): any[] {
        return Array.from(this.files.keys()).map(path => ({
            path,
            basename: path.split('/').pop()?.replace('.md', '') || '',
            stat: {
                ctime: Date.now(),
                mtime: Date.now(),
                size: this.files.get(path)?.length || 0
            }
        }));
    }

    /**
     * Clear all files (used between tests)
     */
    clear(): void {
        this.files.clear();
    }
}

/**
 * MockMetadataCache
 *
 * A fake Obsidian MetadataCache for testing file metadata operations.
 */
export class MockMetadataCache {
    // Store metadata in a Map: path → metadata
    private cache: Map<string, any> = new Map();

    /**
     * Add fake metadata for a file (used in test setup)
     */
    setCache(path: string, metadata: any): void {
        this.cache.set(path, metadata);
    }

    /**
     * Mock: MetadataCache.getFileCache()
     */
    getFileCache(file: any): any {
        return this.cache.get(file.path);
    }

    /**
     * Mock: MetadataCache.getBacklinksForFile()
     */
    getBacklinksForFile(file: any): any {
        // Return empty backlinks by default
        // Tests can override this with setCache()
        return {
            data: new Map()
        };
    }

    /**
     * Clear all metadata (used between tests)
     */
    clear(): void {
        this.cache.clear();
    }
}

/**
 * Helper: Create a complete mock app with vault and metadata cache
 */
export function createMockApp(): any {
    return {
        vault: new MockVault(),
        metadataCache: new MockMetadataCache(),
    };
}
```

**Why create mock utilities?**

Real Obsidian APIs are complex and require an actual vault. Mocks let us:
1. Test in isolation (no real files)
2. Control test data precisely
3. Run tests fast (no disk I/O)
4. Test edge cases easily (e.g., missing files)

---

## Phase 2: Unit Tests

Unit tests verify individual functions/classes work correctly in isolation.

### Principle: Test Behavior, Not Implementation

**Bad test (testing implementation):**
```typescript
it('should call Array.filter', () => {
    const spy = vi.spyOn(Array.prototype, 'filter');
    vaultService.searchByFilename('test');
    expect(spy).toHaveBeenCalled();
});
```

**Good test (testing behavior):**
```typescript
it('should return files matching query', () => {
    const results = vaultService.searchByFilename('test');
    expect(results).toContain('test-file.md');
});
```

Why? If you refactor to use a different method (e.g., for loop instead of filter), the bad test breaks even though behavior is the same.

### 2.1 Unit Tests for VaultService

**File:** `src/__tests__/vault/VaultService.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VaultService } from '@/vault/VaultService';
import { MockVault, MockMetadataCache } from '../mocks/obsidian';

/**
 * VaultService Test Suite
 *
 * Tests all methods of VaultService to ensure file operations work correctly.
 */
describe('VaultService', () => {
    let vaultService: VaultService;
    let mockVault: MockVault;
    let mockMetadataCache: MockMetadataCache;

    /**
     * beforeEach: Runs before every test
     *
     * Why? Each test should start with a clean slate.
     * If test A modifies the vault, test B shouldn't see those changes.
     */
    beforeEach(() => {
        mockVault = new MockVault();
        mockMetadataCache = new MockMetadataCache();
        vaultService = new VaultService(mockVault as any, mockMetadataCache as any);
    });

    /**
     * afterEach: Runs after every test
     *
     * Why? Clean up resources to prevent memory leaks in test suite.
     */
    afterEach(() => {
        mockVault.clear();
        mockMetadataCache.clear();
    });

    /**
     * Test Group: searchByFilename()
     *
     * Why group tests? Related tests are easier to understand together.
     */
    describe('searchByFilename', () => {
        /**
         * Test: Happy path (normal usage)
         *
         * What we're testing:
         * - Given some files in the vault
         * - When I search for a term
         * - Then I get matching files back
         */
        it('should find files matching query', () => {
            // Arrange: Set up test data
            mockVault.addFile('notes/meeting-notes.md', 'Meeting content');
            mockVault.addFile('docs/meeting-agenda.md', 'Agenda content');
            mockVault.addFile('archive/random.md', 'Random content');

            // Act: Call the method we're testing
            const results = vaultService.searchByFilename('meeting');

            // Assert: Check the results
            expect(results).toHaveLength(2);
            expect(results).toContain('notes/meeting-notes.md');
            expect(results).toContain('docs/meeting-agenda.md');
        });

        /**
         * Test: Edge case (no matches)
         *
         * Why test edge cases? They often reveal bugs.
         */
        it('should return empty array when no matches', () => {
            mockVault.addFile('notes/test.md', 'Content');

            const results = vaultService.searchByFilename('nonexistent');

            expect(results).toHaveLength(0);
        });

        /**
         * Test: Case insensitivity
         *
         * Why test this? It's a requirement from the spec.
         * If someone changes the code to be case-sensitive by accident,
         * this test will catch it.
         */
        it('should search case-insensitively', () => {
            mockVault.addFile('Meeting-Notes.md', 'Content');

            const results = vaultService.searchByFilename('MEETING');

            expect(results).toContain('Meeting-Notes.md');
        });

        /**
         * Test: Partial matching
         *
         * Why? Users don't always remember full filenames.
         */
        it('should match partial filenames', () => {
            mockVault.addFile('project-planning-2024.md', 'Content');

            const results = vaultService.searchByFilename('planning');

            expect(results).toContain('project-planning-2024.md');
        });

        /**
         * Test: Empty query handling
         *
         * Why? Edge cases prevent crashes.
         */
        it('should handle empty query', () => {
            mockVault.addFile('test.md', 'Content');

            const results = vaultService.searchByFilename('');

            // Should return all files when query is empty
            expect(results).toHaveLength(1);
        });
    });

    /**
     * Test Group: readFile()
     */
    describe('readFile', () => {
        /**
         * Test: Happy path
         */
        it('should read file contents successfully', async () => {
            const mockContent = '# Test Note\nThis is content';
            mockVault.addFile('test.md', mockContent);

            const result = await vaultService.readFile('test.md');

            expect(result).toBe(mockContent);
        });

        /**
         * Test: Error case (file not found)
         *
         * Why test errors? We need to handle them gracefully.
         */
        it('should throw AgentError when file not found', async () => {
            // Note: We expect this to throw an error
            await expect(
                vaultService.readFile('nonexistent.md')
            ).rejects.toThrow('File not found');
        });

        /**
         * Test: Error case (path is a folder)
         *
         * Why? Users might accidentally pass a folder path.
         */
        it('should throw error when path is not a file', async () => {
            // Mock a folder (not in our MockVault, simulates Obsidian behavior)
            mockVault.getAbstractFileByPath = () => ({ path: 'folder', children: [] });

            await expect(
                vaultService.readFile('folder')
            ).rejects.toThrow('Path is not a file');
        });
    });

    /**
     * Test Group: searchByContent()
     *
     * This is more complex because it involves reading multiple files.
     */
    describe('searchByContent', () => {
        it('should find files containing search text', async () => {
            mockVault.addFile('note1.md', 'This contains the search term');
            mockVault.addFile('note2.md', 'This does not contain it');
            mockVault.addFile('note3.md', 'Another file with search term');

            const results = await vaultService.searchByContent('search term');

            expect(results).toHaveLength(2);
            expect(results[0].path).toBe('note1.md');
            expect(results[0].matches).toContain('This contains the search term');
        });

        /**
         * Test: Error handling during reads
         *
         * Why? Some files might be corrupted or locked.
         * We should skip them gracefully, not crash.
         */
        it('should handle read errors gracefully', async () => {
            mockVault.addFile('note1.md', 'Good content');
            mockVault.addFile('note2.md', 'Also good');

            // Make one file fail to read
            const originalRead = mockVault.read.bind(mockVault);
            mockVault.read = async (file: any) => {
                if (file.path === 'note2.md') {
                    throw new Error('Read error');
                }
                return originalRead(file);
            };

            const results = await vaultService.searchByContent('good');

            // Should only return note1 (note2 failed to read)
            expect(results).toHaveLength(1);
            expect(results[0].path).toBe('note1.md');
        });
    });

    /**
     * Test Group: getFileMetadata()
     */
    describe('getFileMetadata', () => {
        it('should return metadata with frontmatter', async () => {
            mockVault.addFile('test.md', 'Content');

            // Set up mock metadata
            mockMetadataCache.setCache('test.md', {
                frontmatter: {
                    title: 'Test Note',
                    tags: ['test', 'example'],
                },
                tags: [
                    { tag: '#inline-tag', position: {} },
                ],
            });

            const metadata = await vaultService.getFileMetadata('test.md');

            expect(metadata.frontmatter?.title).toBe('Test Note');
            expect(metadata.tags).toContain('test');
            expect(metadata.tags).toContain('inline-tag');
        });

        /**
         * Test: Missing metadata
         *
         * Why? Not all files have frontmatter.
         */
        it('should handle files without metadata', async () => {
            mockVault.addFile('test.md', 'Content');
            mockMetadataCache.setCache('test.md', {});

            const metadata = await vaultService.getFileMetadata('test.md');

            expect(metadata.frontmatter).toBeNull();
            expect(metadata.tags).toHaveLength(0);
        });
    });
});
```

**Key Testing Concepts:**

1. **Arrange-Act-Assert Pattern**
   ```typescript
   // Arrange: Set up test conditions
   mockVault.addFile('test.md', 'content');

   // Act: Execute the code being tested
   const result = vaultService.readFile('test.md');

   // Assert: Verify the result
   expect(result).toBe('content');
   ```

2. **Test Isolation**
   - Each test is independent
   - `beforeEach` creates fresh objects
   - Tests can run in any order

3. **Descriptive Test Names**
   - Use `should` for behavior
   - Name tells you what's being tested
   - Example: `should find files matching query`

### 2.2 Unit Tests for ErrorHandler

**File:** `src/__tests__/errors/ErrorHandler.test.ts`

```typescript
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

        /**
         * Test: Parse rate limit errors
         */
        it('should parse rate limit errors', () => {
            const error = new Error('Rate limit exceeded (429)');

            const result = ErrorHandler.handle(error);

            expect(result.code).toBe(ErrorCode.API_RATE_LIMIT);
            expect(result.isRetryable).toBe(true); // Rate limits are temporary
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

        /**
         * Test: Handle string errors
         *
         * Why? Sometimes code throws strings instead of Error objects.
         */
        it('should handle string errors', () => {
            const result = ErrorHandler.handle('Something went wrong');

            expect(result).toBeInstanceOf(AgentError);
            expect(result.message).toBe('Something went wrong');
        });

        /**
         * Test: Handle unknown error types
         */
        it('should handle unknown error types', () => {
            const weirdError = { code: 'WEIRD', data: [1, 2, 3] };

            const result = ErrorHandler.handle(weirdError);

            expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
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
            const delay1 = ErrorHandler.getBackoffDelay(0, 1000, 30000);
            const delay2 = ErrorHandler.getBackoffDelay(1, 1000, 30000);
            const delay3 = ErrorHandler.getBackoffDelay(2, 1000, 30000);

            // Delays should increase (with jitter, so not exact)
            expect(delay1).toBeLessThan(2000);
            expect(delay2).toBeGreaterThan(1500);
            expect(delay2).toBeLessThan(4000);
            expect(delay3).toBeGreaterThan(3000);
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
    });
});
```

### 2.3 Unit Tests for RateLimiter

**File:** `src/__tests__/errors/RateLimiter.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter } from '@/errors/RateLimiter';

/**
 * RateLimiter Test Suite
 *
 * Tests token bucket rate limiting algorithm.
 */
describe('RateLimiter', () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
        // Create a rate limiter: 10 tokens per second
        rateLimiter = new RateLimiter({
            tokensPerInterval: 10,
            interval: 1000, // 1 second
            maxTokens: 10
        });
    });

    /**
     * Test: Initial state
     */
    it('should start with max tokens', () => {
        expect(rateLimiter.getAvailableTokens()).toBe(10);
    });

    /**
     * Test: Token consumption
     */
    it('should remove tokens when requested', () => {
        const success = rateLimiter.tryRemoveTokens(3);

        expect(success).toBe(true);
        expect(rateLimiter.getAvailableTokens()).toBe(7);
    });

    /**
     * Test: Rate limiting
     *
     * When tokens are exhausted, requests should fail.
     */
    it('should return false when tokens exhausted', () => {
        rateLimiter.tryRemoveTokens(10); // Use all tokens

        const success = rateLimiter.tryRemoveTokens(1);

        expect(success).toBe(false);
    });

    /**
     * Test: Token refill
     *
     * This is tricky to test because it involves time.
     * We use vi.useFakeTimers() to control time in tests.
     */
    it('should refill tokens over time', async () => {
        // Use fake timers so we can control time
        vi.useFakeTimers();

        rateLimiter.tryRemoveTokens(10); // Use all tokens
        expect(rateLimiter.getAvailableTokens()).toBe(0);

        // Advance time by 1 second
        vi.advanceTimersByTime(1000);

        // Tokens should be refilled
        expect(rateLimiter.getAvailableTokens()).toBe(10);

        // Clean up fake timers
        vi.useRealTimers();
    });

    /**
     * Test: Async token removal
     *
     * removeTokens() should wait until tokens are available.
     */
    it('should wait for tokens to be available', async () => {
        vi.useFakeTimers();

        rateLimiter.tryRemoveTokens(10); // Use all tokens

        // Start waiting for a token (this will wait for refill)
        const promise = rateLimiter.removeTokens(1);

        // Advance time to trigger refill
        vi.advanceTimersByTime(1000);

        // Promise should resolve
        await expect(promise).resolves.toBeUndefined();

        vi.useRealTimers();
    });

    /**
     * Test: Reset functionality
     */
    it('should reset to max tokens', () => {
        rateLimiter.tryRemoveTokens(10);
        expect(rateLimiter.getAvailableTokens()).toBe(0);

        rateLimiter.reset();

        expect(rateLimiter.getAvailableTokens()).toBe(10);
    });
});
```

**Testing Time-Dependent Code:**

RateLimiter involves timers, which are tricky to test. We use **fake timers**:

```typescript
vi.useFakeTimers();      // Pause real time
vi.advanceTimersByTime(1000);  // Jump forward 1 second
vi.useRealTimers();      // Resume real time
```

This lets tests run instantly instead of waiting real seconds.

---

## Phase 3: Integration Tests

Integration tests verify multiple components work together correctly.

### 3.1 Integration Tests for VaultTools

**File:** `src/__tests__/vault/VaultTools.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createVaultTools } from '@/vault/VaultTools';
import { VaultService } from '@/vault/VaultService';
import { MockVault, MockMetadataCache } from '../mocks/obsidian';

/**
 * VaultTools Integration Tests
 *
 * Tests that tools correctly interact with VaultService.
 * This is "integration" because we're testing two layers together:
 * 1. Tool input parsing (Zod schemas)
 * 2. VaultService execution
 */
describe('VaultTools Integration', () => {
    let tools: ReturnType<typeof createVaultTools>;
    let vaultService: VaultService;
    let mockVault: MockVault;

    beforeEach(() => {
        mockVault = new MockVault();
        const mockMetadataCache = new MockMetadataCache();
        vaultService = new VaultService(mockVault as any, mockMetadataCache as any);
        tools = createVaultTools(vaultService);
    });

    /**
     * Helper: Find tool by name
     */
    function getTool(name: string) {
        return tools.find(t => t.name === name)!;
    }

    /**
     * Test: search_vault_by_name tool
     */
    describe('search_vault_by_name', () => {
        it('should search and format results', async () => {
            mockVault.addFile('meeting-notes.md', 'Content');
            mockVault.addFile('project-meeting.md', 'Content');

            const tool = getTool('search_vault_by_name');
            const result = await tool.invoke({ query: 'meeting' });

            expect(result).toContain('Found 2 file(s)');
            expect(result).toContain('meeting-notes.md');
            expect(result).toContain('project-meeting.md');
        });

        /**
         * Test: Input validation
         *
         * Why? Zod schemas should reject invalid inputs.
         */
        it('should reject empty query', async () => {
            const tool = getTool('search_vault_by_name');

            await expect(
                tool.invoke({ query: '' })
            ).rejects.toThrow();
        });
    });

    /**
     * Test: read_vault_file tool
     */
    describe('read_vault_file', () => {
        it('should read and return file content', async () => {
            const content = '# My Note\n\nThis is my note content.';
            mockVault.addFile('test.md', content);

            const tool = getTool('read_vault_file');
            const result = await tool.invoke({ path: 'test.md' });

            expect(result).toContain('Content of "test.md"');
            expect(result).toContain(content);
        });

        /**
         * Test: Content truncation
         *
         * Large files should be truncated to avoid overwhelming the LLM.
         */
        it('should truncate large files', async () => {
            const largeContent = 'x'.repeat(5000);
            mockVault.addFile('large.md', largeContent);

            const tool = getTool('read_vault_file');
            const result = await tool.invoke({ path: 'large.md' });

            expect(result).toContain('truncated');
            expect(result.length).toBeLessThan(largeContent.length);
        });

        /**
         * Test: Error handling
         */
        it('should return error message for missing file', async () => {
            const tool = getTool('read_vault_file');
            const result = await tool.invoke({ path: 'missing.md' });

            expect(result).toContain('Error reading file');
        });
    });
});
```

**Integration vs Unit:**
- **Unit test**: Mock VaultService, test tool logic only
- **Integration test**: Use real VaultService, test both together

### 3.2 Integration Tests for AgentGraph

**File:** `src/__tests__/agent/AgentGraph.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObsidianAgent } from '@/agent/AgentGraph';
import { createVaultTools } from '@/vault/VaultTools';
import { VaultService } from '@/vault/VaultService';
import { CheckpointService } from '@/checkpoint/CheckpointService';
import { MockVault, MockMetadataCache } from '../mocks/obsidian';
import { HumanMessage } from '@langchain/core/messages';

/**
 * AgentGraph Integration Tests
 *
 * These tests verify the entire agent pipeline:
 * 1. Agent receives message
 * 2. Agent calls Anthropic API (mocked)
 * 3. Agent executes tools
 * 4. Agent returns response
 *
 * Note: We mock the Anthropic API to avoid:
 * - Real API costs
 * - Slow tests
 * - Flaky tests (network issues)
 */
describe('ObsidianAgent Integration', () => {
    let agent: ObsidianAgent;
    let mockVault: MockVault;
    let checkpointer: CheckpointService;

    beforeEach(() => {
        // Set up vault
        mockVault = new MockVault();
        const mockMetadataCache = new MockMetadataCache();
        const vaultService = new VaultService(mockVault as any, mockMetadataCache as any);
        const tools = createVaultTools(vaultService);

        // Set up checkpointer (mock)
        checkpointer = {
            // Minimal mock implementation
            put: vi.fn(),
            get: vi.fn(),
            list: vi.fn().mockResolvedValue([])
        } as any;

        // Create agent
        agent = new ObsidianAgent(
            'sk-ant-test-key',
            tools,
            checkpointer,
            false // Disable LangSmith for tests
        );
    });

    /**
     * Test: Simple query without tools
     *
     * This is a "smoke test" - verifies basic functionality.
     */
    it('should respond to simple greeting', async () => {
        // Mock Anthropic API response
        vi.spyOn(agent as any, 'anthropic.messages.create').mockResolvedValue({
            content: [{ type: 'text', text: 'Hello! How can I help?' }],
        });

        const result = await agent.invoke({
            messages: [new HumanMessage('Hello')],
        });

        expect(result.messages).toHaveLength(2); // Human + AI
        expect(result.messages[1].content).toContain('Hello');
    });

    /**
     * Test: Query that triggers tool use
     *
     * This is the most important test - it verifies the agent loop:
     * 1. Agent decides to use a tool
     * 2. Tool executes
     * 3. Agent sees tool result
     * 4. Agent responds
     */
    it('should use tools to answer vault questions', async () => {
        // Add test files to vault
        mockVault.addFile('meeting-notes.md', 'Discussed Q4 goals');

        // Mock Anthropic API responses
        const apiMock = vi.spyOn(agent as any, 'anthropic.messages.create');

        // First call: Agent decides to use search tool
        apiMock.mockResolvedValueOnce({
            content: [
                {
                    type: 'tool_use',
                    id: 'call_1',
                    name: 'search_vault_by_name',
                    input: { query: 'meeting' }
                }
            ],
        });

        // Second call: Agent responds with answer
        apiMock.mockResolvedValueOnce({
            content: [
                { type: 'text', text: 'I found your meeting notes.' }
            ],
        });

        const result = await agent.invoke({
            messages: [new HumanMessage('Find my meeting notes')],
        });

        // Verify tool was called
        expect(result.messages).toContainEqual(
            expect.objectContaining({
                name: 'search_vault_by_name'
            })
        );

        // Verify final response
        const lastMessage = result.messages[result.messages.length - 1];
        expect(lastMessage.content).toContain('meeting notes');
    });

    /**
     * Test: Error handling
     */
    it('should handle API errors gracefully', async () => {
        // Mock API error
        vi.spyOn(agent as any, 'anthropic.messages.create')
            .mockRejectedValue(new Error('Rate limit exceeded'));

        const result = await agent.invoke({
            messages: [new HumanMessage('Test')],
        });

        // Should return error message, not crash
        const lastMessage = result.messages[result.messages.length - 1];
        expect(lastMessage.content).toContain('error');
    });
});
```

**Mocking External APIs:**

We mock the Anthropic API because:
1. **Cost**: Real API calls cost money
2. **Speed**: Network requests are slow
3. **Reliability**: Tests shouldn't fail because API is down
4. **Control**: We can test specific scenarios

```typescript
vi.spyOn(agent, 'anthropic.messages.create').mockResolvedValue({
    content: [{ type: 'text', text: 'Mocked response' }]
});
```

---

## Phase 4: Test Coverage & CI

### 4.1 Measuring Test Coverage

**What is coverage?**

Coverage tells you what percentage of your code is executed by tests.

```typescript
// Example function
function divide(a: number, b: number): number {
    if (b === 0) {
        throw new Error('Division by zero');
    }
    return a / b;
}

// Test
it('should divide numbers', () => {
    expect(divide(10, 2)).toBe(5);
});
```

**Coverage report:**
- Line 2-3: ❌ Not covered (we never test b === 0)
- Line 5: ✅ Covered

**Run coverage:**
```bash
npm run test:coverage
```

**Output:**
```
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
vault/VaultService  |   85.2  |   75.0   |   90.0  |   85.2  |
errors/ErrorHandler |   92.3  |   88.9   |  100.0  |   92.3  |
agent/AgentGraph    |   71.4  |   60.0   |   80.0  |   71.4  |
--------------------|---------|----------|---------|---------|
```

**Coverage goals:**
- 80%+ is good for business logic
- 90%+ is excellent
- 100% is often not worth the effort

### 4.2 Set Up GitHub Actions

**Why CI (Continuous Integration)?**

CI automatically runs tests when you:
- Push code to GitHub
- Create a pull request
- Merge to main branch

This catches bugs before they reach production.

**File:** `.github/workflows/test.yml`

```yaml
name: Tests

# Run tests on every push and pull request
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      # Check out code
      - uses: actions/checkout@v3

      # Set up Node.js
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      # Install dependencies
      - name: Install dependencies
        run: npm ci

      # Run tests
      - name: Run tests
        run: npm test

      # Run coverage
      - name: Generate coverage
        run: npm run test:coverage

      # Upload coverage to GitHub
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json
```

**What this does:**
1. Every commit triggers test run
2. If tests fail, commit is marked as failing
3. Pull requests can't merge if tests fail
4. Coverage report is generated and uploaded

### 4.3 Coverage Thresholds

Enforce minimum coverage in `vitest.config.ts`:

```typescript
export default defineConfig({
    test: {
        coverage: {
            // Fail tests if coverage drops below these thresholds
            statements: 80,
            branches: 75,
            functions: 80,
            lines: 80,
        },
    },
});
```

Now if someone adds code without tests, CI will fail.

---

## Best Practices & Patterns

### 1. Test Naming Convention

**Good:**
```typescript
it('should return empty array when no files match query', () => {
```

**Bad:**
```typescript
it('test1', () => {
it('works', () => {
```

**Pattern:** `should [expected behavior] when [condition]`

### 2. One Assertion Per Concept

**Good:**
```typescript
it('should search case-insensitively', () => {
    const results = vaultService.searchByFilename('MEETING');
    expect(results).toContain('meeting-notes.md');
});
```

**Bad:**
```typescript
it('should search correctly', () => {
    expect(vaultService.searchByFilename('MEETING')).toContain('meeting-notes.md');
    expect(vaultService.searchByFilename('test')).toHaveLength(0);
    expect(vaultService.readFile('test.md')).toBe('content');
    // Testing too many things!
});
```

### 3. DRY (Don't Repeat Yourself) - But Not Too Much

**Okay to repeat in tests:**
```typescript
it('test A', () => {
    const vault = new MockVault();
    vault.addFile('test.md', 'content');
    // ...
});

it('test B', () => {
    const vault = new MockVault();
    vault.addFile('test.md', 'content');
    // ...
});
```

Tests should be readable, even if it means repetition.

**Extract only when very repetitive:**
```typescript
function createTestVault() {
    const vault = new MockVault();
    vault.addFile('test1.md', 'content1');
    vault.addFile('test2.md', 'content2');
    vault.addFile('test3.md', 'content3');
    return vault;
}
```

### 4. Test Edge Cases

For every function, test:
- ✅ Happy path (normal usage)
- ✅ Empty input
- ✅ Null/undefined input
- ✅ Invalid input
- ✅ Boundary values (0, 1, max)

### 5. Async Testing Gotchas

**Wrong:**
```typescript
it('should read file', () => {
    vaultService.readFile('test.md'); // Forgot await!
    expect(result).toBe('content'); // result is undefined
});
```

**Right:**
```typescript
it('should read file', async () => {
    const result = await vaultService.readFile('test.md');
    expect(result).toBe('content');
});
```

### 6. Watch Mode for Development

During development, run:
```bash
npm run test:watch
```

This re-runs tests automatically when you save files. Fast feedback loop!

---

## Summary

### What We've Built

1. **Infrastructure**: Vitest, mocks, test utilities
2. **Unit Tests**: VaultService, ErrorHandler, RateLimiter
3. **Integration Tests**: VaultTools, AgentGraph
4. **CI/CD**: Automated testing on GitHub

### Benefits

- ✅ Catch bugs immediately
- ✅ Refactor confidently
- ✅ Document expected behavior
- ✅ Prevent regressions

### Testing Mindset

**Before tests:**
> "I hope this works" 🤞

**After tests:**
> "I know this works" ✅

---

## Next Steps

1. **Implement Phase 1**: Set up infrastructure
2. **Write first test**: Start with VaultService.searchByFilename
3. **See it pass**: Run `npm test`
4. **Build confidence**: Add more tests incrementally
5. **Make it habit**: Write tests for all new features

Testing takes time upfront but saves much more time later. Every bug caught by a test is a bug that won't embarrass you in production.

Happy testing! 🧪
