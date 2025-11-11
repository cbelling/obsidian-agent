# Changelog

All notable changes to the Obsidian Agent plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned for v1.0
- Write operations (create, update, delete files)
- Active note integration
- Automatic context from current note
- Token usage tracking
- Export conversations as notes

See [docs/VISION.md](docs/VISION.md) for full roadmap.

---

## [0.0.1] - 2025-11-11

### Added
- 🤖 **LangGraph Agent**: Powered by Anthropic Claude Sonnet 4
- 💾 **Persistent Conversations**: LangGraph checkpoint system for conversation state
- 🗂️ **Multi-threaded Conversations**: Create and switch between multiple chat threads
- 🔍 **Vault Integration**: 8 specialized tools for vault operations:
  - **Search Tools**: by filename, content (full-text), tags (frontmatter/inline)
  - **Read Tools**: read files, list directory contents
  - **Metadata Tools**: file metadata, backlinks, outgoing links
- 🎨 **Native Obsidian Design**: Matches light/dark theme automatically
- ✨ **Markdown Support**: Full markdown rendering in chat responses
- 🔒 **Privacy First**: Direct Anthropic API communication, local storage
- 🧪 **LangSmith Integration**: Optional tracing for debugging (desktop only)
- ⚡ **Streaming Responses**: Real-time response generation with token-by-token display
- 📄 **Smart Pagination**: Handles large vaults efficiently (default 50 results, max 1000)
- 🚀 **Intelligent Caching**: 90% faster repeated operations with TTL-based cache (60s files, 30s searches)
- 🛡️ **Enhanced Error Handling**:
  - Comprehensive error codes (15+ error types)
  - Automatic retry with exponential backoff (3 attempts, 1s-30s delays)
  - User-friendly error messages
- ⏱️ **Rate Limiting**: Token bucket rate limiter (10 req/min) prevents API throttling
- 📊 **Data Retention**: Configurable automatic cleanup (default 30 days)
- 📱 **Mobile Support**: AsyncLocalStorage polyfill for mobile compatibility
- 🔄 **Graceful Degradation**: Continues working if optional services fail

### Technical
- TypeScript codebase with strict type checking
- Vitest test framework with comprehensive test coverage (137+ tests, 80%+ coverage)
- Mock Obsidian environment for testing
- Custom AsyncLocalStorage polyfill for mobile
- Read-only vault access (V1 scope)
- Added `src/errors/` module with ErrorHandler, RetryHandler, RateLimiter
- Added `src/utils/Cache.ts` with TTL-based in-memory caching
- Added `src/polyfills/async-hooks.ts` for mobile support

### Documentation
- Comprehensive README with user guide
- CLAUDE.md for Claude Code integration
- CONTRIBUTING.md for contributors
- Architecture documentation
- Development guide
- Performance optimizations documentation

---

[Unreleased]: https://github.com/charlesbellinger/obsidian-agent/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/charlesbellinger/obsidian-agent/releases/tag/v0.0.1
