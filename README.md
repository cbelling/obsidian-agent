# Obsidian Agent

An AI agent powered by Claude that lives in your Obsidian workspace. This plugin provides an intelligent assistant that can search, read, and interact with your vault through a clean chat interface.

## Features

### Core Capabilities
- 💬 **Direct Claude Integration**: Chat with Claude 4 Sonnet right from Obsidian
- 💾 **Persistent Conversations**: All chats automatically saved and resumable with LangGraph checkpoints
- 🗂️ **Multiple Threads**: Create and switch between different conversations
- 🔍 **Vault Integration**: Claude can search and read your notes with 8 specialized tools
- 🎨 **Native Design**: Matches Obsidian's theme (light/dark mode)
- ✨ **Markdown Support**: Full markdown rendering in responses

### Performance & Reliability
- ⚡ **Streaming Responses**: See responses appear in real-time as they're generated
- 📄 **Smart Pagination**: Handles large vaults efficiently (default 50 results per page, up to 1000)
- 🚀 **Intelligent Caching**: 90% faster repeated operations with automatic cache management
- 🛡️ **Robust Error Handling**: Automatic retry with exponential backoff for network issues
- ⏱️ **Rate Limiting**: Built-in protection against API rate limits (10 req/min)
- 🔄 **Graceful Degradation**: Continues working even if optional services (LangSmith) fail

### Developer & Privacy
- 🔒 **Privacy First**: API key stored securely, direct communication with Anthropic
- 🧹 **Clean Interface**: Simple, distraction-free chat experience
- 🧪 **LangSmith Integration**: Optional tracing for debugging and monitoring
- 📊 **Data Retention**: Configurable automatic cleanup of old conversations (default 30 days)
- 📱 **Mobile Support**: Works on mobile with AsyncLocalStorage polyfill
- ✅ **Comprehensive Testing**: 137+ tests with 80%+ code coverage

## Installation

1. Download the latest release from the releases page
2. Extract the files to your vault's plugins folder: `<vault>/.obsidian/plugins/obsidian-agent/`
3. Reload Obsidian
4. Enable "Obsidian Agent" in Settings → Community Plugins

## Setup

### Getting an API Key

1. Visit [console.anthropic.com](https://console.anthropic.com/settings/keys)
2. Sign in or create an Anthropic account
3. Navigate to "API Keys"
4. Click "Create Key"
5. Copy your new API key

### Configuring the Plugin

1. Open Obsidian Settings
2. Navigate to "Obsidian Agent" under Community Plugins
3. Paste your Anthropic API key
4. Close settings

## Usage

### Opening Obsidian Agent

There are three ways to open the agent:

1. **Ribbon Icon**: Click the message icon (💬) in the left sidebar
2. **Command Palette**: Press `Cmd/Ctrl + P` and search for "Open Obsidian Agent"
3. **Sidebar**: The agent will appear in the right sidebar

### Chatting with Your Agent

1. Type your message in the input box at the bottom
2. Press `Enter` to send (or click "Send")
3. Use `Shift + Enter` to add a new line without sending

### Managing Conversations

1. **View All Chats**: Click the "← Chats" button to see all your conversations
2. **Switch Threads**: Click any conversation in the list to load it
3. **New Chat**: Click "+ New Chat" to start a fresh conversation
4. **Auto-Save**: All conversations are automatically saved as you chat

### Vault Integration

Your agent has access to 8 specialized tools to help with your notes:

**Search Tools:**
- **Search by Filename**: Find files by name with pagination support
- **Search by Content**: Full-text search across your vault (scans up to 500 files)
- **Search by Tag**: Find notes with specific tags (frontmatter or inline)

**Read Tools:**
- **Read File**: Access complete file contents (up to 4000 characters shown)
- **List Files**: Browse files in folders (recursive or non-recursive)

**Metadata Tools:**
- **Get File Metadata**: View frontmatter, tags, creation/modification dates, file size
- **Get Backlinks**: See which notes link to a specific file
- **Get Outgoing Links**: See which notes a file links to

All tools support pagination for large result sets, with intelligent caching for faster repeated queries.

### Tips

- Messages are displayed with full markdown formatting
- Code blocks are syntax highlighted
- Links and formatting work as expected
- All conversations persist between sessions
- Active conversation is highlighted in the chat list

## Privacy & Security

- Your API key is stored locally in Obsidian's settings
- All communication goes directly to Anthropic's API
- No data is sent to third parties
- Conversations are stored locally in your vault's `.obsidian` folder
- All data remains on your device


## Technical Details

**Architecture:**
- LangGraph-powered agent with Anthropic SDK
- Persistent conversation state with checkpoint management
- 8 specialized vault tools with Zod schema validation
- Comprehensive error handling with retry logic
- In-memory caching with TTL-based expiration

**Performance:**
- Streaming responses for real-time feedback
- Pagination for large result sets (default 50, max 1000)
- Smart caching (60s TTL for files, 30s for searches)
- Rate limiting (10 requests/minute)
- Supports vaults with thousands of notes

**Testing:**
- Vitest test framework
- 137+ unit and integration tests
- Mock Obsidian environment
- 80%+ code coverage

## Version History

**v0.0.1** - Current (2025-11-13)
- ✨ Added streaming responses for real-time feedback
- 🚀 Implemented pagination for large vaults
- ⚡ Added intelligent caching system
- 🛡️ Enhanced error handling and retry logic
- 📱 Mobile support with AsyncLocalStorage polyfill
- ✅ Comprehensive testing suite (137+ tests)

**v1.0.0** - Initial Release
- 💬 LangGraph agent with Anthropic SDK
- 🔍 Read-only vault access (8 tools)
- 💾 Persistent conversations
- 🗂️ Multi-threaded conversations

## Support

- 🐛 [Report a bug](https://github.com/charlesbellinger/obsidian-agent/issues)
- 💡 [Request a feature](https://github.com/charlesbellinger/obsidian-agent/issues)
- 📖 [Documentation](https://github.com/charlesbellinger/obsidian-agent/tree/main/docs)
- 🤝 [Contributing Guide](CONTRIBUTING.md)

## License

MIT License - see [LICENSE](LICENSE) for details

## Acknowledgments

- Built with [Obsidian API](https://docs.obsidian.md/)
- Powered by [Claude](https://www.anthropic.com/claude) by Anthropic
- Agent framework by [LangGraph](https://langchain-ai.github.io/langgraph/)
- Inspired by the Obsidian community
