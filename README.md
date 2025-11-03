# Obsidian Agent

An AI agent powered by Claude that lives in your Obsidian workspace. This plugin provides an intelligent assistant that can search, read, and interact with your vault through a clean chat interface.

## Features

- 💬 **Direct Claude Integration**: Chat with Claude 3.5 Sonnet right from Obsidian
- 💾 **Persistent Conversations**: All chats automatically saved and resumable
- 🗂️ **Multiple Threads**: Create and switch between different conversations
- 🔍 **Vault Integration**: Claude can search and read your notes (with AI agent tools)
- 🎨 **Native Design**: Matches Obsidian's theme (light/dark mode)
- ✨ **Markdown Support**: Full markdown rendering in responses
- 🔒 **Privacy First**: API key stored securely, direct communication with Anthropic
- 🧹 **Clean Interface**: Simple, distraction-free chat experience
- 🛡️ **Error Handling**: Automatic retry with exponential backoff for network issues
- ⚡ **Rate Limiting**: Built-in protection against API rate limits
- 🧪 **LangSmith Integration**: Optional tracing for debugging (graceful degradation)
- 📊 **Data Retention**: Configurable automatic cleanup of old conversations

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

Your agent can help you with your notes:
- Search across your vault for relevant information
- Read specific files when you reference them
- Find connections between notes
- Access file metadata and tags

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


## Support

- 🐛 [Report a bug](https://github.com/charlesbellinger/obsidian-agent/issues)
- 💡 [Request a feature](https://github.com/charlesbellinger/obsidian-agent/issues)
- 📖 [Read the docs](https://github.com/charlesbellinger/obsidian-agent)

## License

MIT License - see [LICENSE](LICENSE) for details

## Acknowledgments

- Built with Obsidian API
- Powered by Claude by Anthropic
- Inspired by the Obsidian community
