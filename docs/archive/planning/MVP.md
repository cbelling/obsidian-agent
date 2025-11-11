# Obsidian Claude Plugin - MVP Specification

## MVP Goal
Create a minimal viable plugin that provides a chat interface to interact with Claude directly within Obsidian. This establishes the foundation for all future features.

## Scope: What's In
- Basic chat interface in a sidebar
- Direct communication with Claude API
- Message history within a session
- Simple settings for API key configuration
- Basic markdown rendering of responses
- Clear conversation functionality

## Scope: What's Out (Future Phases)
- File operations or vault awareness
- Conversation persistence between sessions
- Context from notes
- Multiple conversations
- Advanced formatting or code highlighting
- Image/attachment support
- Token usage tracking
- Conversation export

## User Stories

### As a user, I want to...
1. Open a chat panel in Obsidian's sidebar
2. Enter my Anthropic API key once in settings
3. Type messages to Claude and receive responses
4. See the conversation history during my session
5. Clear the conversation and start fresh
6. Have responses rendered in readable markdown format

## Technical Specification

### Plugin Structure
```
chat-plugin/
├── src/
│   ├── main.ts           # Plugin entry point
│   ├── ChatView.ts       # Chat sidebar view
│   ├── ChatService.ts    # Claude API communication
│   ├── types.ts          # TypeScript interfaces
│   └── settings.ts       # Settings tab
├── styles.css            # Plugin styles
├── manifest.json         # Plugin metadata
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
└── README.md             # User documentation
```

### Core Components

#### 1. Main Plugin (main.ts)
```typescript
export default class ClaudeChatPlugin extends Plugin {
  settings: PluginSettings;
  chatView: ChatView;

  async onload() {
    // Load settings
    // Register chat view
    // Add ribbon icon to open chat
    // Add settings tab
  }

  async onunload() {
    // Cleanup
  }
}
```

#### 2. Chat View (ChatView.ts)
**Responsibilities:**
- Render chat UI in sidebar
- Handle user input
- Display message history
- Manage conversation state (in-memory only)

**UI Elements:**
- Messages container (scrollable)
- Input text area
- Send button
- Clear conversation button
- Loading indicator

**Message Format:**
```typescript
interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
```

#### 3. Chat Service (ChatService.ts)
**Responsibilities:**
- Communicate with Claude API
- Handle API errors
- Format messages for API

**Key Methods:**
```typescript
class ChatService {
  async sendMessage(
    messages: Message[],
    apiKey: string
  ): Promise<string>

  private formatMessages(messages: Message[]): APIMessage[]
}
```

**API Integration:**
- Use Anthropic SDK (@anthropic-ai/sdk)
- Model: claude-3-5-sonnet-20241022 (latest)
- Max tokens: 4096 (configurable in future)
- Temperature: 1.0 (default)

#### 4. Settings (settings.ts)
**Configuration Options:**
```typescript
interface PluginSettings {
  apiKey: string;  // Anthropic API key
}

const DEFAULT_SETTINGS: PluginSettings = {
  apiKey: ''
}
```

**Settings UI:**
- Text input for API key (password field)
- Link to Anthropic console for getting API key
- Validation indicator (optional: test connection)

### UI Design

#### Chat Sidebar Layout
```
┌─────────────────────────────┐
│ Claude Chat            [×]   │
├─────────────────────────────┤
│                             │
│ [User Message]              │
│                             │
│     [Assistant Response]    │
│                             │
│ [User Message]              │
│                             │
│     [Assistant Response]    │
│                             │
│                             │
│         ↓ (scrollable)      │
│                             │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ Type a message...       │ │
│ └─────────────────────────┘ │
│              [Send] [Clear] │
└─────────────────────────────┘
```

#### Message Styling
- **User messages**: Right-aligned, subtle background
- **Assistant messages**: Left-aligned, distinct background
- **Markdown rendering**: Use Obsidian's markdown renderer
- **Timestamps**: Optional, small text below messages

#### Theme Integration
- Use Obsidian CSS variables for colors
- Support both light and dark themes
- Match native Obsidian styling

### Error Handling

#### API Errors
- Invalid API key: Show clear error message with link to settings
- Rate limits: Display friendly message with retry suggestion
- Network errors: Show connection error with retry button
- API errors: Display error message from API

#### User Experience
- Disable send button while waiting for response
- Show loading indicator during API calls
- Prevent sending empty messages
- Handle long messages gracefully

### Data Flow

1. **User sends message**:
   ```
   User Input → ChatView → Validate → Add to messages[]
   → ChatService.sendMessage() → Anthropic API
   → Response → Add to messages[] → Update UI
   ```

2. **Clear conversation**:
   ```
   Clear Button → Confirm → messages = [] → Update UI
   ```

3. **Settings change**:
   ```
   Settings Tab → Update apiKey → Save to disk
   → Available for next API call
   ```

### Dependencies

#### Required npm Packages
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.1",
    "obsidian": "latest"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "typescript": "^5.3.3",
    "esbuild": "^0.19.11"
  }
}
```

### Build Configuration

#### esbuild Config
- Bundle to single main.js
- Target ES2018
- Minification for production
- Source maps for development

### Testing Strategy (Manual for MVP)

#### Checklist
- [ ] Plugin loads without errors
- [ ] Ribbon icon appears and opens chat
- [ ] Settings tab is accessible
- [ ] Can save API key
- [ ] Can send messages and receive responses
- [ ] Messages display correctly with markdown
- [ ] Clear conversation works
- [ ] Error messages display properly
- [ ] Works in light and dark themes
- [ ] Sidebar can be closed and reopened
- [ ] No console errors

## Implementation Steps

### Phase 1: Project Setup (Day 1)
1. Initialize plugin structure from Obsidian sample plugin
2. Set up TypeScript and build configuration
3. Create basic manifest.json
4. Test plugin loads in Obsidian

### Phase 2: Settings (Day 1)
1. Create settings tab
2. Add API key input field
3. Implement settings save/load
4. Test settings persistence

### Phase 3: Chat View UI (Day 2)
1. Create ChatView class extending ItemView
2. Build HTML structure for chat interface
3. Style with CSS matching Obsidian theme
4. Add to sidebar with ribbon icon
5. Test open/close functionality

### Phase 4: Message Handling (Day 2-3)
1. Create Message interface and types
2. Implement message display in UI
3. Handle user input and send button
4. Add clear conversation functionality
5. Implement scrolling behavior

### Phase 5: API Integration (Day 3)
1. Create ChatService class
2. Integrate Anthropic SDK
3. Implement sendMessage method
4. Handle API responses
5. Add error handling

### Phase 6: Polish & Testing (Day 4)
1. Add loading states
2. Improve error messages
3. Test all functionality
4. Fix bugs
5. Write README

## Success Criteria

### Functional Requirements
- ✓ User can open chat panel from ribbon
- ✓ User can configure API key in settings
- ✓ User can send messages to Claude
- ✓ Assistant responses display correctly
- ✓ Conversation history shows during session
- ✓ User can clear conversation
- ✓ Errors are handled gracefully

### Non-Functional Requirements
- ✓ Plugin loads in < 1 second
- ✓ UI is responsive (no freezing)
- ✓ Messages render within 100ms of receiving
- ✓ Follows Obsidian plugin guidelines
- ✓ Works on desktop (Windows, Mac, Linux)

## Future Enhancements (Post-MVP)

These will be tackled in subsequent versions:
1. Conversation persistence
2. Multiple conversations/tabs
3. Copy message to clipboard
4. Code syntax highlighting
5. Token usage display
6. Regenerate response
7. Edit sent messages
8. Export conversation as note
9. Keyboard shortcuts (Cmd+Enter to send)
10. Context from active note

## Documentation

### README Contents
- What the plugin does
- How to install
- How to get an Anthropic API key
- Basic usage instructions
- Known limitations
- Future roadmap (link to VISION.md)
- Contributing guidelines
- License

### User-Facing
- Clear onboarding for first-time users
- Link to API key setup in settings
- Helpful error messages
- Basic usage tips

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| API key security | High | Store in Obsidian's secure settings, warn users |
| API costs | Medium | Document token usage, add limits in future |
| API rate limits | Medium | Implement retry logic, show friendly errors |
| Large responses | Low | Stream responses in future, handle gracefully |
| Plugin crashes | High | Thorough error handling, testing |

## Definition of Done

- [ ] All functional requirements met
- [ ] All success criteria achieved
- [ ] No critical bugs
- [ ] README documentation complete
- [ ] Plugin tested in fresh Obsidian vault
- [ ] Code is clean and commented
- [ ] Ready for community plugin submission

## Timeline Estimate

**Total: 4-5 days for MVP**

- Day 1: Project setup, settings
- Day 2: Chat UI implementation
- Day 3: API integration, message handling
- Day 4: Polish, testing, documentation
- Day 5: Buffer for issues

## Next Steps After MVP

1. Gather user feedback
2. Fix any critical bugs
3. Plan Phase 2 (Vault Integration) based on feedback
4. Submit to Obsidian community plugins
5. Create demo video
6. Write launch blog post

---

**Note**: This MVP is intentionally minimal to validate the core concept and get user feedback quickly. All advanced features are deliberately excluded to enable rapid development and iteration.
