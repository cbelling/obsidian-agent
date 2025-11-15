# Installation Guide

## Quick Start

### 1. Copy Plugin to Obsidian

Copy the following files to your Obsidian vault's plugins folder:

```bash
# Navigate to your vault's plugins folder
cd /path/to/your/vault/.obsidian/plugins

# Create the plugin directory
mkdir claude-chat

# Copy these files from the chat-plugin directory:
# - main.js
# - manifest.json
# - styles.css
```

Or use this one-liner (replace `/path/to/your/vault` with your actual vault path):

```bash
cp -r /Users/charlesbellinger/projects/chat-plugin/{main.js,manifest.json,styles.css} /path/to/your/vault/.obsidian/plugins/claude-chat/
```

### 2. Enable the Plugin

1. Open Obsidian
2. Go to **Settings** → **Community Plugins**
3. Click **Reload plugins** (or restart Obsidian)
4. Find "Claude Chat" in the list
5. Toggle it **ON**

### 3. Configure API Key

1. In Settings, scroll down to find **Claude Chat** under Plugin Options
2. Click on it to open settings
3. Enter your Anthropic API key
   - Don't have one? Get it at [console.anthropic.com](https://console.anthropic.com/settings/keys)
4. Close settings

### 4. Start Chatting!

1. Click the **message icon** (💬) in the left ribbon, OR
2. Press `Cmd/Ctrl + P` and type "Open Claude Chat"
3. The chat panel will open in the right sidebar
4. Type a message and press Enter

## Development Mode

If you want to develop or modify the plugin:

```bash
# Keep the project where it is
cd /Users/charlesbellinger/projects/chat-plugin

# Create a symbolic link to your vault
ln -s /Users/charlesbellinger/projects/chat-plugin /path/to/your/vault/.obsidian/plugins/claude-chat

# Run in development mode (auto-rebuilds on changes)
npm run dev
```

Now any changes you make will be automatically rebuilt, and you can reload the plugin in Obsidian to see them.

## Troubleshooting

### Plugin doesn't show up
- Make sure all three files (main.js, manifest.json, styles.css) are in the correct folder
- Try restarting Obsidian completely
- Check that the folder name is exactly `claude-chat`

### Can't enable the plugin
- Open the Developer Console (Cmd/Ctrl + Shift + I) and check for errors
- Ensure you're running Obsidian 0.15.0 or later

### API key not working
- Make sure there are no extra spaces before/after the key
- Verify the key is valid at [console.anthropic.com](https://console.anthropic.com/settings/keys)
- Check you have credits in your Anthropic account

## Next Steps

Once installed and working:
- Try sending a message to Claude
- Experiment with markdown formatting
- Check out the roadmap in [VISION.md](VISION.md) for upcoming features
- Report bugs or suggest features on GitHub
