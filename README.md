# Claude Chat for Obsidian

Chat with Claude AI directly in your Obsidian workspace. This plugin provides a simple, elegant chat interface integrated into Obsidian's sidebar.

## Features

- 💬 **Direct Claude Integration**: Chat with Claude 3.5 Sonnet right from Obsidian
- 🎨 **Native Design**: Matches Obsidian's theme (light/dark mode)
- ✨ **Markdown Support**: Full markdown rendering in responses
- 🔒 **Privacy First**: API key stored locally, direct communication with Anthropic
- 🧹 **Clean Interface**: Simple, distraction-free chat experience

## Installation

### Manual Installation

1. Download the latest release from the [releases page](https://github.com/charlesbellinger/obsidian-claude-chat/releases)
2. Extract the files to your vault's plugins folder: `<vault>/.obsidian/plugins/claude-chat/`
3. Reload Obsidian
4. Enable "Claude Chat" in Settings → Community Plugins

### Development Installation

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed development setup and contribution guidelines.

## Setup

### Getting an API Key

1. Visit [console.anthropic.com](https://console.anthropic.com/settings/keys)
2. Sign in or create an Anthropic account
3. Navigate to "API Keys"
4. Click "Create Key"
5. Copy your new API key

### Configuring the Plugin

1. Open Obsidian Settings
2. Navigate to "Claude Chat" under Community Plugins
3. Paste your Anthropic API key
4. Close settings

## Usage

### Opening the Chat

There are three ways to open Claude Chat:

1. **Ribbon Icon**: Click the message icon (💬) in the left sidebar
2. **Command Palette**: Press `Cmd/Ctrl + P` and search for "Open Claude Chat"
3. **Sidebar**: The chat will appear in the right sidebar

### Chatting with Claude

1. Type your message in the input box at the bottom
2. Press `Enter` to send (or click "Send")
3. Use `Shift + Enter` to add a new line without sending
4. Click "Clear" to start a new conversation

### Tips

- Messages are displayed with full markdown formatting
- Code blocks are syntax highlighted
- Links and formatting work as expected
- Conversations are session-based (cleared when you close the view)

## Privacy & Security

- Your API key is stored locally in Obsidian's settings
- All communication goes directly to Anthropic's API
- No data is sent to third parties
- Conversations are not persisted between sessions (MVP limitation)

## API Costs

This plugin uses the Claude 3.5 Sonnet model. Costs are:
- Input: $3 per million tokens
- Output: $15 per million tokens

Typical usage:
- Short conversation: ~$0.01-0.05
- Long conversation: ~$0.10-0.50

For current pricing, visit [anthropic.com/pricing](https://www.anthropic.com/pricing)

## Roadmap

This is the MVP (v0.1.0) with basic functionality. See [docs/VISION.md](docs/VISION.md) for the complete roadmap of planned features including:

- Vault integration (read/write notes)
- Context awareness
- Conversation persistence
- Semantic search
- Custom prompts and templates

[View Full Roadmap →](docs/VISION.md)

## Troubleshooting

### Plugin doesn't appear
- Ensure you've enabled the plugin in Settings → Community Plugins
- Try reloading Obsidian (Cmd/Ctrl + R)

### "Please configure your API key" error
- Open Settings → Claude Chat
- Paste your Anthropic API key
- Ensure there are no extra spaces

### "API Error" messages
- Check your API key is valid
- Ensure you have credits in your Anthropic account
- Check your internet connection

### Messages not appearing
- Check the browser console for errors (Cmd/Ctrl + Shift + I)
- Try clearing the conversation and starting fresh

## Development

Want to contribute or customize the plugin? Check out our comprehensive development guide:

**[Development Guide →](docs/DEVELOPMENT.md)**

Includes:
- Setup instructions
- Project structure
- Code style guidelines
- Testing checklist
- Debugging tips

### Quick Start for Developers

```bash
git clone <repo-url>
cd chat-plugin
npm install
npm run dev
```

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for details.

## Support

- 🐛 [Report a bug](https://github.com/charlesbellinger/obsidian-claude-chat/issues)
- 💡 [Request a feature](https://github.com/charlesbellinger/obsidian-claude-chat/issues)
- 📖 [Read the docs](https://github.com/charlesbellinger/obsidian-claude-chat)

## License

MIT License - see [LICENSE](LICENSE) for details

## Acknowledgments

- Built with [Obsidian API](https://github.com/obsidianmd/obsidian-api)
- Powered by [Claude](https://www.anthropic.com/claude) by Anthropic
- Inspired by the Obsidian community

---

**Note**: This is an MVP (v0.1.0) release. Features are intentionally minimal to validate the concept. More features coming soon based on user feedback!

## Changelog

### v0.1.0 (MVP)
- Initial release
- Basic chat interface
- Claude 3.5 Sonnet integration
- Markdown rendering
- Session-based conversations
- Theme support (light/dark)
