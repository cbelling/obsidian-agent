# Development Guide

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn
- Obsidian (for testing)

### Initial Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd chat-plugin

# Install dependencies
npm install

# Build the plugin
npm run build
```

### Development Workflow

#### Option 1: Symlink for Live Development (Recommended)

```bash
# Create symlink to your Obsidian vault
ln -s "$(pwd)" "/path/to/your/vault/.obsidian/plugins/claude-chat"

# Start development mode (watches for changes)
npm run dev

# In Obsidian:
# 1. Enable the plugin in Settings → Community Plugins
# 2. Reload Obsidian (Cmd/Ctrl + R) after making changes
```

#### Option 2: Manual Copy for Testing

```bash
# Build the plugin
npm run build

# Copy built files to vault
cp main.js manifest.json styles.css "/path/to/your/vault/.obsidian/plugins/claude-chat/"

# Reload Obsidian to see changes
```

## Project Structure

```
chat-plugin/
├── src/                    # Source code
│   ├── main.ts            # Plugin entry point
│   ├── ChatView.ts        # Chat UI component
│   ├── ChatService.ts     # Claude API integration
│   ├── settings.ts        # Settings tab
│   └── types.ts           # TypeScript interfaces
├── docs/                   # Documentation
│   ├── DEVELOPMENT.md     # This file
│   ├── INSTALLATION.md    # User installation guide
│   ├── MVP.md             # MVP specification
│   └── VISION.md          # Future roadmap
├── styles.css             # Plugin styles
├── manifest.json          # Plugin metadata
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── esbuild.config.mjs     # Build configuration
├── README.md              # User documentation
└── LICENSE                # MIT License
```

## Available Scripts

```bash
# Development mode - watches for changes and rebuilds
npm run dev

# Production build - creates optimized build
npm run build

# Version bump - updates manifest.json and versions.json
npm run version
```

## Making Changes

### Adding a New Feature

1. **Create a new branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** in the `src/` directory

3. **Test thoroughly** in Obsidian
   - Reload Obsidian after each change
   - Test on both light and dark themes
   - Check console for errors

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add feature: description"
   ```

### Code Style Guidelines

- Use TypeScript strict mode
- Follow existing naming conventions
- Add JSDoc comments for public methods
- Keep functions small and focused
- Use async/await for asynchronous operations
- Handle errors gracefully with try-catch

### CSS Guidelines

- Use Obsidian CSS variables for theming
- Support both light and dark modes
- Follow mobile-first responsive design
- Namespace classes with `claude-chat-`

## Testing

### Manual Testing Checklist

- [ ] Plugin loads without errors
- [ ] Settings tab is accessible
- [ ] API key saves correctly
- [ ] Chat view opens from ribbon icon
- [ ] Chat view opens from command palette
- [ ] Messages send successfully
- [ ] Responses render correctly with markdown
- [ ] Clear conversation works
- [ ] Error messages display properly
- [ ] Works in light theme
- [ ] Works in dark theme
- [ ] No console errors

### Testing with Different Scenarios

1. **First-time user** (no API key)
   - Should see warning message
   - Should prompt to configure key

2. **Invalid API key**
   - Should show clear error message
   - Should not crash the plugin

3. **Long conversations**
   - Should scroll properly
   - Should not lag

4. **Markdown rendering**
   - Code blocks with syntax highlighting
   - Links and formatting
   - Lists and tables

## Debugging

### Enable Developer Console

**Mac:** `Cmd + Option + I`
**Windows/Linux:** `Ctrl + Shift + I`

### Common Issues

**Plugin doesn't load:**
- Check console for errors
- Verify all files are in the correct location
- Ensure Obsidian version meets minimum requirement

**Changes not appearing:**
- Make sure `npm run dev` is running
- Reload Obsidian (Cmd/Ctrl + R)
- Check that symlink is correct

**API errors:**
- Verify API key is valid
- Check network connection
- Look at console for detailed error messages

## Architecture

### Key Components

**main.ts**
- Plugin lifecycle management
- View registration
- Settings management
- Command registration

**ChatView.ts**
- UI rendering
- Message handling
- User interactions
- Markdown rendering

**ChatService.ts**
- Claude API communication
- Message formatting
- Error handling

**settings.ts**
- Settings UI
- API key management
- Validation

### Data Flow

```
User Input → ChatView → ChatService → Anthropic API
                ↓                           ↓
           Update UI ← Format Response ← API Response
```

## Contributing

### Before Submitting a PR

1. **Test thoroughly** on multiple scenarios
2. **Update documentation** if needed
3. **Follow code style** guidelines
4. **Add comments** for complex logic
5. **Update CHANGELOG** if applicable

### PR Guidelines

- Clear description of changes
- Reference any related issues
- Include screenshots for UI changes
- Ensure build passes
- Keep PRs focused on single feature/fix

## Release Process

1. **Update version** in `manifest.json` and `package.json`
2. **Update CHANGELOG.md** with changes
3. **Run production build**: `npm run build`
4. **Test thoroughly** in clean Obsidian vault
5. **Create git tag**: `git tag v0.x.x`
6. **Push changes**: `git push && git push --tags`
7. **Create GitHub release** with built files

## Resources

- [Obsidian API Documentation](https://github.com/obsidianmd/obsidian-api)
- [Anthropic API Documentation](https://docs.anthropic.com)
- [Sample Obsidian Plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
- [Obsidian Developer Discord](https://discord.gg/obsidianmd)

## Getting Help

- Check existing [GitHub Issues](https://github.com/charlesbellinger/obsidian-claude-chat/issues)
- Read the [Obsidian Developer Docs](https://docs.obsidian.md/Home)
- Ask in the Obsidian Discord #plugin-dev channel

## Next Steps

Once you're comfortable with the codebase:
1. Review [VISION.md](./VISION.md) for planned features
2. Check open issues for contribution opportunities
3. Propose new features via GitHub Issues
