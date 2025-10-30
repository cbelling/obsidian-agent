# Obsidian Claude Plugin - Product Vision & Roadmap

> **Source of truth for product vision, development roadmap, and release planning**

## Project Status & Roadmap

### Development Phases

| Phase | Status | Document | Description |
|-------|--------|----------|-------------|
| **MVP** | ✅ Complete | [MVP.md](./MVP.md) | Basic chat interface with Claude API integration |
| **V1.0** | 🚧 In Planning | [V1.md](./V1.md) | "Obsidian Agent" - Vault awareness (read-only) & LangGraph persistence |
| **V2.0** | 📋 Planned | [V2.md](./V2.md) | File write operations and active note integration |
| **V3.0** | 📋 Future | TBD | Intelligence layer: semantic search and smart linking |
| **V4.0** | 📋 Future | TBD | Agentic features and autonomous workflows |

---

## Overview
An Obsidian community plugin that brings Claude's AI capabilities directly into your knowledge base, enabling seamless interaction with your notes, research automation, and agentic workflows without leaving Obsidian.

## Core Philosophy
- **Vault-Aware**: Claude understands your Obsidian vault structure, links, and content
- **Non-Intrusive**: Works alongside your existing workflow without disrupting it
- **Context-Rich**: Leverages your notes as context for more relevant responses
- **Agentic**: Can perform actions on your behalf within Obsidian

## Future State Features

### 1. Intelligent Chat Interface
- **Persistent Conversations**: Save and resume conversations across sessions
- **Context Selection**: Choose which notes/folders Claude can access
- **Multi-Modal**: Support for images, PDFs, and other attachments in your vault
- **Conversation Export**: Save conversations as notes in your vault
- **Inline Citations**: Responses include links to relevant notes in your vault

### 2. Vault Awareness & Integration
- **File Operations**:
  - Create, edit, and organize notes based on conversations
  - Update existing notes with new information
  - Create bidirectional links between related content
- **Search & Discovery**:
  - Semantic search across your entire vault
  - Find connections between seemingly unrelated notes
  - Suggest tags and metadata
- **Graph Understanding**:
  - Analyze your note graph structure
  - Suggest new connections
  - Identify knowledge gaps

### 3. Research & Automation
- **Research Assistant**:
  - Gather information on topics and create structured notes
  - Synthesize information from multiple sources
  - Generate literature reviews with citations
- **Content Generation**:
  - Create outlines and drafts based on your notes
  - Expand on existing ideas
  - Generate summaries of long-form content
- **Automated Workflows**:
  - Daily note enhancement
  - Meeting notes processing
  - Zettelkasten-style note creation
  - Periodic review and consolidation

### 4. Agentic Capabilities
- **Task Execution**:
  - Execute multi-step workflows autonomously
  - "Research X and create a comprehensive note"
  - "Find all notes about Y and create a summary"
- **Scheduled Actions**:
  - Weekly vault reviews
  - Automatic note linking
  - Content recommendations
- **Smart Suggestions**:
  - Proactive insights based on your writing
  - Related note recommendations while you work
  - Writing improvement suggestions

### 5. Advanced Features
- **Templates & Prompts**:
  - Custom prompt library for common tasks
  - Template-based note generation
  - Role-specific personas (researcher, editor, etc.)
- **Collaboration**:
  - Shared prompt libraries
  - Community templates
  - Plugin integrations (Dataview, Templater, etc.)
- **Privacy & Security**:
  - Local-only mode option
  - Selective vault access
  - Conversation encryption
  - API key management

### 6. UI/UX Enhancements
- **Multiple Interface Options**:
  - Sidebar chat panel
  - Modal dialog for quick queries
  - Inline chat within notes
  - Command palette integration
- **Customization**:
  - Theming support (matches Obsidian themes)
  - Configurable hotkeys
  - Layout preferences
- **Status & Feedback**:
  - Token usage tracking
  - Operation progress indicators
  - Error handling with actionable feedback

## Technical Architecture

### Core Components
1. **Chat Engine**: Manages Claude API communication
2. **Vault Service**: Handles file operations and graph traversal
3. **Context Manager**: Selects and prepares relevant context
4. **Action Executor**: Performs operations on vault
5. **State Manager**: Persists conversations and settings

### Integration Points
- Obsidian API for file operations
- Claude API (Anthropic)
- Optional: MCP servers for extended functionality
- Optional: Local embedding models for semantic search

### Data Storage
- Conversations stored as JSON in plugin folder
- Settings in standard Obsidian settings format
- Optional: Conversation notes in vault

## Success Metrics
- **Adoption**: Active users, retention rate
- **Engagement**: Conversations per user, actions executed
- **Value**: Time saved, notes created, connections made
- **Quality**: User satisfaction, feature requests, bug reports

## Phased Rollout

> See detailed specifications in phase-specific documents

### Phase 1: MVP ✅ Complete
**[MVP.md](./MVP.md)** - Basic chat interface with manual context
- Simple chat sidebar
- Direct Claude API integration
- Basic settings and API key management

### Phase 2: V1.0 🚧 In Planning
**[V1.md](./V1.md)** - "Obsidian Agent" - Vault Awareness & Persistence
- Agent identity and vault awareness (read-only)
- Conversation persistence with LangGraph
- Vault search and file reading tools
- Thread-based conversation management

### Phase 3: V2.0 📋 Planned
**[V2.md](./V2.md)** - Vault Integration
- Read and write notes
- Basic file operations
- Context from vault

### Phase 4: V3.0 📋 Future
Intelligence Layer
- Semantic search
- Automatic context selection
- Smart linking

### Phase 5: V4.0 📋 Future
Agentic Features
- Multi-step workflows
- Autonomous research
- Scheduled actions

### Phase 6: V5.0+ 📋 Future
Advanced Features
- Community features
- Extended integrations
- Advanced customization

## Design Principles
1. **Start Simple**: MVP should be immediately useful
2. **Incremental Enhancement**: Add features based on user feedback
3. **Respect Privacy**: User data stays local when possible
4. **Performance First**: Don't slow down Obsidian
5. **Native Feel**: Look and feel like Obsidian
6. **Extensible**: Plugin architecture for future expansion

## Competitive Differentiation
Unlike ChatGPT or Claude.ai, this plugin:
- Works directly in your knowledge environment
- Understands your note structure and relationships
- Can take actions on your behalf within Obsidian
- Respects your privacy (local-first option)
- Integrates with your existing Obsidian workflow
- No context switching required

## Risks & Mitigations
- **API Costs**: Provide token usage tracking, allow user-configurable limits
- **Performance**: Lazy loading, efficient context selection, caching
- **Privacy**: Clear data handling policies, local-only options
- **Complexity**: Phased rollout, excellent documentation
- **API Changes**: Abstract API layer, version compatibility

## Open Questions
1. Should we support multiple AI providers (OpenAI, local models)?
2. How to handle large vaults efficiently?
3. What's the best way to represent conversations in the vault?
4. Should there be a mobile version?
5. How to price/monetize (if at all)?
