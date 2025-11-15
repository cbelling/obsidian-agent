# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Obsidian Agent** is an Obsidian plugin that provides a LangGraph-powered AI agent with read-only vault access and persistent conversations. The agent uses the Anthropic Claude API and maintains conversation history across sessions using LangGraph's checkpoint system.

Current version: **v0.0.1** (initial development release with performance optimizations)

## Common Development Commands

### Build and Development
```bash
# Development mode (watches for changes)
npm run dev

# Production build (compiles and type-checks)
npm run build

# Build without type checking (faster)
node esbuild.config.mjs production
```

### Testing
```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific tests by pattern
npm test -- vault

# Run single test file
npm test -- VaultService.test.ts
```

### Linting
```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix
```

### LangSmith Tracing (Development)

Enable tracing to debug agent behavior:

```bash
# One-time setup: Copy example and add your API key
cp .env.example .env.local
# Edit .env.local and add your LangSmith API key from https://smith.langchain.com

# Launch Obsidian with tracing enabled
./dev-obsidian.sh

# View traces at: https://smith.langchain.com
```

See `LANGSMITH_SETUP.md` for detailed setup or `docs/development/LANGSMITH_ENVIRONMENT_SETUP.md` for troubleshooting.

### Deployment
After building, copy these files to your Obsidian test vault:
```
main.js → .obsidian/plugins/obsidian-agent/main.js
manifest.json → .obsidian/plugins/obsidian-agent/manifest.json
styles.css → .obsidian/plugins/obsidian-agent/styles.css
```

## Architecture

### High-Level Design

The plugin uses a **LangGraph-based agent architecture** with the following key components:

1. **Agent Graph** (`src/agent/AgentGraph.ts`)
   - StateGraph implementation with agent and tool nodes
   - Uses Anthropic SDK directly (not LangChain's ChatAnthropic)
   - Routing logic: agent → tools → agent → END
   - Persistent checkpointing for conversation state
   - **Streaming support** via `invokeStream()` for real-time response display

2. **Vault Service** (`src/vault/VaultService.ts`)
   - Read-only operations on the Obsidian vault
   - Search by filename, content, tags with **pagination** (default 50, max 1000)
   - File reading and metadata extraction
   - **In-memory caching** with TTL (60s for files, 30s for searches)
   - Wraps Obsidian's Vault API

3. **Checkpoint System** (`src/checkpoint/CheckpointService.ts`)
   - Implements LangGraph's Saver interface
   - Persists conversation state to disk
   - Enables conversation history across sessions
   - Stores checkpoints in `.obsidian/plugins/obsidian-agent/checkpoints/`

4. **Conversation Management** (`src/state/ConversationManager.ts`)
   - Thread creation, listing, deletion
   - Thread metadata management
   - Integrates with CheckpointService

5. **Error Handling** (`src/errors/`)
   - `ErrorHandler.ts`: Centralized error handling with error codes
   - `RetryHandler.ts`: Exponential backoff retry logic
   - `RateLimiter.ts`: Token bucket rate limiting for API calls

6. **Performance Layer** (`src/utils/`)
   - `Cache.ts`: Generic in-memory cache with TTL support
   - Used throughout VaultService for file content and search results
   - Automatic pruning every 5 minutes to prevent memory growth

### Critical Architectural Notes

**Mobile Support (AsyncLocalStorage Polyfill)**
- LangGraph requires `node:async_hooks` which is not available in mobile Obsidian
- **Solution**: Custom polyfill in `src/polyfills/async-hooks.ts`
- The polyfill MUST be initialized before any LangGraph imports (see `src/main.ts:10-12`)
- esbuild config aliases `node:async_hooks` to our stub for proper bundling

**Agent Design Pattern**
- Agent uses **Anthropic SDK directly**, not `@langchain/anthropic`
- Converts between LangChain BaseMessage and Anthropic message formats
- Tools use LangChain DynamicStructuredTool with Zod schemas
- System prompt defines agent identity as "Obsidian Agent" with read-only vault capabilities

**State Management**
- Agent state defined in `src/agent/AgentState.ts` using LangGraph Annotation API
- State includes messages array and vaultContext (files accessed)
- Messages accumulate via reducer function
- vaultContext tracks unique file paths accessed during conversation

**Threading Model**
- Each conversation has a unique thread ID (UUID)
- Thread IDs used as keys for checkpoint persistence
- Supports multiple concurrent conversations
- Thread metadata stored separately from checkpoints

**Performance Features**
- **Streaming Responses**: Real-time token display using Anthropic's streaming API
- **Pagination**: Search results limited to 50 per page (max 1000) to handle large vaults
- **Caching**: In-memory TTL cache for file content (60s) and search results (30s)
- **Rate Limiting**: Token bucket algorithm prevents API rate limit errors

## Key Files and Responsibilities

### Core Plugin Files
- **`src/main.ts`**: Plugin entry point, lifecycle management, service initialization
- **`src/ChatView.ts`**: Main chat UI, message rendering, user interaction
- **`src/settings.ts`**: Settings UI and configuration management

### Agent Layer
- **`src/agent/AgentGraph.ts`**: LangGraph agent definition and execution
- **`src/agent/AgentState.ts`**: Agent state schema (messages, vaultContext)
- **`src/vault/VaultTools.ts`**: Tool definitions for vault operations (search, read, list)

### Services
- **`src/vault/VaultService.ts`**: Vault read operations (file reading, search, metadata)
- **`src/checkpoint/CheckpointService.ts`**: Conversation persistence (implements LangGraph Saver)
- **`src/state/ConversationManager.ts`**: Thread management and metadata

### Error Handling
- **`src/errors/ErrorHandler.ts`**: Error classification, user messages, logging
- **`src/errors/RetryHandler.ts`**: Retry logic with exponential backoff
- **`src/errors/RateLimiter.ts`**: API rate limiting

### Utilities
- **`src/utils/Cache.ts`**: Generic TTL-based in-memory cache
- **`src/polyfills/async-hooks.ts`**: AsyncLocalStorage polyfill for mobile support

### Configuration
- **`tsconfig.json`**: TypeScript config with path aliases (`@/*` → `src/*`)
- **`esbuild.config.mjs`**: Build configuration, async_hooks polyfill aliasing
- **`vitest.config.ts`**: Test configuration with jsdom environment and coverage thresholds

## Development Guidelines

### Working with the Agent

**When modifying agent behavior:**
1. System prompt is in `src/agent/AgentGraph.ts` (AGENT_SYSTEM_PROMPT constant)
2. Agent configuration (model, tokens, retry) in AGENT_CONFIG constant
3. Tool definitions are in `src/vault/VaultTools.ts`
4. State schema changes require updating `src/agent/AgentState.ts`

**Adding new tools:**
1. Define tool in `src/vault/VaultTools.ts` using DynamicStructuredTool
2. Create Zod schema for tool parameters (add limit/offset for paginated tools)
3. Add tool to the tools array passed to ObsidianAgent
4. Tools must return string responses (agent-readable format)
5. Consider caching if tool results are frequently reused

**Streaming responses:**
- Use `agent.invokeStream()` instead of `agent.invoke()` for real-time display
- Provide callbacks: `onChunk(chunk)` for text tokens, `onToolUse(name, input)` for tool calls
- Stream completion automatically saves checkpoint

**Message format conversion:**
- LangChain messages → Anthropic format: `convertToAnthropicMessages()`
- Anthropic response → LangChain AIMessage: `parseAnthropicResponse()`

### Error Handling Patterns

**API Errors:**
```typescript
try {
  // API call
} catch (error) {
  const agentError = ErrorHandler.handle(error);
  ErrorHandler.log(agentError);
  // Return user-friendly message
}
```

**Retry Pattern:**
```typescript
await RetryHandler.withRetry(
  async () => { /* operation */ },
  {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    onRetry: (error, attempt, nextDelay) => {
      console.log(`Retry ${attempt} in ${nextDelay}ms`);
    }
  }
);
```

**Rate Limiting:**
```typescript
// Before API call
await RateLimiters.ANTHROPIC_API.removeTokens(1);
```

**Caching Pattern:**
```typescript
// Check cache first
const cacheKey = `operation:${param1}:${param2}`;
const cached = this.cache.get(cacheKey);
if (cached !== null) {
  return cached;
}

// Perform expensive operation
const result = await expensiveOperation();

// Cache result
this.cache.set(cacheKey, result);
return result;
```

**Pagination Pattern:**
```typescript
// Implement pagination with limit and offset
const limit = Math.min(options.limit || DEFAULT_LIMIT, MAX_LIMIT);
const offset = options.offset || 0;

const paginated = results.slice(offset, offset + limit);

return {
  results: paginated,
  total: results.length,
  hasMore: offset + limit < results.length,
  offset,
  limit
};
```

### Testing Guidelines

**Test Structure:**
- Tests in `src/__tests__/` mirror source structure
- Setup file: `src/__tests__/setup.ts` configures global test environment
- Obsidian mocks: `src/__tests__/mocks/` provides mock Obsidian API
- Test framework: Vitest with jsdom environment
- Path aliases: `@/*` resolves to `src/*` in tests

**Running specific tests:**
```bash
# Run tests matching pattern
npm test -- vault

# Run single test file
npm test -- VaultService.test.ts

# Run with UI interface
npm run test:ui
```

**Coverage requirements (enforced in CI):**
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

**Testing best practices:**
- Use descriptive test names that explain what's being tested
- Test success cases first, then error cases, then edge cases
- Mock external dependencies (Obsidian API, Anthropic API)
- Clean up resources in afterEach hooks
- Use `beforeEach` for test setup to ensure test isolation

### Langsmith Tracing (Development Only)

**Important:** LangSmith is a development-only feature, not user-facing.

**Configuration:**
- Set via environment variables before launching Obsidian
- `LANGSMITH_API_KEY` - Required to enable tracing
- `LANGSMITH_PROJECT` - Optional (default: "obsidian-agent-dev")
- Desktop only (mobile doesn't support process.env)

**Setup:**
See `docs/development/LANGSMITH_ENVIRONMENT_SETUP.md` for platform-specific instructions.

**Environment variables set at startup:**
```
LANGSMITH_TRACING=true  # When LANGSMITH_API_KEY is present
LANGSMITH_API_KEY=<from environment>
LANGSMITH_PROJECT=<from environment or default>
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
```

**Usage:**
See `docs/development/LANGSMITH_DEBUGGING.md` for how to use traces for debugging (to be created in future).

## Important Constraints and Limitations

### Current Scope (V0.0.1)
- **Read-only vault access** - no file creation, modification, or deletion
- Agent politely declines write requests and mentions future versions
- Vault operations: read, search (filename/content/tags), list, metadata
- **Performance features**: streaming, pagination, caching, rate limiting

### Platform Differences
- Mobile platform uses AsyncLocalStorage polyfill (no native async_hooks)
- Langsmith tracing disabled on mobile (requires process.env)
- Test for mobile: `Platform.isMobile`

### Build System Constraints
- Must externalize Obsidian API and CodeMirror modules
- `node:async_hooks` must be aliased to polyfill
- Target ES2018 for compatibility
- Bundle format: CommonJS (cjs)

### API and Rate Limiting
- Anthropic API key must start with `sk-ant-`
- Default model: `claude-sonnet-4-5-20250929`
- Rate limiter: 10 requests/minute (configurable in RateLimiter.ts)
- Retry attempts: 3 with exponential backoff (1s → 30s max)

### Caching and Pagination
- File content cache: 60 second TTL
- Search results cache: 30 second TTL
- Default pagination limit: 50 results
- Maximum pagination limit: 1000 results
- Content search scans max 500 files
- Cache auto-prunes every 5 minutes

## Common Development Patterns

### Adding a New Vault Operation

1. Add method to VaultService:
```typescript
async newOperation(params: string): Promise<Result> {
  // Implementation using this.app.vault API
}
```

2. Create corresponding tool in VaultTools.ts:
```typescript
const newOperationTool = new DynamicStructuredTool({
  name: "new_operation",
  description: "Clear description for agent",
  schema: z.object({
    params: z.string().describe("Parameter description"),
  }),
  func: async (input) => {
    const result = await vaultService.newOperation(input.params);
    return formatForAgent(result);
  }
});
```

3. Add to tools array and pass to agent

### Adding a New Error Type

1. Add error code to ErrorCode enum in `src/errors/ErrorHandler.ts`
2. Add mapping in ERROR_CODE_METADATA
3. Use in error handling:
```typescript
throw new AgentError(
  "Technical message",
  ErrorCode.NEW_ERROR_TYPE,
  originalError,
  isRetryable
);
```

### Modifying Conversation Persistence

**Storage location:**
```
.obsidian/plugins/obsidian-agent/
├── checkpoints/{thread-id}/
│   └── checkpoint-{timestamp}.json
└── conversations.json (thread metadata)
```

**Thread metadata structure:**
```typescript
{
  threadId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  metadata?: {
    tags?: string[];
    pinned?: boolean;
  };
}
```

## Version History and Roadmap

**v0.0.1** (Current - Initial Development Release)
- LangGraph agent with Anthropic SDK
- Read-only vault access (8 tools: search, read, list, metadata)
- Persistent conversations via checkpoints
- Multi-threaded conversations
- Streaming responses for real-time feedback
- Pagination for large vaults (default 50, max 1000)
- In-memory caching (60s for files, 30s for searches)
- 137+ tests with 80%+ coverage
- Enhanced error handling and retry logic
- Mobile support with AsyncLocalStorage polyfill

**Planned: V1.0 (First Stable Release)**
- Production-ready release
- Community plugin submission
- Documentation improvements
- Additional testing and bug fixes

**Planned: V2.0**
- Write operations (create, update, delete files)
- Active note integration
- Automatic context from current note
- User confirmation system for destructive operations

**Planned: V3.0**
- Semantic search with embeddings
- Advanced vault manipulation
- Image/attachment support
- Multi-agent collaboration

## Debugging Tips

**Check console logs:**
- Plugin lifecycle: `[Plugin]` prefix
- Agent operations: `[Obsidian Agent]` prefix
- Error logs include error code and retry attempts

**Common issues:**
1. **Agent not responding**: Check API key format (must start with `sk-ant-`)
2. **Conversations not persisting**: Verify checkpoint directory exists and is writable
3. **Mobile issues**: Check AsyncLocalStorage polyfill initialization order
4. **Build errors**: Ensure node:async_hooks is properly aliased in esbuild config
5. **Slow responses**: Check cache stats with `vaultService.getCacheStats()`
6. **Test failures**: Run `npm run test:coverage` to see what's missing

**Useful developer commands:**
- Open Obsidian DevTools: Cmd/Ctrl + Shift + I
- Reload plugin: Cmd/Ctrl + R (in Obsidian)
- Check plugin folder: `.obsidian/plugins/obsidian-agent/`
- View cache statistics: Call `vaultService.getCacheStats()` in console
- Clear caches: Call `vaultService.clearCaches()` in console

**Performance Debugging:**
- Enable Langsmith tracing to see tool execution times
- Check cache hit rates in console logs
- Monitor memory usage in DevTools
- Use `npm run test:coverage` to identify untested code paths
