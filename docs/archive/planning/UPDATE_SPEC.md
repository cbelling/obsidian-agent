# Update Specification: Obsidian Agent Improvements

**Version:** 1.1.0
**Date:** 2025-11-02
**Status:** Draft

## Executive Summary

This specification outlines critical improvements to the Obsidian Agent plugin based on senior engineering review. The changes focus on security, reliability, testing, and architectural simplification to create a production-ready codebase.

---

## Table of Contents

1. [Critical Security Fixes](#1-critical-security-fixes)
2. [Error Handling & Resilience](#2-error-handling--resilience)
3. [Testing Infrastructure](#3-testing-infrastructure)
4. [Architecture Simplification](#4-architecture-simplification)
5. [Type Safety Improvements](#5-type-safety-improvements)
6. [Performance Optimizations](#6-performance-optimizations)
7. [Documentation Updates](#7-documentation-updates)
8. [Developer Experience](#8-developer-experience)

---

## 1. Critical Security Fixes

### 1.1 Secure API Key Storage

**Problem:** API keys currently stored in plain text in Obsidian's data.json file.

**Solution:** Implement secure storage using Obsidian's built-in secure storage mechanisms.

#### Implementation Details

**File:** `src/settings.ts`

```typescript
// Add password field type for API key
new Setting(containerEl)
    .setName('Anthropic API Key')
    .setDesc('Your Anthropic API key (stored securely)')
    .addText(text => text
        .setPlaceholder('sk-ant-...')
        .setValue(this.plugin.settings.apiKey)
        .onChange(async (value) => {
            this.plugin.settings.apiKey = value;
            await this.plugin.saveSettings();
        })
        .inputEl.type = 'password'  // Mask the input
    );
```

**Additional Considerations:**
- Consider using system keychain integration for desktop platforms
- Add validation to ensure API key format is correct (starts with `sk-ant-`)
- Clear API key from memory after initialization
- Add warning when API key is stored

#### Testing

- Verify API key is not visible in data.json when inspected
- Test that key persists across plugin reloads
- Validate key masking in UI

---

### 1.2 Sensitive Data Handling

**Problem:** Conversation history may contain sensitive vault content.

**Solution:** Implement data retention policies and secure cleanup.

#### Implementation Details

**File:** `src/checkpoint/CheckpointService.ts`

```typescript
export class CheckpointService {
    private readonly MAX_HISTORY_SIZE = 100; // messages
    private readonly RETENTION_DAYS = 30;

    // Add method to clean old conversations
    async pruneOldCheckpoints(): Promise<void> {
        const now = Date.now();
        const cutoff = now - (this.RETENTION_DAYS * 24 * 60 * 60 * 1000);

        // Iterate through stored checkpoints and remove old ones
        for (const [threadId, checkpoint] of this.checkpoints.entries()) {
            const lastModified = checkpoint.metadata?.timestamp || 0;
            if (lastModified < cutoff) {
                this.checkpoints.delete(threadId);
                await this.deleteCheckpointFile(threadId);
            }
        }
    }

    // Add method to sanitize conversation data before export
    sanitizeForExport(checkpoint: Checkpoint): Checkpoint {
        // Remove sensitive metadata, keep only necessary conversation
        return {
            ...checkpoint,
            metadata: {
                timestamp: checkpoint.metadata?.timestamp
            }
        };
    }
}
```

**Settings Addition:**

```typescript
export interface ObsidianAgentSettings {
    apiKey: string;
    langSmithApiKey: string;
    langSmithProject: string;
    enableLangSmith: boolean;
    // New settings
    retentionDays: number;
    maxHistorySize: number;
    enableAutoCleanup: boolean;
}

export const DEFAULT_SETTINGS: ObsidianAgentSettings = {
    apiKey: '',
    langSmithApiKey: '',
    langSmithProject: 'obsidian-agent',
    enableLangSmith: false,
    retentionDays: 30,
    maxHistorySize: 100,
    enableAutoCleanup: true,
}
```

---

## 2. Error Handling & Resilience

### 2.1 Comprehensive Error Boundaries

**Problem:** No graceful degradation when services fail.

**Solution:** Implement error boundaries and fallback behaviors throughout the application.

#### Implementation Details

**File:** `src/errors/ErrorHandler.ts` (new)

```typescript
export class AgentError extends Error {
    constructor(
        message: string,
        public readonly code: ErrorCode,
        public readonly details?: Record<string, unknown>,
        public readonly isRetryable: boolean = false
    ) {
        super(message);
        this.name = 'AgentError';
    }
}

export enum ErrorCode {
    // API Errors
    API_KEY_INVALID = 'API_KEY_INVALID',
    API_RATE_LIMIT = 'API_RATE_LIMIT',
    API_NETWORK = 'API_NETWORK',
    API_TIMEOUT = 'API_TIMEOUT',
    API_SERVER_ERROR = 'API_SERVER_ERROR',

    // Vault Errors
    VAULT_FILE_NOT_FOUND = 'VAULT_FILE_NOT_FOUND',
    VAULT_READ_ERROR = 'VAULT_READ_ERROR',
    VAULT_SEARCH_ERROR = 'VAULT_SEARCH_ERROR',

    // Agent Errors
    AGENT_INITIALIZATION_ERROR = 'AGENT_INITIALIZATION_ERROR',
    AGENT_EXECUTION_ERROR = 'AGENT_EXECUTION_ERROR',
    TOOL_EXECUTION_ERROR = 'TOOL_EXECUTION_ERROR',

    // Checkpoint Errors
    CHECKPOINT_SAVE_ERROR = 'CHECKPOINT_SAVE_ERROR',
    CHECKPOINT_LOAD_ERROR = 'CHECKPOINT_LOAD_ERROR',
}

export class ErrorHandler {
    static handle(error: unknown): AgentError {
        if (error instanceof AgentError) {
            return error;
        }

        if (error instanceof Error) {
            // Parse Anthropic API errors
            if (error.message.includes('authentication')) {
                return new AgentError(
                    'Invalid API key. Please check your settings.',
                    ErrorCode.API_KEY_INVALID,
                    { originalError: error.message }
                );
            }

            if (error.message.includes('rate_limit')) {
                return new AgentError(
                    'Rate limit exceeded. Please try again in a moment.',
                    ErrorCode.API_RATE_LIMIT,
                    { originalError: error.message },
                    true // Retryable
                );
            }

            if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
                return new AgentError(
                    'Network error. Please check your connection.',
                    ErrorCode.API_NETWORK,
                    { originalError: error.message },
                    true
                );
            }
        }

        return new AgentError(
            'An unexpected error occurred.',
            ErrorCode.AGENT_EXECUTION_ERROR,
            { originalError: String(error) }
        );
    }

    static isRetryable(error: AgentError): boolean {
        return error.isRetryable;
    }

    static getUserMessage(error: AgentError): string {
        const baseMessage = error.message;

        switch (error.code) {
            case ErrorCode.API_KEY_INVALID:
                return `${baseMessage}\n\nGo to Settings → Obsidian Agent to update your API key.`;

            case ErrorCode.API_RATE_LIMIT:
                return `${baseMessage}\n\nThe request will be retried automatically.`;

            case ErrorCode.API_NETWORK:
                return `${baseMessage}\n\nVerify your internet connection and try again.`;

            default:
                return baseMessage;
        }
    }
}
```

#### Integration in ChatView

**File:** `src/ChatView.ts`

```typescript
private async handleSendMessage() {
    const userMessage = this.inputEl.value.trim();
    if (!userMessage) return;

    try {
        this.setLoading(true);
        this.addMessage({ role: 'user', content: userMessage });
        this.inputEl.value = '';

        const response = await this.sendMessageWithRetry(userMessage);
        this.addMessage({ role: 'assistant', content: response });

    } catch (error) {
        const agentError = ErrorHandler.handle(error);
        const userMessage = ErrorHandler.getUserMessage(agentError);

        this.addErrorMessage(userMessage);

        // Log detailed error for debugging
        console.error('Agent error:', {
            code: agentError.code,
            details: agentError.details,
            stack: agentError.stack
        });

    } finally {
        this.setLoading(false);
    }
}

private async sendMessageWithRetry(
    message: string,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<string> {
    let lastError: AgentError | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await this.agent.invoke(message);
        } catch (error) {
            lastError = ErrorHandler.handle(error);

            if (!ErrorHandler.isRetryable(lastError)) {
                throw lastError;
            }

            if (attempt < maxRetries - 1) {
                // Exponential backoff
                const delay = baseDelay * Math.pow(2, attempt);
                await this.sleep(delay);

                this.showRetryNotice(attempt + 1, maxRetries);
            }
        }
    }

    throw lastError;
}

private addErrorMessage(message: string): void {
    this.addMessage({
        role: 'assistant',
        content: `⚠️ **Error**\n\n${message}`
    });
}

private showRetryNotice(attempt: number, maxRetries: number): void {
    // Show temporary notice in UI
    new Notice(`Retrying... (${attempt}/${maxRetries})`);
}

private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

### 2.2 LangSmith Failure Handling

**Problem:** Plugin fails if LangSmith is enabled but unavailable.

**Solution:** Graceful degradation when tracing fails.

#### Implementation Details

**File:** `src/agent/AgentGraph.ts`

```typescript
private async initializeLangSmith(): Promise<void> {
    if (!this.settings.enableLangSmith) {
        return;
    }

    try {
        // Test LangSmith connection
        const client = new Client({
            apiKey: this.settings.langSmithApiKey,
        });

        await client.readProject(this.settings.langSmithProject);

        // Set environment variables only if successful
        process.env.LANGCHAIN_TRACING_V2 = 'true';
        process.env.LANGCHAIN_API_KEY = this.settings.langSmithApiKey;
        process.env.LANGCHAIN_PROJECT = this.settings.langSmithProject;

        console.log('LangSmith tracing enabled');

    } catch (error) {
        console.warn('LangSmith initialization failed, continuing without tracing:', error);

        // Disable tracing if it fails
        this.settings.enableLangSmith = false;

        new Notice('LangSmith tracing unavailable. Continuing without monitoring.');
    }
}
```

---

### 2.3 Rate Limiting

**Problem:** No handling of API rate limits.

**Solution:** Implement exponential backoff and request queuing.

#### Implementation Details

**File:** `src/utils/RateLimiter.ts` (new)

```typescript
export class RateLimiter {
    private queue: Array<() => Promise<void>> = [];
    private processing = false;
    private lastRequestTime = 0;
    private readonly minRequestInterval = 1000; // 1 second between requests

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const now = Date.now();
                    const timeSinceLastRequest = now - this.lastRequestTime;

                    if (timeSinceLastRequest < this.minRequestInterval) {
                        await this.sleep(this.minRequestInterval - timeSinceLastRequest);
                    }

                    this.lastRequestTime = Date.now();
                    const result = await fn();
                    resolve(result);

                } catch (error) {
                    reject(error);
                }
            });

            this.processQueue();
        });
    }

    private async processQueue(): Promise<void> {
        if (this.processing || this.queue.length === 0) {
            return;
        }

        this.processing = true;

        while (this.queue.length > 0) {
            const task = this.queue.shift();
            if (task) {
                await task();
            }
        }

        this.processing = false;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

**Usage in AgentGraph:**

```typescript
export class AgentGraph {
    private rateLimiter = new RateLimiter();

    async callAgent(messages: BaseMessage[]): Promise<AIMessage> {
        return this.rateLimiter.execute(async () => {
            return await this.model.invoke(messages);
        });
    }
}
```

---

## 3. Testing Infrastructure

### 3.1 Testing Framework Setup

**Problem:** No automated tests exist.

**Solution:** Set up Jest/Vitest with proper mocking infrastructure.

#### Installation

```bash
npm install --save-dev vitest @vitest/ui jsdom
npm install --save-dev @types/node
```

#### Configuration

**File:** `vitest.config.ts` (new)

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/__tests__/setup.ts'],
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
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
```

**File:** `src/__tests__/setup.ts` (new)

```typescript
import { vi } from 'vitest';

// Mock Obsidian API
global.App = vi.fn();
global.Plugin = vi.fn();
global.PluginSettingTab = vi.fn();
global.Setting = vi.fn();
global.Notice = vi.fn();
global.TFile = vi.fn();
global.TFolder = vi.fn();

// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
};
```

**Update package.json:**

```json
{
    "scripts": {
        "dev": "node esbuild.config.mjs",
        "build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production",
        "test": "vitest",
        "test:ui": "vitest --ui",
        "test:coverage": "vitest run --coverage",
        "test:watch": "vitest watch"
    }
}
```

---

### 3.2 Unit Tests for VaultService

**File:** `src/__tests__/vault/VaultService.test.ts` (new)

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VaultService } from '../../vault/VaultService';
import { TFile, TFolder, Vault, MetadataCache } from 'obsidian';

// Mock Obsidian classes
vi.mock('obsidian', () => ({
    TFile: vi.fn(),
    TFolder: vi.fn(),
    Vault: vi.fn(),
    MetadataCache: vi.fn(),
}));

describe('VaultService', () => {
    let vaultService: VaultService;
    let mockVault: any;
    let mockMetadataCache: any;

    beforeEach(() => {
        // Create mock vault
        mockVault = {
            getAbstractFileByPath: vi.fn(),
            read: vi.fn(),
            getMarkdownFiles: vi.fn(),
            getFiles: vi.fn(),
        };

        mockMetadataCache = {
            getFileCache: vi.fn(),
            getBacklinksForFile: vi.fn(),
        };

        vaultService = new VaultService(mockVault, mockMetadataCache);
    });

    describe('searchFiles', () => {
        it('should find files matching query', async () => {
            const mockFiles = [
                { path: 'notes/meeting-notes.md', basename: 'meeting-notes' },
                { path: 'docs/meeting-agenda.md', basename: 'meeting-agenda' },
                { path: 'archive/notes.md', basename: 'notes' },
            ];

            mockVault.getMarkdownFiles.mockReturnValue(mockFiles);

            const results = await vaultService.searchFiles('meeting');

            expect(results).toHaveLength(2);
            expect(results[0].path).toBe('notes/meeting-notes.md');
            expect(results[1].path).toBe('docs/meeting-agenda.md');
        });

        it('should return empty array when no matches', async () => {
            mockVault.getMarkdownFiles.mockReturnValue([]);

            const results = await vaultService.searchFiles('nonexistent');

            expect(results).toHaveLength(0);
        });

        it('should be case-insensitive', async () => {
            const mockFiles = [
                { path: 'Meeting-Notes.md', basename: 'Meeting-Notes' },
            ];

            mockVault.getMarkdownFiles.mockReturnValue(mockFiles);

            const results = await vaultService.searchFiles('MEETING');

            expect(results).toHaveLength(1);
        });
    });

    describe('readFile', () => {
        it('should read file contents successfully', async () => {
            const mockFile = { path: 'test.md' };
            const mockContent = '# Test Note\nThis is content';

            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockVault.read.mockResolvedValue(mockContent);

            const result = await vaultService.readFile('test.md');

            expect(result).toBe(mockContent);
            expect(mockVault.getAbstractFileByPath).toHaveBeenCalledWith('test.md');
            expect(mockVault.read).toHaveBeenCalledWith(mockFile);
        });

        it('should throw error when file not found', async () => {
            mockVault.getAbstractFileByPath.mockReturnValue(null);

            await expect(
                vaultService.readFile('nonexistent.md')
            ).rejects.toThrow('File not found');
        });

        it('should throw error when file is a folder', async () => {
            const mockFolder = { path: 'folder' };
            mockVault.getAbstractFileByPath.mockReturnValue(mockFolder);

            await expect(
                vaultService.readFile('folder')
            ).rejects.toThrow('Path is not a file');
        });
    });

    describe('searchByContent', () => {
        it('should find files containing search text', async () => {
            const mockFiles = [
                { path: 'note1.md', basename: 'note1' },
                { path: 'note2.md', basename: 'note2' },
            ];

            mockVault.getMarkdownFiles.mockReturnValue(mockFiles);
            mockVault.read
                .mockResolvedValueOnce('This contains the search term')
                .mockResolvedValueOnce('This does not contain it');

            const results = await vaultService.searchByContent('search term');

            expect(results).toHaveLength(1);
            expect(results[0].path).toBe('note1.md');
        });

        it('should handle read errors gracefully', async () => {
            const mockFiles = [
                { path: 'note1.md', basename: 'note1' },
            ];

            mockVault.getMarkdownFiles.mockReturnValue(mockFiles);
            mockVault.read.mockRejectedValue(new Error('Read error'));

            const results = await vaultService.searchByContent('search');

            expect(results).toHaveLength(0);
        });
    });

    describe('getFileMetadata', () => {
        it('should return metadata with frontmatter', async () => {
            const mockFile = {
                path: 'test.md',
                stat: { ctime: 1000, mtime: 2000, size: 500 },
            };

            const mockCache = {
                frontmatter: {
                    title: 'Test Note',
                    tags: ['test', 'example'],
                },
                tags: [
                    { tag: '#inline-tag', position: {} },
                ],
            };

            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockMetadataCache.getFileCache.mockReturnValue(mockCache);

            const metadata = await vaultService.getFileMetadata('test.md');

            expect(metadata.frontmatter).toEqual({
                title: 'Test Note',
                tags: ['test', 'example'],
            });
            expect(metadata.tags).toContain('test');
            expect(metadata.tags).toContain('inline-tag');
            expect(metadata.created).toBe(1000);
            expect(metadata.modified).toBe(2000);
            expect(metadata.size).toBe(500);
        });
    });
});
```

---

### 3.3 Integration Tests for Agent

**File:** `src/__tests__/agent/AgentGraph.test.ts` (new)

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentGraph } from '../../agent/AgentGraph';
import { HumanMessage } from '@langchain/core/messages';

describe('AgentGraph', () => {
    let agentGraph: AgentGraph;

    beforeEach(() => {
        const mockSettings = {
            apiKey: 'test-api-key',
            enableLangSmith: false,
        };

        const mockVaultService = {
            searchFiles: vi.fn(),
            readFile: vi.fn(),
            searchByContent: vi.fn(),
        };

        agentGraph = new AgentGraph(mockSettings, mockVaultService);
    });

    describe('invoke', () => {
        it('should handle simple query without tools', async () => {
            // Mock the Claude API call
            vi.spyOn(agentGraph as any, 'callAgent').mockResolvedValue({
                content: 'Hello! How can I help you today?',
            });

            const response = await agentGraph.invoke('Hello');

            expect(response).toBe('Hello! How can I help you today?');
        });

        it('should execute tools when needed', async () => {
            const mockVaultService = (agentGraph as any).vaultService;
            mockVaultService.searchFiles.mockResolvedValue([
                { path: 'meeting.md', basename: 'meeting' },
            ]);

            vi.spyOn(agentGraph as any, 'callAgent')
                .mockResolvedValueOnce({
                    content: '',
                    tool_calls: [{
                        name: 'search_files',
                        args: { query: 'meeting' },
                        id: 'call_1',
                    }],
                })
                .mockResolvedValueOnce({
                    content: 'I found a meeting note.',
                });

            const response = await agentGraph.invoke('Find meeting notes');

            expect(mockVaultService.searchFiles).toHaveBeenCalledWith('meeting');
            expect(response).toBe('I found a meeting note.');
        });
    });
});
```

---

### 3.4 Mock Obsidian Test Environment

**File:** `src/__tests__/mocks/obsidian.ts` (new)

```typescript
import { vi } from 'vitest';

export class MockVault {
    private files: Map<string, string> = new Map();

    addFile(path: string, content: string): void {
        this.files.set(path, content);
    }

    getAbstractFileByPath(path: string): any {
        if (this.files.has(path)) {
            return {
                path,
                basename: path.split('/').pop()?.replace('.md', '') || '',
            };
        }
        return null;
    }

    async read(file: any): Promise<string> {
        return this.files.get(file.path) || '';
    }

    getMarkdownFiles(): any[] {
        return Array.from(this.files.keys()).map(path => ({
            path,
            basename: path.split('/').pop()?.replace('.md', '') || '',
        }));
    }
}

export class MockMetadataCache {
    private cache: Map<string, any> = new Map();

    setCache(path: string, cache: any): void {
        this.cache.set(path, cache);
    }

    getFileCache(file: any): any {
        return this.cache.get(file.path);
    }
}

export function createMockApp(): any {
    return {
        vault: new MockVault(),
        metadataCache: new MockMetadataCache(),
    };
}
```

---

## 4. Architecture Simplification

### 4.1 Remove LangGraph Dependency (Optional)

**Problem:** LangGraph adds unnecessary complexity for current use case.

**Solution:** Direct implementation with Anthropic SDK and custom state management.

#### Assessment

Before removing LangGraph, consider:

**Pros of keeping LangGraph:**
- Built-in state management
- Tool execution abstraction
- Future-proofing for complex workflows
- Streaming support

**Cons of keeping LangGraph:**
- Over-engineered for current features
- Additional dependency weight
- Learning curve for contributors
- Abstraction overhead

**Recommendation:** Keep LangGraph but simplify usage. Only remove if planning to never implement complex agent workflows.

#### Simplified LangGraph Usage

**File:** `src/agent/AgentGraph.ts` (simplified)

```typescript
export class AgentGraph {
    private model: ChatAnthropic;
    private tools: StructuredTool[];
    private graph: CompiledGraph;

    constructor(
        private settings: ObsidianAgentSettings,
        private vaultService: VaultService
    ) {
        this.model = new ChatAnthropic({
            apiKey: settings.apiKey,
            model: 'claude-sonnet-4-20250514',
        });

        this.tools = createVaultTools(vaultService);
        this.graph = this.createSimpleGraph();
    }

    private createSimpleGraph(): CompiledGraph {
        const workflow = new StateGraph<AgentState>({
            channels: {
                messages: {
                    value: (left: BaseMessage[], right: BaseMessage[]) =>
                        left.concat(right),
                    default: () => [],
                },
            },
        });

        // Single node that handles everything
        workflow.addNode('agent', async (state: AgentState) => {
            const response = await this.model.invoke(state.messages, {
                tools: this.tools,
            });

            return { messages: [response] };
        });

        workflow.setEntryPoint('agent');
        workflow.setFinishPoint('agent');

        return workflow.compile();
    }

    async invoke(userMessage: string): Promise<string> {
        try {
            const result = await this.graph.invoke({
                messages: [new HumanMessage(userMessage)],
            });

            const lastMessage = result.messages[result.messages.length - 1];
            return lastMessage.content as string;

        } catch (error) {
            throw ErrorHandler.handle(error);
        }
    }
}
```

---

### 4.2 Consolidate State Management

**Problem:** State managed in three places: AgentState, CheckpointService, ChatView.

**Solution:** Single source of truth with clear boundaries.

#### Implementation

**File:** `src/state/ConversationManager.ts` (new)

```typescript
import { BaseMessage } from '@langchain/core/messages';

export interface Conversation {
    id: string;
    title: string;
    messages: BaseMessage[];
    createdAt: number;
    updatedAt: number;
}

export class ConversationManager {
    private conversations: Map<string, Conversation> = new Map();
    private currentConversationId: string | null = null;

    constructor(
        private checkpointService: CheckpointService
    ) {
        this.loadConversations();
    }

    // Single source of truth for current conversation
    getCurrentConversation(): Conversation | null {
        if (!this.currentConversationId) return null;
        return this.conversations.get(this.currentConversationId) || null;
    }

    createConversation(title: string = 'New Chat'): Conversation {
        const conversation: Conversation = {
            id: this.generateId(),
            title,
            messages: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        this.conversations.set(conversation.id, conversation);
        this.currentConversationId = conversation.id;

        this.saveConversation(conversation);

        return conversation;
    }

    addMessage(message: BaseMessage): void {
        const conversation = this.getCurrentConversation();
        if (!conversation) {
            throw new Error('No active conversation');
        }

        conversation.messages.push(message);
        conversation.updatedAt = Date.now();

        this.saveConversation(conversation);
    }

    switchConversation(id: string): Conversation {
        const conversation = this.conversations.get(id);
        if (!conversation) {
            throw new Error(`Conversation ${id} not found`);
        }

        this.currentConversationId = id;
        return conversation;
    }

    deleteConversation(id: string): void {
        this.conversations.delete(id);
        this.checkpointService.deleteCheckpoint(id);

        if (this.currentConversationId === id) {
            this.currentConversationId = null;
        }
    }

    listConversations(): Conversation[] {
        return Array.from(this.conversations.values())
            .sort((a, b) => b.updatedAt - a.updatedAt);
    }

    private async loadConversations(): Promise<void> {
        const checkpoints = await this.checkpointService.listCheckpoints();

        for (const checkpoint of checkpoints) {
            const conversation = this.checkpointToConversation(checkpoint);
            this.conversations.set(conversation.id, conversation);
        }
    }

    private async saveConversation(conversation: Conversation): Promise<void> {
        await this.checkpointService.saveCheckpoint(
            conversation.id,
            this.conversationToCheckpoint(conversation)
        );
    }

    private checkpointToConversation(checkpoint: any): Conversation {
        // Convert checkpoint format to Conversation
        return {
            id: checkpoint.id,
            title: checkpoint.metadata?.title || 'Untitled',
            messages: checkpoint.channel_values?.messages || [],
            createdAt: checkpoint.metadata?.createdAt || Date.now(),
            updatedAt: checkpoint.metadata?.updatedAt || Date.now(),
        };
    }

    private conversationToCheckpoint(conversation: Conversation): any {
        // Convert Conversation to checkpoint format
        return {
            id: conversation.id,
            channel_values: {
                messages: conversation.messages,
            },
            metadata: {
                title: conversation.title,
                createdAt: conversation.createdAt,
                updatedAt: conversation.updatedAt,
            },
        };
    }

    private generateId(): string {
        return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
```

**Update ChatView to use ConversationManager:**

```typescript
export class ChatView extends ItemView {
    private conversationManager: ConversationManager;
    private agent: AgentGraph;

    async onOpen() {
        this.conversationManager = new ConversationManager(
            this.plugin.checkpointService
        );

        // Start with existing conversation or create new
        let conversation = this.conversationManager.getCurrentConversation();
        if (!conversation) {
            conversation = this.conversationManager.createConversation();
        }

        this.renderConversation(conversation);
    }

    private async handleSendMessage() {
        const userMessage = this.inputEl.value.trim();
        if (!userMessage) return;

        try {
            // Add to conversation
            this.conversationManager.addMessage(
                new HumanMessage(userMessage)
            );

            // Get response from agent
            const response = await this.agent.invoke(userMessage);

            // Add to conversation
            this.conversationManager.addMessage(
                new AIMessage(response)
            );

            // Update UI
            this.renderConversation(
                this.conversationManager.getCurrentConversation()!
            );

        } catch (error) {
            this.handleError(error);
        }
    }
}
```

---

### 4.3 Remove ChatService Duplication

**Problem:** Both ChatService and AgentGraph call Anthropic API.

**Solution:** Use only AgentGraph for all AI interactions.

#### Implementation

1. **Delete** `src/ChatService.ts` entirely
2. Update all references to use `AgentGraph` instead
3. Simplify main.ts to only initialize AgentGraph

**File:** `src/main.ts` (updated)

```typescript
export default class ObsidianAgentPlugin extends Plugin {
    settings: ObsidianAgentSettings;
    vaultService: VaultService;
    agent: AgentGraph;
    checkpointService: CheckpointService;

    async onload() {
        await this.loadSettings();

        // Initialize services
        this.vaultService = new VaultService(this.app.vault, this.app.metadataCache);
        this.checkpointService = new CheckpointService(this.app.vault);

        // Single AI service
        this.agent = new AgentGraph(this.settings, this.vaultService);

        // Register view
        this.registerView(
            VIEW_TYPE_CHAT,
            (leaf) => new ChatView(leaf, this)
        );

        // Add ribbon icon
        this.addRibbonIcon('message-circle', 'Open Chat', () => {
            this.activateView();
        });

        // Settings tab
        this.addSettingTab(new ObsidianAgentSettingTab(this.app, this));
    }
}
```

---

## 5. Type Safety Improvements

### 5.1 Remove All `any` Types

**Problem:** Extensive use of `any` reduces type safety.

**Solution:** Define proper types for all data structures.

#### Implementation

**File:** `src/types.ts` (expanded)

```typescript
import { TFile } from 'obsidian';
import { BaseMessage } from '@langchain/core/messages';

// Message types
export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: number;
}

// Settings types
export interface ObsidianAgentSettings {
    apiKey: string;
    langSmithApiKey: string;
    langSmithProject: string;
    enableLangSmith: boolean;
    retentionDays: number;
    maxHistorySize: number;
    enableAutoCleanup: boolean;
}

// Vault operation types
export interface FileSearchResult {
    path: string;
    basename: string;
    score?: number;
}

export interface FileMetadata {
    path: string;
    frontmatter: Record<string, unknown> | null;
    tags: string[];
    created: number;
    modified: number;
    size: number;
}

export interface LinkInfo {
    sourcePath: string;
    targetPath: string;
    displayText?: string;
}

// Tool types
export interface ToolInput {
    query?: string;
    path?: string;
    tag?: string;
    folder?: string;
}

export interface ToolResult {
    success: boolean;
    data?: unknown;
    error?: string;
}

// Conversation types
export interface Conversation {
    id: string;
    title: string;
    messages: BaseMessage[];
    createdAt: number;
    updatedAt: number;
}

export interface Checkpoint {
    id: string;
    channel_values: {
        messages: BaseMessage[];
    };
    metadata: CheckpointMetadata;
}

export interface CheckpointMetadata {
    title: string;
    createdAt: number;
    updatedAt: number;
    version: number;
}

// Error types
export interface ErrorDetails {
    code: string;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
}

// Agent types
export interface AgentConfig {
    model: string;
    maxTokens: number;
    temperature: number;
    tools: string[];
}

export interface AgentInvocation {
    input: string;
    output: string;
    toolCalls: ToolCall[];
    duration: number;
}

export interface ToolCall {
    name: string;
    input: ToolInput;
    output: ToolResult;
    duration: number;
}
```

---

### 5.2 Add Input Validation with Zod

**Problem:** Tools don't validate inputs at runtime.

**Solution:** Use Zod schemas consistently across all tools.

#### Implementation

**File:** `src/vault/VaultTools.ts` (updated)

```typescript
import { z } from 'zod';
import { StructuredTool } from '@langchain/core/tools';
import { VaultService } from './VaultService';

// Zod schemas for validation
const SearchFilesSchema = z.object({
    query: z.string().min(1, 'Query must not be empty'),
});

const ReadFileSchema = z.object({
    path: z.string().min(1, 'Path must not be empty'),
});

const SearchContentSchema = z.object({
    query: z.string().min(1, 'Query must not be empty'),
    caseSensitive: z.boolean().optional().default(false),
});

const SearchByTagSchema = z.object({
    tag: z.string().min(1, 'Tag must not be empty').regex(/^#?[\w-]+$/, 'Invalid tag format'),
});

const ListFilesSchema = z.object({
    folder: z.string().optional().default('/'),
    recursive: z.boolean().optional().default(true),
});

// Tool implementations with validation
export class SearchFilesTool extends StructuredTool {
    name = 'search_files';
    description = 'Search for files in the vault by filename. Use partial matches.';
    schema = SearchFilesSchema;

    constructor(private vaultService: VaultService) {
        super();
    }

    async _call(input: z.infer<typeof SearchFilesSchema>): Promise<string> {
        try {
            // Input is already validated by Zod
            const results = await this.vaultService.searchFiles(input.query);

            if (results.length === 0) {
                return `No files found matching "${input.query}"`;
            }

            return JSON.stringify(results, null, 2);

        } catch (error) {
            throw new AgentError(
                `Failed to search files: ${error.message}`,
                ErrorCode.VAULT_SEARCH_ERROR,
                { input, error: error.message }
            );
        }
    }
}

export class ReadFileTool extends StructuredTool {
    name = 'read_file';
    description = 'Read the contents of a specific file in the vault.';
    schema = ReadFileSchema;

    constructor(private vaultService: VaultService) {
        super();
    }

    async _call(input: z.infer<typeof ReadFileSchema>): Promise<string> {
        try {
            const content = await this.vaultService.readFile(input.path);
            return content;

        } catch (error) {
            throw new AgentError(
                `Failed to read file: ${error.message}`,
                ErrorCode.VAULT_READ_ERROR,
                { input, error: error.message }
            );
        }
    }
}

// Export factory function
export function createVaultTools(vaultService: VaultService): StructuredTool[] {
    return [
        new SearchFilesTool(vaultService),
        new ReadFileTool(vaultService),
        new SearchContentTool(vaultService),
        new SearchByTagTool(vaultService),
        new ListFilesTool(vaultService),
        new GetMetadataTool(vaultService),
        new GetBacklinksTool(vaultService),
        new GetOutgoingLinksTool(vaultService),
    ];
}
```

---

### 5.3 Type-Safe VaultService Returns

**Problem:** VaultService methods return untyped objects.

**Solution:** Define return types for all methods.

#### Implementation

**File:** `src/vault/VaultService.ts` (updated)

```typescript
import { FileSearchResult, FileMetadata, LinkInfo } from '../types';

export class VaultService {
    constructor(
        private vault: Vault,
        private metadataCache: MetadataCache
    ) {}

    async searchFiles(query: string): Promise<FileSearchResult[]> {
        const files = this.vault.getMarkdownFiles();
        const lowerQuery = query.toLowerCase();

        return files
            .filter(file =>
                file.basename.toLowerCase().includes(lowerQuery) ||
                file.path.toLowerCase().includes(lowerQuery)
            )
            .map(file => ({
                path: file.path,
                basename: file.basename,
            }));
    }

    async readFile(path: string): Promise<string> {
        const file = this.vault.getAbstractFileByPath(path);

        if (!file) {
            throw new AgentError(
                `File not found: ${path}`,
                ErrorCode.VAULT_FILE_NOT_FOUND,
                { path }
            );
        }

        if (!(file instanceof TFile)) {
            throw new AgentError(
                `Path is not a file: ${path}`,
                ErrorCode.VAULT_READ_ERROR,
                { path }
            );
        }

        try {
            return await this.vault.read(file);
        } catch (error) {
            throw new AgentError(
                `Failed to read file: ${path}`,
                ErrorCode.VAULT_READ_ERROR,
                { path, error: error.message }
            );
        }
    }

    async getFileMetadata(path: string): Promise<FileMetadata> {
        const file = this.vault.getAbstractFileByPath(path);

        if (!file || !(file instanceof TFile)) {
            throw new AgentError(
                `File not found: ${path}`,
                ErrorCode.VAULT_FILE_NOT_FOUND,
                { path }
            );
        }

        const cache = this.metadataCache.getFileCache(file);

        // Extract frontmatter
        const frontmatter = cache?.frontmatter || null;

        // Extract tags (both frontmatter and inline)
        const tags = new Set<string>();

        if (frontmatter?.tags) {
            const fmTags = Array.isArray(frontmatter.tags)
                ? frontmatter.tags
                : [frontmatter.tags];
            fmTags.forEach(tag => tags.add(String(tag)));
        }

        if (cache?.tags) {
            cache.tags.forEach(tagInfo => {
                tags.add(tagInfo.tag.replace('#', ''));
            });
        }

        return {
            path: file.path,
            frontmatter,
            tags: Array.from(tags),
            created: file.stat.ctime,
            modified: file.stat.mtime,
            size: file.stat.size,
        };
    }

    async getBacklinks(path: string): Promise<LinkInfo[]> {
        const file = this.vault.getAbstractFileByPath(path);

        if (!file || !(file instanceof TFile)) {
            throw new AgentError(
                `File not found: ${path}`,
                ErrorCode.VAULT_FILE_NOT_FOUND,
                { path }
            );
        }

        const backlinks = this.metadataCache.getBacklinksForFile(file);
        const result: LinkInfo[] = [];

        backlinks.data.forEach((refs, sourcePath) => {
            refs.forEach(ref => {
                result.push({
                    sourcePath,
                    targetPath: path,
                    displayText: ref.displayText,
                });
            });
        });

        return result;
    }

    async getOutgoingLinks(path: string): Promise<LinkInfo[]> {
        const file = this.vault.getAbstractFileByPath(path);

        if (!file || !(file instanceof TFile)) {
            throw new AgentError(
                `File not found: ${path}`,
                ErrorCode.VAULT_FILE_NOT_FOUND,
                { path }
            );
        }

        const cache = this.metadataCache.getFileCache(file);
        const result: LinkInfo[] = [];

        if (cache?.links) {
            cache.links.forEach(link => {
                result.push({
                    sourcePath: path,
                    targetPath: link.link,
                    displayText: link.displayText,
                });
            });
        }

        return result;
    }

    async listFiles(folder: string = '/', recursive: boolean = true): Promise<FileSearchResult[]> {
        const files = this.vault.getMarkdownFiles();

        return files
            .filter(file => {
                if (!recursive) {
                    const fileFolder = file.parent?.path || '/';
                    return fileFolder === folder;
                }
                return file.path.startsWith(folder === '/' ? '' : folder);
            })
            .map(file => ({
                path: file.path,
                basename: file.basename,
            }));
    }

    async searchByContent(query: string, caseSensitive: boolean = false): Promise<FileSearchResult[]> {
        const files = this.vault.getMarkdownFiles();
        const searchQuery = caseSensitive ? query : query.toLowerCase();
        const results: FileSearchResult[] = [];

        for (const file of files) {
            try {
                const content = await this.vault.read(file);
                const searchContent = caseSensitive ? content : content.toLowerCase();

                if (searchContent.includes(searchQuery)) {
                    results.push({
                        path: file.path,
                        basename: file.basename,
                    });
                }
            } catch (error) {
                // Skip files that can't be read
                console.warn(`Failed to read file ${file.path}:`, error);
            }
        }

        return results;
    }

    async searchByTag(tag: string): Promise<FileSearchResult[]> {
        const files = this.vault.getMarkdownFiles();
        const normalizedTag = tag.startsWith('#') ? tag.slice(1) : tag;
        const results: FileSearchResult[] = [];

        for (const file of files) {
            try {
                const metadata = await this.getFileMetadata(file.path);

                if (metadata.tags.includes(normalizedTag)) {
                    results.push({
                        path: file.path,
                        basename: file.basename,
                    });
                }
            } catch (error) {
                // Skip files with metadata errors
                console.warn(`Failed to get metadata for ${file.path}:`, error);
            }
        }

        return results;
    }
}
```

---

## 6. Performance Optimizations

### 6.1 Implement Streaming Responses

**Problem:** Long responses cause UI to freeze until complete.

**Solution:** Stream responses from Claude API progressively.

#### Implementation

**File:** `src/agent/AgentGraph.ts` (add streaming)

```typescript
export class AgentGraph {
    async invokeStream(
        userMessage: string,
        onChunk: (chunk: string) => void
    ): Promise<void> {
        try {
            const messages = [
                new SystemMessage(this.getSystemPrompt()),
                new HumanMessage(userMessage),
            ];

            const stream = await this.model.stream(messages, {
                tools: this.tools,
            });

            let fullResponse = '';

            for await (const chunk of stream) {
                if (chunk.content) {
                    const text = String(chunk.content);
                    fullResponse += text;
                    onChunk(text);
                }
            }

            return fullResponse;

        } catch (error) {
            throw ErrorHandler.handle(error);
        }
    }
}
```

**File:** `src/ChatView.ts` (add streaming UI)

```typescript
export class ChatView extends ItemView {
    private streamingMessageEl: HTMLElement | null = null;

    private async handleSendMessage() {
        const userMessage = this.inputEl.value.trim();
        if (!userMessage) return;

        try {
            this.setLoading(true);
            this.addMessage({ role: 'user', content: userMessage });
            this.inputEl.value = '';

            // Create placeholder for streaming response
            this.streamingMessageEl = this.createStreamingMessage();

            await this.agent.invokeStream(userMessage, (chunk) => {
                this.appendToStreamingMessage(chunk);
            });

            this.finalizeStreamingMessage();

        } catch (error) {
            this.handleError(error);
        } finally {
            this.setLoading(false);
            this.streamingMessageEl = null;
        }
    }

    private createStreamingMessage(): HTMLElement {
        const messageDiv = this.messagesEl.createDiv('chat-message assistant');
        const contentDiv = messageDiv.createDiv('message-content');
        return contentDiv;
    }

    private appendToStreamingMessage(chunk: string): void {
        if (this.streamingMessageEl) {
            this.streamingMessageEl.appendText(chunk);

            // Auto-scroll to bottom
            this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
        }
    }

    private finalizeStreamingMessage(): void {
        if (this.streamingMessageEl) {
            // Re-render with markdown
            const content = this.streamingMessageEl.getText();
            this.streamingMessageEl.empty();
            MarkdownRenderer.renderMarkdown(
                content,
                this.streamingMessageEl,
                '',
                this
            );
        }
    }
}
```

---

### 6.2 Add Pagination for Large Vaults

**Problem:** Loading entire vault into memory for searches.

**Solution:** Implement pagination and limits on search results.

#### Implementation

**File:** `src/vault/VaultService.ts` (add pagination)

```typescript
export interface SearchOptions {
    limit?: number;
    offset?: number;
    sortBy?: 'name' | 'modified' | 'created';
    sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResults<T> {
    results: T[];
    total: number;
    hasMore: boolean;
    offset: number;
    limit: number;
}

export class VaultService {
    private readonly DEFAULT_LIMIT = 50;
    private readonly MAX_LIMIT = 1000;

    async searchFiles(
        query: string,
        options: SearchOptions = {}
    ): Promise<PaginatedResults<FileSearchResult>> {
        const files = this.vault.getMarkdownFiles();
        const lowerQuery = query.toLowerCase();

        // Filter
        const filtered = files.filter(file =>
            file.basename.toLowerCase().includes(lowerQuery) ||
            file.path.toLowerCase().includes(lowerQuery)
        );

        // Sort
        const sorted = this.sortFiles(filtered, options);

        // Paginate
        const limit = Math.min(
            options.limit || this.DEFAULT_LIMIT,
            this.MAX_LIMIT
        );
        const offset = options.offset || 0;
        const paginated = sorted.slice(offset, offset + limit);

        return {
            results: paginated.map(file => ({
                path: file.path,
                basename: file.basename,
            })),
            total: filtered.length,
            hasMore: offset + limit < filtered.length,
            offset,
            limit,
        };
    }

    private sortFiles(
        files: TFile[],
        options: SearchOptions
    ): TFile[] {
        const { sortBy = 'name', sortOrder = 'asc' } = options;
        const multiplier = sortOrder === 'asc' ? 1 : -1;

        return files.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return multiplier * a.basename.localeCompare(b.basename);
                case 'modified':
                    return multiplier * (a.stat.mtime - b.stat.mtime);
                case 'created':
                    return multiplier * (a.stat.ctime - b.stat.ctime);
                default:
                    return 0;
            }
        });
    }
}
```

**Update Tools to use pagination:**

```typescript
const SearchFilesSchema = z.object({
    query: z.string().min(1),
    limit: z.number().min(1).max(100).optional().default(20),
    offset: z.number().min(0).optional().default(0),
});

export class SearchFilesTool extends StructuredTool {
    async _call(input: z.infer<typeof SearchFilesSchema>): Promise<string> {
        const results = await this.vaultService.searchFiles(input.query, {
            limit: input.limit,
            offset: input.offset,
        });

        if (results.total === 0) {
            return `No files found matching "${input.query}"`;
        }

        const response = {
            files: results.results,
            total: results.total,
            showing: results.results.length,
            hasMore: results.hasMore,
        };

        return JSON.stringify(response, null, 2);
    }
}
```

---

### 6.3 Convert to Async Operations

**Problem:** Synchronous operations block UI thread.

**Solution:** Use async/await throughout and add loading indicators.

#### Implementation

**File:** `src/ChatView.ts` (async handling)

```typescript
export class ChatView extends ItemView {
    private loadingQueue: Set<string> = new Set();

    private async handleSendMessage() {
        const operationId = `msg_${Date.now()}`;
        this.loadingQueue.add(operationId);

        try {
            this.updateLoadingState();

            // All operations are now async
            await this.processMessage();

        } finally {
            this.loadingQueue.delete(operationId);
            this.updateLoadingState();
        }
    }

    private updateLoadingState(): void {
        const isLoading = this.loadingQueue.size > 0;
        this.inputEl.disabled = isLoading;
        this.sendButton.disabled = isLoading;

        if (isLoading) {
            this.loadingIndicator.style.display = 'block';
        } else {
            this.loadingIndicator.style.display = 'none';
        }
    }

    private async processMessage(): Promise<void> {
        // Yield to event loop
        await new Promise(resolve => setTimeout(resolve, 0));

        // Process message
        const response = await this.agent.invoke(this.inputEl.value);

        // Yield again before UI update
        await new Promise(resolve => setTimeout(resolve, 0));

        this.addMessage({ role: 'assistant', content: response });
    }
}
```

---

### 6.4 Add Caching for Repeated Operations

**Problem:** Repeatedly searching same content or reading same files.

**Solution:** Implement in-memory cache with TTL.

#### Implementation

**File:** `src/utils/Cache.ts` (new)

```typescript
export interface CacheEntry<T> {
    value: T;
    timestamp: number;
    ttl: number;
}

export class Cache<T> {
    private cache: Map<string, CacheEntry<T>> = new Map();
    private readonly defaultTTL: number;

    constructor(defaultTTL: number = 60000) { // 1 minute default
        this.defaultTTL = defaultTTL;
    }

    set(key: string, value: T, ttl?: number): void {
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL,
        });
    }

    get(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        const age = Date.now() - entry.timestamp;

        if (age > entry.ttl) {
            this.cache.delete(key);
            return null;
        }

        return entry.value;
    }

    has(key: string): boolean {
        return this.get(key) !== null;
    }

    clear(): void {
        this.cache.clear();
    }

    prune(): void {
        const now = Date.now();

        for (const [key, entry] of this.cache.entries()) {
            const age = now - entry.timestamp;
            if (age > entry.ttl) {
                this.cache.delete(key);
            }
        }
    }
}
```

**Usage in VaultService:**

```typescript
export class VaultService {
    private fileCache = new Cache<string>(300000); // 5 minutes
    private searchCache = new Cache<FileSearchResult[]>(60000); // 1 minute

    async readFile(path: string): Promise<string> {
        // Check cache first
        const cached = this.fileCache.get(path);
        if (cached !== null) {
            return cached;
        }

        // Read from vault
        const file = this.vault.getAbstractFileByPath(path);
        if (!file || !(file instanceof TFile)) {
            throw new Error(`File not found: ${path}`);
        }

        const content = await this.vault.read(file);

        // Cache the result
        this.fileCache.set(path, content);

        return content;
    }

    async searchFiles(query: string, options: SearchOptions = {}): Promise<PaginatedResults<FileSearchResult>> {
        const cacheKey = `search:${query}:${JSON.stringify(options)}`;

        // Check cache
        const cached = this.searchCache.get(cacheKey);
        if (cached !== null) {
            return cached;
        }

        // Perform search
        const results = await this.performSearch(query, options);

        // Cache results
        this.searchCache.set(cacheKey, results);

        return results;
    }

    clearCache(): void {
        this.fileCache.clear();
        this.searchCache.clear();
    }
}
```

---

## 7. Documentation Updates

### 7.1 Restore DEVELOPMENT.md

**File:** `docs/DEVELOPMENT.md` (recreate)

```markdown
# Development Guide

This guide will help you set up the development environment and contribute to the Obsidian Agent plugin.

## Prerequisites

- Node.js 16+ and npm
- Obsidian desktop app (for testing)
- Git
- TypeScript knowledge
- Familiarity with Obsidian plugin API

## Setup

### 1. Clone the Repository

\`\`\`bash
git clone https://github.com/yourusername/obsidian-agent.git
cd obsidian-agent
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Get API Keys

- **Anthropic API Key**: Get from [console.anthropic.com](https://console.anthropic.com)
- **LangSmith API Key** (optional): Get from [smith.langchain.com](https://smith.langchain.com)

### 4. Configure Development Vault

Create a test vault in Obsidian or use an existing one:

\`\`\`bash
# Link the plugin to your test vault
ln -s $(pwd) "/path/to/your/vault/.obsidian/plugins/obsidian-agent"
\`\`\`

Or manually copy files:

\`\`\`bash
mkdir -p "/path/to/your/vault/.obsidian/plugins/obsidian-agent"
cp manifest.json "/path/to/your/vault/.obsidian/plugins/obsidian-agent/"
\`\`\`

## Development Workflow

### Watch Mode

Run the development build in watch mode:

\`\`\`bash
npm run dev
\`\`\`

This will automatically rebuild on file changes.

### Testing Changes

1. Make code changes
2. Wait for automatic rebuild
3. In Obsidian: Cmd/Ctrl + R to reload the plugin
4. Test your changes in the chat interface

### Debugging

#### Console Logging

Use `console.log()` for debugging. Open Obsidian's developer console:
- Mac: Cmd + Option + I
- Windows/Linux: Ctrl + Shift + I

#### Breakpoints

1. Add `debugger;` statement in code
2. Open developer console
3. Trigger the code path
4. Inspector will pause at breakpoint

#### LangSmith Tracing

Enable LangSmith in settings to trace:
- Agent decisions
- Tool calls
- Token usage
- Execution time

## Running Tests

### Run All Tests

\`\`\`bash
npm test
\`\`\`

### Watch Mode

\`\`\`bash
npm run test:watch
\`\`\`

### Coverage Report

\`\`\`bash
npm run test:coverage
\`\`\`

### UI Test Runner

\`\`\`bash
npm run test:ui
\`\`\`

## Project Structure

\`\`\`
obsidian-agent/
├── src/
│   ├── main.ts                 # Plugin entry point
│   ├── ChatView.ts             # Chat UI component
│   ├── settings.ts             # Settings UI
│   ├── types.ts                # TypeScript types
│   ├── agent/
│   │   ├── AgentGraph.ts       # LangGraph agent
│   │   └── AgentState.ts       # Agent state schema
│   ├── vault/
│   │   ├── VaultService.ts     # Vault operations
│   │   └── VaultTools.ts       # LangChain tools
│   ├── checkpoint/
│   │   └── CheckpointService.ts # Persistence
│   ├── errors/
│   │   └── ErrorHandler.ts     # Error handling
│   └── utils/
│       ├── Cache.ts            # Caching utilities
│       └── RateLimiter.ts      # Rate limiting
├── docs/                       # Documentation
├── styles.css                  # Plugin styles
├── manifest.json               # Plugin metadata
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
└── vitest.config.ts           # Test config
\`\`\`

## Code Style

### TypeScript

- Use strict mode
- No `any` types
- Explicit return types for functions
- Prefer interfaces over type aliases

### Naming Conventions

- Classes: PascalCase
- Functions/methods: camelCase
- Constants: UPPER_SNAKE_CASE
- Interfaces: PascalCase with 'I' prefix (optional)

### Example

\`\`\`typescript
export class VaultService {
    private readonly MAX_RESULTS = 100;

    async searchFiles(query: string): Promise<FileSearchResult[]> {
        // Implementation
    }
}
\`\`\`

## Common Tasks

### Adding a New Tool

1. Define Zod schema in `VaultTools.ts`
2. Create tool class extending `StructuredTool`
3. Implement `_call()` method
4. Add to `createVaultTools()` factory
5. Write tests in `VaultTools.test.ts`

### Adding a New Setting

1. Update `ObsidianAgentSettings` interface in `types.ts`
2. Update `DEFAULT_SETTINGS` in `settings.ts`
3. Add UI control in `ObsidianAgentSettingTab`
4. Use setting in relevant code

### Adding Error Handling

1. Add error code to `ErrorCode` enum
2. Handle in `ErrorHandler.handle()`
3. Add user-friendly message in `ErrorHandler.getUserMessage()`
4. Throw `AgentError` from code

## Troubleshooting

### Plugin Not Loading

- Check manifest.json is in plugin folder
- Verify minAppVersion compatibility
- Check developer console for errors
- Ensure main.js was built

### API Errors

- Verify API key is correct
- Check network connectivity
- Look for rate limiting messages
- Enable LangSmith for detailed traces

### Type Errors

- Run `npm run build` to see all errors
- Check tsconfig.json is correct
- Verify all imports are typed

### Tests Failing

- Ensure test environment is set up
- Check mocks are configured correctly
- Verify Obsidian API mocks are complete

## Contributing

### Before Submitting PR

1. Run tests: `npm test`
2. Check types: `npm run build`
3. Format code
4. Update documentation
5. Add tests for new features

### PR Guidelines

- One feature/fix per PR
- Include tests
- Update docs
- Follow code style
- Write clear commit messages

## Resources

- [Obsidian Plugin API](https://github.com/obsidianmd/obsidian-api)
- [LangChain Documentation](https://js.langchain.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Getting Help

- File issues on GitHub
- Check existing issues and PRs
- Read documentation thoroughly
- Ask in Obsidian developer Discord
\`\`\`

---

### 7.2 Add API Documentation

**File:** `docs/API.md` (new)

```markdown
# API Documentation

## VaultService

Service for interacting with the Obsidian vault (read-only operations).

### Constructor

\`\`\`typescript
constructor(vault: Vault, metadataCache: MetadataCache)
\`\`\`

### Methods

#### searchFiles

Search for files by name or path.

\`\`\`typescript
async searchFiles(
    query: string,
    options?: SearchOptions
): Promise<PaginatedResults<FileSearchResult>>
\`\`\`

**Parameters:**
- `query`: Search string (case-insensitive)
- `options`: Optional search options
  - `limit`: Max results per page (default: 50, max: 1000)
  - `offset`: Pagination offset (default: 0)
  - `sortBy`: Sort field ('name' | 'modified' | 'created')
  - `sortOrder`: Sort direction ('asc' | 'desc')

**Returns:**
```typescript
{
    results: FileSearchResult[],
    total: number,
    hasMore: boolean,
    offset: number,
    limit: number
}
```

**Example:**
```typescript
const results = await vaultService.searchFiles('meeting', {
    limit: 20,
    sortBy: 'modified',
    sortOrder: 'desc'
});
```

#### readFile

Read the contents of a file.

```typescript
async readFile(path: string): Promise<string>
```

**Parameters:**
- `path`: Relative path to file in vault

**Returns:** File contents as string

**Throws:** `AgentError` if file not found or read fails

**Example:**
```typescript
const content = await vaultService.readFile('notes/meeting.md');
```

#### searchByContent

Search for files containing specific text.

```typescript
async searchByContent(
    query: string,
    caseSensitive?: boolean
): Promise<FileSearchResult[]>
```

**Parameters:**
- `query`: Text to search for
- `caseSensitive`: Whether search is case-sensitive (default: false)

**Returns:** Array of matching files

**Example:**
```typescript
const results = await vaultService.searchByContent('project deadline');
```

#### searchByTag

Search for files with a specific tag.

```typescript
async searchByTag(tag: string): Promise<FileSearchResult[]>
```

**Parameters:**
- `tag`: Tag to search for (with or without `#`)

**Returns:** Array of matching files

**Example:**
```typescript
const results = await vaultService.searchByTag('project');
// or
const results = await vaultService.searchByTag('#project');
```

#### getFileMetadata

Get metadata for a specific file.

```typescript
async getFileMetadata(path: string): Promise<FileMetadata>
```

**Parameters:**
- `path`: Relative path to file

**Returns:**
```typescript
{
    path: string,
    frontmatter: Record<string, unknown> | null,
    tags: string[],
    created: number,
    modified: number,
    size: number
}
```

**Example:**
```typescript
const metadata = await vaultService.getFileMetadata('notes/meeting.md');
console.log(metadata.tags); // ['meeting', 'project']
```

#### getBacklinks

Get all files that link to a specific file.

```typescript
async getBacklinks(path: string): Promise<LinkInfo[]>
```

**Parameters:**
- `path`: Relative path to file

**Returns:** Array of link information

**Example:**
```typescript
const backlinks = await vaultService.getBacklinks('notes/project.md');
```

#### getOutgoingLinks

Get all links from a specific file.

```typescript
async getOutgoingLinks(path: string): Promise<LinkInfo[]>
```

**Parameters:**
- `path`: Relative path to file

**Returns:** Array of link information

**Example:**
```typescript
const links = await vaultService.getOutgoingLinks('notes/index.md');
```

#### listFiles

List all files in a folder.

```typescript
async listFiles(
    folder?: string,
    recursive?: boolean
): Promise<FileSearchResult[]>
```

**Parameters:**
- `folder`: Folder path (default: '/')
- `recursive`: Include subfolders (default: true)

**Returns:** Array of files

**Example:**
```typescript
const files = await vaultService.listFiles('projects', false);
```

---

## AgentGraph

LangGraph-based agent for conversational AI with tool use.

### Constructor

```typescript
constructor(
    settings: ObsidianAgentSettings,
    vaultService: VaultService
)
```

### Methods

#### invoke

Send a message to the agent and get a response.

```typescript
async invoke(userMessage: string): Promise<string>
```

**Parameters:**
- `userMessage`: User's message text

**Returns:** Agent's response text

**Throws:** `AgentError` on failure

**Example:**
```typescript
const response = await agent.invoke('Find my meeting notes from last week');
```

#### invokeStream

Send a message and receive streaming response.

```typescript
async invokeStream(
    userMessage: string,
    onChunk: (chunk: string) => void
): Promise<void>
```

**Parameters:**
- `userMessage`: User's message text
- `onChunk`: Callback for each response chunk

**Example:**
```typescript
await agent.invokeStream('Summarize this note', (chunk) => {
    console.log(chunk);
});
```

---

## ConversationManager

Manages conversation threads and persistence.

### Constructor

```typescript
constructor(checkpointService: CheckpointService)
```

### Methods

#### getCurrentConversation

Get the active conversation.

```typescript
getCurrentConversation(): Conversation | null
```

**Returns:** Current conversation or null

#### createConversation

Create a new conversation thread.

```typescript
createConversation(title?: string): Conversation
```

**Parameters:**
- `title`: Optional conversation title (default: 'New Chat')

**Returns:** Created conversation

#### addMessage

Add a message to the current conversation.

```typescript
addMessage(message: BaseMessage): void
```

**Parameters:**
- `message`: LangChain message object

**Throws:** Error if no active conversation

#### switchConversation

Switch to a different conversation.

```typescript
switchConversation(id: string): Conversation
```

**Parameters:**
- `id`: Conversation ID

**Returns:** The conversation

**Throws:** Error if conversation not found

#### deleteConversation

Delete a conversation.

```typescript
deleteConversation(id: string): void
```

**Parameters:**
- `id`: Conversation ID

#### listConversations

Get all conversations sorted by update time.

```typescript
listConversations(): Conversation[]
```

**Returns:** Array of conversations

---

## ErrorHandler

Centralized error handling and user messaging.

### Methods

#### handle

Convert any error to AgentError.

```typescript
static handle(error: unknown): AgentError
```

**Parameters:**
- `error`: Any error object

**Returns:** Structured `AgentError`

**Example:**
```typescript
try {
    await someOperation();
} catch (error) {
    const agentError = ErrorHandler.handle(error);
    console.error(agentError.code, agentError.message);
}
```

#### isRetryable

Check if an error can be retried.

```typescript
static isRetryable(error: AgentError): boolean
```

**Parameters:**
- `error`: Agent error

**Returns:** True if retryable

#### getUserMessage

Get user-friendly error message.

```typescript
static getUserMessage(error: AgentError): string
```

**Parameters:**
- `error`: Agent error

**Returns:** Formatted message for user

---

## Types

### FileSearchResult

```typescript
interface FileSearchResult {
    path: string;
    basename: string;
    score?: number;
}
```

### FileMetadata

```typescript
interface FileMetadata {
    path: string;
    frontmatter: Record<string, unknown> | null;
    tags: string[];
    created: number;
    modified: number;
    size: number;
}
```

### LinkInfo

```typescript
interface LinkInfo {
    sourcePath: string;
    targetPath: string;
    displayText?: string;
}
```

### Conversation

```typescript
interface Conversation {
    id: string;
    title: string;
    messages: BaseMessage[];
    createdAt: number;
    updatedAt: number;
}
```

### AgentError

```typescript
class AgentError extends Error {
    code: ErrorCode;
    details?: Record<string, unknown>;
    isRetryable: boolean;
}
```

### ErrorCode

```typescript
enum ErrorCode {
    API_KEY_INVALID,
    API_RATE_LIMIT,
    API_NETWORK,
    API_TIMEOUT,
    API_SERVER_ERROR,
    VAULT_FILE_NOT_FOUND,
    VAULT_READ_ERROR,
    VAULT_SEARCH_ERROR,
    AGENT_INITIALIZATION_ERROR,
    AGENT_EXECUTION_ERROR,
    TOOL_EXECUTION_ERROR,
    CHECKPOINT_SAVE_ERROR,
    CHECKPOINT_LOAD_ERROR,
}
```
```

---

### 7.3 Add User Guide

**File:** `docs/USER_GUIDE.md` (new)

```markdown
# User Guide

Complete guide to using the Obsidian Agent plugin.

## Table of Contents

1. [Installation](#installation)
2. [Getting Started](#getting-started)
3. [Features](#features)
4. [Using the Agent](#using-the-agent)
5. [Managing Conversations](#managing-conversations)
6. [Settings](#settings)
7. [Tips & Tricks](#tips--tricks)
8. [Troubleshooting](#troubleshooting)

## Installation

### From Obsidian Community Plugins

1. Open Obsidian Settings
2. Navigate to Community Plugins
3. Click "Browse" and search for "Obsidian Agent"
4. Click "Install" then "Enable"

### Manual Installation

1. Download the latest release from GitHub
2. Extract files to `<vault>/.obsidian/plugins/obsidian-agent/`
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

## Getting Started

### 1. Get an API Key

1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key
5. Copy the key (starts with `sk-ant-`)

### 2. Configure the Plugin

1. Open Obsidian Settings
2. Navigate to Obsidian Agent
3. Paste your API key in the "Anthropic API Key" field
4. Click outside the field to save

### 3. Open the Chat

- Click the message icon in the left ribbon, or
- Use the command palette: Cmd/Ctrl + P → "Open Chat"

### 4. Start Chatting

Type your message and press Enter or click Send!

## Features

### AI-Powered Assistance

- **General Q&A**: Ask Claude anything
- **Vault Search**: Find notes by name, content, or tags
- **Note Reading**: Read and analyze your notes
- **Note Analysis**: Get summaries, insights, and connections

### Vault Integration

The agent can:
- Search files by name
- Search content across all notes
- Find notes by tags
- Read specific files
- Get note metadata
- Find backlinks
- List files in folders

### Conversation Management

- **Multiple Threads**: Create separate conversations
- **Persistent History**: All conversations saved automatically
- **Easy Switching**: Switch between conversations anytime

### Privacy & Security

- **Read-Only Access**: Agent cannot modify your notes (V1)
- **Local Storage**: Conversations stored locally in your vault
- **No Cloud**: Only API calls to Anthropic (for AI responses)

## Using the Agent

### Basic Queries

```
You: Hello!
Agent: Hello! How can I help you today?

You: What can you do?
Agent: I can help you search and read notes in your vault...
```

### Searching Files

```
You: Find my meeting notes
Agent: I found 5 meeting notes:
1. meetings/team-standup-2024-01-15.md
2. meetings/project-review.md
...

You: Read the team standup note
Agent: Here's the content of that note...
[Full note content]
```

### Searching by Content

```
You: Find notes mentioning "project deadline"
Agent: I found 3 notes containing "project deadline":
1. projects/q1-planning.md
2. meetings/project-kickoff.md
...
```

### Searching by Tags

```
You: Show me all notes tagged with #important
Agent: I found 7 notes with the #important tag:
1. notes/critical-decisions.md
2. projects/client-requirements.md
...
```

### Complex Queries

```
You: Find recent meeting notes about Project X and summarize the key decisions
Agent: I'll search for meeting notes about Project X...
[Searches and reads notes]

Based on the meeting notes, here are the key decisions:
1. Launch date moved to Q2
2. Budget approved for $50k
3. Sarah assigned as project lead
...
```

### Getting Metadata

```
You: When was the project-plan.md note last modified?
Agent: The note "project-plan.md" was last modified on January 15, 2024 at 3:42 PM.
It has the following tags: #project, #planning
Frontmatter: priority: high, status: active
```

### Finding Connections

```
You: What notes link to my project overview?
Agent: The following notes link to "project-overview.md":
1. team/roadmap.md
2. meetings/kickoff.md
3. notes/ideas.md
```

## Managing Conversations

### Creating New Conversations

1. Click the "New Chat" button
2. Or use command palette: "New Conversation"

### Switching Conversations

1. Click the conversation dropdown
2. Select the conversation you want

### Renaming Conversations

1. Right-click conversation in list
2. Select "Rename"
3. Enter new name

### Deleting Conversations

1. Right-click conversation in list
2. Select "Delete"
3. Confirm deletion

**Note:** Deleted conversations cannot be recovered.

## Settings

### Anthropic API Key

Your API key for authenticating with Claude.

- **Required**: Yes
- **Format**: `sk-ant-...`
- **Storage**: Stored locally (masked in UI)

### LangSmith Integration (Optional)

For monitoring and debugging agent behavior.

- **Enable LangSmith**: Toggle tracing on/off
- **API Key**: Your LangSmith API key
- **Project**: Project name in LangSmith

### Data Management

- **Retention Days**: How long to keep conversation history (default: 30)
- **Max History Size**: Maximum messages per conversation (default: 100)
- **Auto Cleanup**: Automatically delete old conversations

## Tips & Tricks

### Best Practices

1. **Be Specific**: The more specific your query, the better the results
   - ❌ "Find notes"
   - ✅ "Find meeting notes from last week about the marketing campaign"

2. **Use Natural Language**: Talk to the agent like you would a colleague
   - "Can you help me find..." works just as well as "Search for..."

3. **Break Down Complex Tasks**: For complex queries, work step-by-step
   ```
   1. "Find all project-related notes"
   2. "Read the project roadmap"
   3. "Summarize the key milestones"
   ```

4. **Leverage Tags**: Use tags to organize notes for easier searching
   - `#meeting`, `#project`, `#idea`, `#important`

### Useful Queries

**Daily Notes**
```
- "Show my note from yesterday"
- "What did I write about today?"
```

**Project Management**
```
- "List all notes in the projects folder"
- "Find notes tagged #active"
- "What's the status of Project X?"
```

**Research**
```
- "Find notes mentioning [topic]"
- "What connections exist between [note A] and [note B]?"
- "Summarize my notes about [topic]"
```

**Discovery**
```
- "What are my most recent notes?"
- "Show notes I haven't touched in a while"
- "Find orphaned notes (no backlinks)"
```

## Troubleshooting

### Plugin Not Loading

**Symptoms:** Plugin doesn't appear in Community Plugins

**Solutions:**
1. Ensure plugin is in correct folder: `<vault>/.obsidian/plugins/obsidian-agent/`
2. Check that manifest.json exists in plugin folder
3. Restart Obsidian
4. Check developer console (Cmd/Ctrl + Opt/Alt + I) for errors

### API Errors

**Symptoms:** "API key invalid" or "Rate limit exceeded"

**Solutions:**
1. Verify API key is correct (starts with `sk-ant-`)
2. Check API key has sufficient credits at console.anthropic.com
3. Wait a moment if rate limited
4. Check internet connection

### Search Not Finding Files

**Symptoms:** Agent says "No files found" but they exist

**Solutions:**
1. Check spelling and try partial matches
2. Use content search instead: "Search for content containing..."
3. Try searching by tag: "Find notes tagged with..."
4. Verify files are markdown (.md)

### Slow Responses

**Symptoms:** Agent takes long time to respond

**Solutions:**
1. Check internet connection
2. Large vaults may take longer to search
3. Consider using more specific queries
4. Enable LangSmith to diagnose performance

### Conversation Not Saving

**Symptoms:** Conversations disappear after reload

**Solutions:**
1. Check vault permissions (plugin needs write access)
2. Verify `.obsidian/plugins/obsidian-agent/checkpoints/` exists
3. Check disk space
4. Review developer console for errors

### Memory Issues

**Symptoms:** Obsidian slows down or crashes

**Solutions:**
1. Reduce "Max History Size" in settings
2. Delete old conversations
3. Enable "Auto Cleanup" in settings
4. Restart Obsidian

## Getting Help

### Resources

- **Documentation**: [GitHub Wiki](https://github.com/yourusername/obsidian-agent/wiki)
- **Bug Reports**: [GitHub Issues](https://github.com/yourusername/obsidian-agent/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/obsidian-agent/discussions)

### Reporting Bugs

When reporting bugs, include:
1. Obsidian version
2. Plugin version
3. Steps to reproduce
4. Error messages from developer console
5. Screenshot if applicable

### Feature Requests

Have an idea? Open a GitHub Discussion or Issue!

Please include:
1. Use case description
2. How it would work
3. Why it would be useful

## Privacy & Data

### What Data is Stored

- **Locally**: Conversation history, settings
- **Anthropic**: Messages sent to Claude API
- **LangSmith** (optional): Traces and metrics

### What Data is NOT Stored

- Your API keys (except locally, encrypted)
- Your notes (except when sent to Claude for context)
- User analytics or telemetry

### Data Deletion

To delete all plugin data:
1. Disable plugin
2. Delete `.obsidian/plugins/obsidian-agent/` folder
3. Remove plugin settings from `.obsidian/plugins.json`

## Changelog

See [CHANGELOG.md](../CHANGELOG.md) for version history.

## License

MIT License - see [LICENSE](../LICENSE)
```

---

## 8. Developer Experience

### 8.1 Add Logging System

**File:** `src/utils/Logger.ts` (new)

```typescript
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

export interface LogEntry {
    timestamp: number;
    level: LogLevel;
    message: string;
    context?: string;
    data?: Record<string, unknown>;
}

export class Logger {
    private static instance: Logger;
    private logLevel: LogLevel = LogLevel.INFO;
    private logs: LogEntry[] = [];
    private readonly MAX_LOGS = 1000;

    private constructor() {}

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    debug(message: string, context?: string, data?: Record<string, unknown>): void {
        this.log(LogLevel.DEBUG, message, context, data);
    }

    info(message: string, context?: string, data?: Record<string, unknown>): void {
        this.log(LogLevel.INFO, message, context, data);
    }

    warn(message: string, context?: string, data?: Record<string, unknown>): void {
        this.log(LogLevel.WARN, message, context, data);
    }

    error(message: string, context?: string, data?: Record<string, unknown>): void {
        this.log(LogLevel.ERROR, message, context, data);
    }

    private log(
        level: LogLevel,
        message: string,
        context?: string,
        data?: Record<string, unknown>
    ): void {
        if (level < this.logLevel) {
            return;
        }

        const entry: LogEntry = {
            timestamp: Date.now(),
            level,
            message,
            context,
            data,
        };

        this.logs.push(entry);

        // Trim old logs
        if (this.logs.length > this.MAX_LOGS) {
            this.logs = this.logs.slice(-this.MAX_LOGS);
        }

        // Console output
        const prefix = context ? `[${context}]` : '';
        const formattedMessage = `${prefix} ${message}`;

        switch (level) {
            case LogLevel.DEBUG:
                console.debug(formattedMessage, data);
                break;
            case LogLevel.INFO:
                console.info(formattedMessage, data);
                break;
            case LogLevel.WARN:
                console.warn(formattedMessage, data);
                break;
            case LogLevel.ERROR:
                console.error(formattedMessage, data);
                break;
        }
    }

    getLogs(level?: LogLevel): LogEntry[] {
        if (level === undefined) {
            return [...this.logs];
        }
        return this.logs.filter(log => log.level >= level);
    }

    clear(): void {
        this.logs = [];
    }

    exportLogs(): string {
        return JSON.stringify(this.logs, null, 2);
    }
}

// Global logger instance
export const logger = Logger.getInstance();
```

**Usage throughout codebase:**

```typescript
import { logger } from './utils/Logger';

export class AgentGraph {
    async invoke(userMessage: string): Promise<string> {
        logger.info('Agent invocation started', 'AgentGraph', {
            messageLength: userMessage.length,
        });

        try {
            const response = await this.callAgent(userMessage);

            logger.debug('Agent response received', 'AgentGraph', {
                responseLength: response.length,
            });

            return response;

        } catch (error) {
            logger.error('Agent invocation failed', 'AgentGraph', {
                error: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }
}
```

---

### 8.2 Add Debug Panel

**File:** `src/DebugView.ts` (new)

```typescript
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { logger, LogLevel } from './utils/Logger';
import type ObsidianAgentPlugin from './main';

export const VIEW_TYPE_DEBUG = 'obsidian-agent-debug';

export class DebugView extends ItemView {
    private plugin: ObsidianAgentPlugin;
    private contentEl: HTMLElement;
    private logsEl: HTMLElement;
    private filterLevel: LogLevel = LogLevel.DEBUG;
    private autoRefresh: number | null = null;

    constructor(leaf: WorkspaceLeaf, plugin: ObsidianAgentPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return VIEW_TYPE_DEBUG;
    }

    getDisplayText(): string {
        return 'Agent Debug';
    }

    getIcon(): string {
        return 'bug';
    }

    async onOpen() {
        this.contentEl = this.containerEl.children[1] as HTMLElement;
        this.contentEl.empty();
        this.contentEl.addClass('obsidian-agent-debug');

        this.renderToolbar();
        this.renderLogs();

        // Auto-refresh every 2 seconds
        this.autoRefresh = window.setInterval(() => {
            this.renderLogs();
        }, 2000);
    }

    async onClose() {
        if (this.autoRefresh) {
            clearInterval(this.autoRefresh);
        }
    }

    private renderToolbar(): void {
        const toolbar = this.contentEl.createDiv('debug-toolbar');

        // Level filter
        toolbar.createEl('span', { text: 'Log Level: ' });

        const select = toolbar.createEl('select');
        select.createEl('option', { text: 'DEBUG', value: '0' });
        select.createEl('option', { text: 'INFO', value: '1' });
        select.createEl('option', { text: 'WARN', value: '2' });
        select.createEl('option', { text: 'ERROR', value: '3' });

        select.value = String(this.filterLevel);
        select.addEventListener('change', () => {
            this.filterLevel = parseInt(select.value) as LogLevel;
            this.renderLogs();
        });

        // Clear button
        const clearBtn = toolbar.createEl('button', { text: 'Clear Logs' });
        clearBtn.addEventListener('click', () => {
            logger.clear();
            this.renderLogs();
        });

        // Export button
        const exportBtn = toolbar.createEl('button', { text: 'Export' });
        exportBtn.addEventListener('click', () => {
            this.exportLogs();
        });

        // Refresh button
        const refreshBtn = toolbar.createEl('button', { text: 'Refresh' });
        refreshBtn.addEventListener('click', () => {
            this.renderLogs();
        });
    }

    private renderLogs(): void {
        if (this.logsEl) {
            this.logsEl.remove();
        }

        this.logsEl = this.contentEl.createDiv('debug-logs');

        const logs = logger.getLogs(this.filterLevel);

        if (logs.length === 0) {
            this.logsEl.createDiv('debug-empty', { text: 'No logs to display' });
            return;
        }

        // Render in reverse order (newest first)
        for (let i = logs.length - 1; i >= 0; i--) {
            const log = logs[i];
            this.renderLogEntry(log);
        }
    }

    private renderLogEntry(log: LogEntry): void {
        const entry = this.logsEl.createDiv('debug-log-entry');
        entry.addClass(`level-${LogLevel[log.level].toLowerCase()}`);

        // Timestamp
        const time = new Date(log.timestamp).toLocaleTimeString();
        entry.createDiv('log-time', { text: time });

        // Level
        entry.createDiv('log-level', { text: LogLevel[log.level] });

        // Context
        if (log.context) {
            entry.createDiv('log-context', { text: log.context });
        }

        // Message
        entry.createDiv('log-message', { text: log.message });

        // Data (expandable)
        if (log.data) {
            const dataToggle = entry.createDiv('log-data-toggle');
            dataToggle.createEl('span', { text: '▶ View Data' });

            const dataContent = entry.createDiv('log-data-content');
            dataContent.createEl('pre', {
                text: JSON.stringify(log.data, null, 2),
            });
            dataContent.style.display = 'none';

            dataToggle.addEventListener('click', () => {
                const isExpanded = dataContent.style.display === 'block';
                dataContent.style.display = isExpanded ? 'none' : 'block';
                dataToggle.querySelector('span')!.textContent =
                    isExpanded ? '▶ View Data' : '▼ Hide Data';
            });
        }
    }

    private exportLogs(): void {
        const logs = logger.exportLogs();
        const blob = new Blob([logs], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `obsidian-agent-logs-${Date.now()}.json`;
        a.click();

        URL.revokeObjectURL(url);
    }
}
```

**Styles for debug panel:**

```css
/* Add to styles.css */

.obsidian-agent-debug {
    padding: 10px;
    height: 100%;
    overflow-y: auto;
}

.debug-toolbar {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid var(--background-modifier-border);
    margin-bottom: 10px;
}

.debug-toolbar select {
    padding: 4px 8px;
}

.debug-toolbar button {
    padding: 4px 12px;
}

.debug-logs {
    font-family: monospace;
    font-size: 12px;
}

.debug-log-entry {
    display: grid;
    grid-template-columns: auto auto auto 1fr;
    gap: 10px;
    padding: 8px;
    border-bottom: 1px solid var(--background-modifier-border);
}

.debug-log-entry.level-debug {
    background: var(--background-secondary);
}

.debug-log-entry.level-info {
    background: transparent;
}

.debug-log-entry.level-warn {
    background: rgba(255, 200, 0, 0.1);
}

.debug-log-entry.level-error {
    background: rgba(255, 0, 0, 0.1);
}

.log-time {
    color: var(--text-muted);
}

.log-level {
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 3px;
}

.level-debug .log-level {
    background: var(--background-modifier-border);
}

.level-info .log-level {
    background: var(--interactive-accent);
    color: white;
}

.level-warn .log-level {
    background: orange;
    color: white;
}

.level-error .log-level {
    background: red;
    color: white;
}

.log-context {
    color: var(--text-accent);
}

.log-message {
    grid-column: 1 / -1;
}

.log-data-toggle {
    grid-column: 1 / -1;
    cursor: pointer;
    color: var(--interactive-accent);
    user-select: none;
}

.log-data-toggle:hover {
    text-decoration: underline;
}

.log-data-content {
    grid-column: 1 / -1;
    background: var(--background-primary-alt);
    padding: 10px;
    border-radius: 4px;
    overflow-x: auto;
}

.log-data-content pre {
    margin: 0;
}

.debug-empty {
    text-align: center;
    padding: 40px;
    color: var(--text-muted);
}
```

**Register debug view:**

```typescript
// In main.ts
import { DebugView, VIEW_TYPE_DEBUG } from './DebugView';

async onload() {
    // ... existing code ...

    // Register debug view
    this.registerView(
        VIEW_TYPE_DEBUG,
        (leaf) => new DebugView(leaf, this)
    );

    // Add command to open debug panel
    this.addCommand({
        id: 'open-debug',
        name: 'Open Debug Panel',
        callback: () => {
            this.activateDebugView();
        },
    });
}

async activateDebugView() {
    const { workspace } = this.app;

    let leaf = workspace.getLeavesOfType(VIEW_TYPE_DEBUG)[0];

    if (!leaf) {
        leaf = workspace.getRightLeaf(false);
        await leaf.setViewState({
            type: VIEW_TYPE_DEBUG,
            active: true,
        });
    }

    workspace.revealLeaf(leaf);
}
```

---

### 8.3 CI/CD Pipeline Setup

**File:** `.github/workflows/ci.yml` (new)

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]

    steps:
      - uses: actions/checkout@v3

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run type check
        run: npm run build -- --noEmit

      - name: Run tests
        run: npm test

      - name: Run tests with coverage
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unittests
          name: codecov-umbrella

  lint:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build plugin
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: plugin-build
          path: |
            main.js
            manifest.json
            styles.css
```

**File:** `.github/workflows/release.yml` (new)

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build plugin
        run: npm run build

      - name: Create release package
        run: |
          mkdir obsidian-agent
          cp main.js manifest.json styles.css obsidian-agent/
          zip -r obsidian-agent-${{ github.ref_name }}.zip obsidian-agent

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: obsidian-agent-${{ github.ref_name }}.zip
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Implementation Roadmap

### Phase 1: Critical Fixes (Week 1)
- [ ] Implement secure API key storage
- [ ] Add comprehensive error handling
- [ ] Create ErrorHandler and AgentError classes
- [ ] Add retry logic with exponential backoff
- [ ] Implement rate limiting
- [ ] Add LangSmith failure handling

### Phase 2: Testing Infrastructure (Week 2)
- [ ] Set up Vitest and test environment
- [ ] Write unit tests for VaultService
- [ ] Write unit tests for VaultTools
- [ ] Write integration tests for AgentGraph
- [ ] Create mock Obsidian environment
- [ ] Achieve >70% code coverage

### Phase 3: Type Safety (Week 3)
- [ ] Remove all `any` types
- [ ] Add Zod validation to all tools
- [ ] Define proper return types
- [ ] Update VaultService with typed returns
- [ ] Add runtime validation

### Phase 4: Architecture Cleanup (Week 4)
- [ ] Simplify AgentGraph implementation
- [ ] Create ConversationManager
- [ ] Delete ChatService (use only AgentGraph)
- [ ] Consolidate state management
- [ ] Reduce LangGraph complexity

### Phase 5: Performance (Week 5)
- [ ] Implement streaming responses
- [ ] Add pagination to all search operations
- [ ] Convert operations to async
- [ ] Implement caching layer
- [ ] Add loading indicators

### Phase 6: Documentation (Week 6)
- [ ] Restore and update DEVELOPMENT.md
- [ ] Create API.md documentation
- [ ] Write comprehensive USER_GUIDE.md
- [ ] Add inline code documentation
- [ ] Create example use cases

### Phase 7: Developer Experience (Week 7)
- [ ] Implement Logger system
- [ ] Create DebugView panel
- [ ] Set up CI/CD pipeline
- [ ] Add pre-commit hooks
- [ ] Create contribution guidelines

### Phase 8: Polish & Release (Week 8)
- [ ] Final testing and bug fixes
- [ ] Performance optimization
- [ ] Update README.md
- [ ] Create release notes
- [ ] Tag version 1.1.0

---

## Success Metrics

### Code Quality
- ✅ Zero `any` types
- ✅ 70%+ test coverage
- ✅ All tests passing
- ✅ No TypeScript errors

### Security
- ✅ API keys encrypted/masked
- ✅ No sensitive data leaks
- ✅ Secure error handling
- ✅ Data retention policies

### Performance
- ✅ < 2s response time for simple queries
- ✅ Streaming responses implemented
- ✅ Pagination for large results
- ✅ No UI freezing

### Developer Experience
- ✅ Complete documentation
- ✅ Easy local setup
- ✅ Debug tools available
- ✅ CI/CD pipeline running

### User Experience
- ✅ Clear error messages
- ✅ Graceful degradation
- ✅ Responsive UI
- ✅ Helpful documentation

---

## Breaking Changes

### v1.1.0

**Settings Structure:**
- Added new settings: `retentionDays`, `maxHistorySize`, `enableAutoCleanup`
- Migration: Default values applied automatically

**API Changes:**
- `VaultService` methods now return typed objects instead of `any`
- `searchFiles()` now returns `PaginatedResults` instead of array
- Tools now validate inputs with Zod schemas

**State Management:**
- Checkpoint format updated to include version
- Old checkpoints will be migrated automatically on load

**Deprecations:**
- `ChatService` removed - use `AgentGraph` instead
- Direct Anthropic SDK calls deprecated - use `AgentGraph.invoke()`

---

## Migration Guide

### For Users

No action required. The plugin will automatically:
1. Migrate old settings to new structure
2. Convert existing checkpoints to new format
3. Apply default values for new settings

### For Developers

If you've extended the plugin:

1. **Replace ChatService usage:**
   ```typescript
   // Before
   const chatService = new ChatService(settings);
   const response = await chatService.sendMessage(message);

   // After
   const agent = new AgentGraph(settings, vaultService);
   const response = await agent.invoke(message);
   ```

2. **Update VaultService calls:**
   ```typescript
   // Before
   const results: any[] = await vaultService.searchFiles(query);

   // After
   const results: PaginatedResults<FileSearchResult> =
       await vaultService.searchFiles(query, { limit: 20 });
   ```

3. **Add error handling:**
   ```typescript
   // Before
   try {
       await operation();
   } catch (error) {
       console.error(error);
   }

   // After
   try {
       await operation();
   } catch (error) {
       const agentError = ErrorHandler.handle(error);
       logger.error(agentError.message, 'MyClass', {
           code: agentError.code,
           details: agentError.details
       });
   }
   ```

---

## Appendix

### A. Dependencies to Add

```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "@types/node": "^20.0.0",
    "jsdom": "^23.0.0"
  }
}
```

### B. ESLint Configuration

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

### C. Git Hooks

**File:** `.husky/pre-commit` (create)

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run build
npm test
```

### D. Example Queries for Testing

```typescript
// Test queries for manual testing
const TEST_QUERIES = [
    // Basic queries
    "Hello",
    "What can you do?",

    // File search
    "Find my meeting notes",
    "Search for files about projects",

    // Content search
    "Find notes mentioning deadlines",
    "Search for content containing 'important'",

    // Tag search
    "Show notes tagged #todo",
    "Find all notes with #project tag",

    // Metadata
    "When was project-plan.md last modified?",
    "What tags does meeting-notes.md have?",

    // Links
    "What links to my overview note?",
    "Show me the backlinks for project.md",

    // Complex queries
    "Find recent meeting notes about Project X and summarize them",
    "Search for notes tagged #important and modified this week",
];
```

---

## Questions & Feedback

For questions about this specification:
- Open an issue on GitHub
- Create a discussion thread
- Contact the maintainers

This specification is a living document and will be updated as implementation progresses.

**Last Updated:** 2025-11-02
**Version:** 1.0.0
**Status:** Ready for Implementation
