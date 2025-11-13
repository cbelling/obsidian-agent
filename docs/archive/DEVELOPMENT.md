# Development Guide

This guide will help you set up the development environment and contribute to the Obsidian Agent plugin.

## Prerequisites

- **Node.js 16+** and npm
- **Obsidian desktop app** (for testing)
- **Git**
- **TypeScript knowledge**
- **Familiarity with Obsidian plugin API**

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/charlesbellinger/obsidian-agent.git
cd obsidian-agent
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Get API Keys

- **Anthropic API Key** (required): Get from [console.anthropic.com](https://console.anthropic.com)
- **LangSmith API Key** (optional): Get from [smith.langchain.com](https://smith.langchain.com)

### 4. Configure Development Vault

#### Option A: Symlink (Recommended)

```bash
# Create symlink to your test vault
ln -s $(pwd) "/path/to/your/test-vault/.obsidian/plugins/obsidian-agent"
```

#### Option B: Manual Copy

```bash
# Create plugin directory
mkdir -p "/path/to/your/test-vault/.obsidian/plugins/obsidian-agent"

# Copy manifest
cp manifest.json "/path/to/your/test-vault/.obsidian/plugins/obsidian-agent/"
```

### 5. Start Development

```bash
# Start watch mode (auto-rebuilds on changes)
npm run dev
```

---

## Development Workflow

### Watch Mode

The best way to develop is with watch mode running:

```bash
npm run dev
```

This will:
- Watch for file changes
- Automatically rebuild on save
- Output `main.js` to the root directory

### Testing Changes

1. Make code changes in your editor
2. Save files (build happens automatically)
3. In Obsidian: **Cmd/Ctrl + R** to reload the plugin
4. Test your changes in the chat interface

### Building for Production

```bash
npm run build
```

This runs:
- TypeScript type checking (`tsc -noEmit`)
- Production build with esbuild
- Outputs: `main.js`, `manifest.json`, `styles.css`

---

## Project Structure

```
obsidian-agent/
├── src/
│   ├── main.ts                    # Plugin entry point
│   ├── ChatView.ts                # Main chat UI
│   ├── settings.ts                # Settings UI and configuration
│   ├── types.ts                   # TypeScript type definitions
│   │
│   ├── agent/
│   │   ├── AgentGraph.ts          # LangGraph agent implementation
│   │   └── AgentState.ts          # Agent state schema
│   │
│   ├── vault/
│   │   ├── VaultService.ts        # Vault read operations
│   │   └── VaultTools.ts          # Agent tool definitions
│   │
│   ├── checkpoint/
│   │   └── CheckpointService.ts   # Conversation persistence
│   │
│   ├── state/
│   │   └── ConversationManager.ts # Thread management
│   │
│   ├── errors/
│   │   ├── ErrorHandler.ts        # Error classification & handling
│   │   ├── RetryHandler.ts        # Exponential backoff retry
│   │   └── RateLimiter.ts         # Token bucket rate limiting
│   │
│   ├── utils/
│   │   └── Cache.ts               # In-memory TTL cache
│   │
│   ├── polyfills/
│   │   └── async-hooks.ts         # Mobile support polyfill
│   │
│   └── __tests__/                 # Test files (mirrors src/)
│       ├── agent/
│       ├── vault/
│       ├── checkpoint/
│       ├── errors/
│       └── mocks/
│
├── docs/
│   ├── ARCHITECTURE.md            # System architecture
│   ├── DEVELOPMENT.md             # This file
│   ├── PERFORMANCE_OPTIMIZATIONS.md
│   └── UPDATE_SPEC.md             # Implementation specs
│
├── styles.css                     # Plugin styles
├── manifest.json                  # Plugin metadata
├── CLAUDE.md                      # AI assistant instructions
├── CONTRIBUTING.md                # Contribution guide
└── README.md                      # User documentation
```

---

## Running Tests

### Run All Tests

```bash
npm test
```

### Watch Mode (Recommended)

```bash
npm run test:watch
```

Auto-reruns tests when you save files.

### Coverage Report

```bash
npm run test:coverage
```

Opens HTML coverage report in your browser.

### UI Test Runner

```bash
npm run test:ui
```

Interactive Vitest UI at http://localhost:51204

### Run Specific Tests

```bash
# Run tests matching pattern
npm test -- vault

# Run single test file
npm test -- VaultService.test.ts
```

### Writing Tests

Tests are located in `src/__tests__/` and mirror the source structure:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('MyFeature', () => {
    beforeEach(() => {
        // Setup
    });

    it('should do something', () => {
        expect(result).toBe(expected);
    });
});
```

Use mocks from `src/__tests__/mocks/` for Obsidian API.

---

## Debugging

### Console Logging

Open Obsidian's developer console:
- **Mac**: `Cmd + Option + I`
- **Windows/Linux**: `Ctrl + Shift + I`

The plugin logs with prefixes:
- `[Plugin]` - Plugin lifecycle
- `[Obsidian Agent]` - Agent operations
- `[CheckpointService]` - Conversation persistence
- `[ChatView]` - UI operations

### Breakpoints

1. Add `debugger;` statement in code
2. Open developer console
3. Trigger the code path
4. Inspector pauses at breakpoint

### LangSmith Tracing

Enable LangSmith in plugin settings to trace:
- Agent decisions and reasoning
- Tool calls with inputs/outputs
- Token usage per request
- Execution time per component

### Common Issues

**Plugin won't load:**
- Check console for errors
- Verify `manifest.json` is valid
- Ensure plugin is enabled in settings

**Changes not appearing:**
- Make sure `npm run dev` is running
- Reload Obsidian (Cmd/Ctrl + R)
- Check that `main.js` was updated

**TypeScript errors:**
```bash
# Run type check
npm run build
```

**Test failures:**
```bash
# Run specific test in watch mode
npm run test:watch -- VaultService
```

---

## Code Style

### TypeScript Guidelines

- Use **explicit types** for function parameters and returns
- Avoid `any` - use proper types or `unknown`
- Use `async/await` instead of `.then()`
- Prefer `const` over `let`
- Use descriptive variable names

### Example

```typescript
// Good
async function readFile(path: string): Promise<string> {
    const file = this.vault.getAbstractFileByPath(path);

    if (!file || !(file instanceof TFile)) {
        throw new Error(`File not found: ${path}`);
    }

    return await this.vault.read(file);
}

// Avoid
function readFile(path: any): any {
    let file = this.vault.getAbstractFileByPath(path);
    return this.vault.read(file);
}
```

### Error Handling

Always use `ErrorHandler` for consistent error handling:

```typescript
import { ErrorHandler } from './errors/ErrorHandler';

try {
    await someOperation();
} catch (error) {
    const agentError = ErrorHandler.handle(error);
    ErrorHandler.log(agentError);
    throw agentError;
}
```

### Testing Patterns

- Test success cases first
- Test error cases second
- Test edge cases last
- Use descriptive test names

```typescript
describe('readFile', () => {
    it('should read file contents successfully', async () => {
        // Test implementation
    });

    it('should throw error when file not found', async () => {
        // Test implementation
    });

    it('should handle empty files', async () => {
        // Test implementation
    });
});
```

---

## Performance Best Practices

### Caching

Use the `Cache` utility for expensive operations:

```typescript
import { Cache } from './utils/Cache';

private fileCache = new Cache<string>(60000); // 1 minute TTL

async readFile(path: string): Promise<string> {
    // Check cache first
    const cached = this.fileCache.get(path);
    if (cached !== null) {
        return cached;
    }

    // Expensive operation
    const content = await this.vault.read(file);

    // Cache result
    this.fileCache.set(path, content);

    return content;
}
```

### Pagination

Always paginate large result sets:

```typescript
searchFiles(query: string, options: SearchOptions = {}): PaginatedResults<FileSearchResult> {
    const limit = Math.min(options.limit || 50, 1000);
    const offset = options.offset || 0;

    const paginated = results.slice(offset, offset + limit);

    return {
        results: paginated,
        total: results.length,
        hasMore: offset + limit < results.length,
        offset,
        limit
    };
}
```

### Async Operations

Keep UI responsive with async operations:

```typescript
async handleLongOperation() {
    this.setLoading(true);

    try {
        // Yield to event loop
        await new Promise(resolve => setTimeout(resolve, 0));

        const result = await expensiveOperation();

        // Update UI
        this.updateUI(result);
    } finally {
        this.setLoading(false);
    }
}
```

---

## Release Process

### Version Update

1. Update version in `manifest.json`
2. Update `minAppVersion` if needed
3. Update version history in `README.md`

### Build

```bash
npm run build
```

### Test

```bash
npm test
npm run test:coverage
```

### Create Release

1. Commit changes
2. Create and push tag:
```bash
git tag v1.x.x
git push origin v1.x.x
```

3. GitHub Actions will build and create release automatically

### Manual Release (if needed)

```bash
# Build
npm run build

# Create release package
mkdir obsidian-agent
cp main.js manifest.json styles.css obsidian-agent/
zip -r obsidian-agent-v1.x.x.zip obsidian-agent
```

---

## Additional Resources

- [Obsidian Plugin API](https://docs.obsidian.md/)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [Anthropic API Docs](https://docs.anthropic.com/)
- [Vitest Documentation](https://vitest.dev/)

---

## Getting Help

- Check [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines
- Open an issue on GitHub
- Review existing tests for examples

---

## Tips for Contributors

1. **Start Small**: Fix a typo, improve a comment, add a test
2. **Read the Code**: Explore `src/agent/` and `src/vault/` first
3. **Run Tests**: Make sure tests pass before submitting
4. **Ask Questions**: Open an issue if something is unclear
5. **Follow Patterns**: Match the existing code style

Happy coding! 🚀
