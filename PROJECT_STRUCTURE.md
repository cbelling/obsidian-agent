# Project Structure

```
chat-plugin/
│
├── 📄 Core Files
│   ├── README.md                 # User documentation
│   ├── LICENSE                   # MIT License
│   ├── CHANGELOG.md              # Version history
│   ├── CONTRIBUTING.md           # Contribution guidelines
│   └── PROJECT_STRUCTURE.md      # This file
│
├── ⚙️ Configuration
│   ├── package.json              # Dependencies and scripts
│   ├── tsconfig.json             # TypeScript configuration
│   ├── esbuild.config.mjs        # Build system config
│   ├── manifest.json             # Obsidian plugin metadata
│   ├── versions.json             # Version compatibility
│   └── .gitignore                # Git ignore rules
│
├── 📚 Documentation (docs/)
│   ├── DEVELOPMENT.md            # Developer guide
│   ├── INSTALLATION.md           # Installation instructions
│   ├── MVP.md                    # MVP specification
│   └── VISION.md                 # Product roadmap
│
├── 💻 Source Code (src/)
│   ├── main.ts                   # Plugin entry point
│   ├── ChatView.ts               # Chat UI component
│   ├── ChatService.ts            # Claude API client
│   ├── settings.ts               # Settings tab UI
│   └── types.ts                  # TypeScript types
│
├── 🎨 Styling
│   └── styles.css                # Plugin styles
│
├── 📦 Build Output
│   └── main.js                   # Compiled plugin
│
└── 🔧 Dependencies
    └── node_modules/             # npm packages
```

## Quick Navigation

### For Users
- **Getting Started:** [README.md](README.md)
- **Installation:** [docs/INSTALLATION.md](docs/INSTALLATION.md)
- **What's Next:** [docs/VISION.md](docs/VISION.md)

### For Developers
- **Setup:** [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- **Contributing:** [CONTRIBUTING.md](CONTRIBUTING.md)
- **Architecture:** See below

### For Maintainers
- **Releases:** [CHANGELOG.md](CHANGELOG.md)
- **Build:** `npm run build`
- **Dev Mode:** `npm run dev`

## Architecture Overview

### Component Hierarchy

```
ClaudeChatPlugin (main.ts)
│
├── Settings Management
│   └── ClaudeChatSettingTab (settings.ts)
│
└── Chat Interface
    └── ChatView (ChatView.ts)
        └── ChatService (ChatService.ts)
            └── Anthropic API
```

### Data Flow

```
User Input
    ↓
ChatView.handleSendMessage()
    ↓
ChatService.sendMessage()
    ↓
Anthropic API
    ↓
ChatService (format response)
    ↓
ChatView.displayMessage()
    ↓
UI Update
```

## File Responsibilities

### main.ts
- Plugin lifecycle (onload/onunload)
- View registration
- Settings persistence
- Command registration
- Ribbon icon setup

### ChatView.ts
- UI rendering and layout
- Message display with markdown
- User input handling
- Loading states
- Error display

### ChatService.ts
- Anthropic API communication
- Message formatting
- API key management
- Error handling

### settings.ts
- Settings UI rendering
- API key input
- Save/load settings

### types.ts
- TypeScript interfaces
- Type definitions
- Constants

## Development Workflow

```
Edit src/*.ts
    ↓
npm run dev (watches changes)
    ↓
Auto-rebuild
    ↓
Reload Obsidian (Cmd/Ctrl + R)
    ↓
Test changes
```

## Build Process

```
TypeScript Source (src/)
    ↓
TypeScript Compiler (type check)
    ↓
ESBuild (bundle & minify)
    ↓
main.js (output)
```

## Key Design Principles

1. **Separation of Concerns**
   - UI logic in ChatView
   - API logic in ChatService
   - Settings in settings.ts

2. **Type Safety**
   - Strict TypeScript
   - Explicit types everywhere
   - No `any` types

3. **Error Handling**
   - Try-catch blocks
   - User-friendly error messages
   - Console logging for debugging

4. **User Experience**
   - Loading indicators
   - Clear error messages
   - Markdown rendering
   - Theme support

## Next Steps

Ready to contribute? Check out:
- [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) - Development setup
- [docs/VISION.md](docs/VISION.md) - Future features
