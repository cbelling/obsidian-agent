# Contributing to Claude Chat

Thank you for your interest in contributing to Claude Chat! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Keep discussions on topic

## How to Contribute

### Reporting Bugs

Before creating a bug report:
1. Check existing [issues](https://github.com/charlesbellinger/obsidian-claude-chat/issues)
2. Verify the bug with the latest version
3. Collect relevant information (OS, Obsidian version, console errors)

**When reporting:**
- Use a clear, descriptive title
- Describe the expected vs actual behavior
- Include steps to reproduce
- Add screenshots if applicable
- Include console errors (Cmd/Ctrl + Shift + I)

### Suggesting Features

Feature suggestions are welcome! Please:
1. Check if it's already on the [roadmap](docs/VISION.md)
2. Search existing feature requests
3. Describe the problem it solves
4. Explain your proposed solution
5. Consider if it fits the plugin's scope

### Pull Requests

#### Before Starting

1. **Check existing issues** - Someone might already be working on it
2. **Discuss major changes** - Open an issue first for big features
3. **Read the docs** - Familiarize yourself with [DEVELOPMENT.md](docs/DEVELOPMENT.md)

#### Development Process

1. **Fork and clone** the repository
   ```bash
   git clone https://github.com/YOUR-USERNAME/obsidian-claude-chat
   cd obsidian-claude-chat
   ```

2. **Create a branch** from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Set up development** environment
   ```bash
   npm install
   npm run dev
   ```

4. **Make your changes**
   - Write clean, documented code
   - Follow existing code style
   - Test thoroughly

5. **Test your changes**
   - [ ] Plugin loads without errors
   - [ ] New feature works as expected
   - [ ] Existing features still work
   - [ ] No console errors
   - [ ] Works on light and dark themes
   - [ ] Mobile compatible (if applicable)

6. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

   Use conventional commit format:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation only
   - `style:` - Formatting, no code change
   - `refactor:` - Code restructuring
   - `test:` - Adding tests
   - `chore:` - Build/tooling changes

7. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then open a pull request on GitHub

#### PR Guidelines

**Title:** Clear and descriptive
- ✅ "Add conversation persistence to ChatView"
- ❌ "Update code"

**Description should include:**
- What changes were made
- Why these changes were needed
- How to test the changes
- Screenshots/videos for UI changes
- Related issue numbers

**Before submitting:**
- [ ] Code follows project style
- [ ] Comments added for complex logic
- [ ] No console.log statements (unless intentional)
- [ ] Build passes (`npm run build`)
- [ ] Documentation updated if needed

## Code Style

### TypeScript

```typescript
// ✅ Good
async function handleMessage(content: string): Promise<void> {
    if (!content.trim()) {
        return;
    }

    try {
        const response = await this.apiService.send(content);
        this.displayMessage(response);
    } catch (error) {
        console.error('Failed to send message:', error);
        new Notice('Failed to send message');
    }
}

// ❌ Avoid
async function handle(c: string) {
    if (!c.trim()) return;
    let r = await this.apiService.send(c);
    this.displayMessage(r);
}
```

### CSS

```css
/* ✅ Good - Use Obsidian variables */
.claude-chat-container {
    background-color: var(--background-primary);
    color: var(--text-normal);
    padding: 16px;
}

/* ❌ Avoid - Hardcoded colors */
.claude-chat-container {
    background-color: #ffffff;
    color: #000000;
}
```

### Best Practices

- **Type safety:** Use TypeScript types, avoid `any`
- **Error handling:** Always catch and handle errors
- **User feedback:** Show notices for important actions
- **Performance:** Don't block the UI thread
- **Accessibility:** Support keyboard navigation
- **Mobile:** Consider mobile screen sizes

## Project Structure

```
chat-plugin/
├── src/                    # Source code
│   ├── main.ts            # Plugin entry
│   ├── ChatView.ts        # UI component
│   ├── ChatService.ts     # API service
│   ├── settings.ts        # Settings UI
│   └── types.ts           # Type definitions
├── docs/                   # Documentation
├── styles.css             # Styling
└── README.md              # User docs
```

## Testing

### Manual Testing Checklist

Test your changes against this checklist:

**Basic Functionality:**
- [ ] Plugin loads successfully
- [ ] Settings save correctly
- [ ] Chat opens from ribbon icon
- [ ] Chat opens from command palette
- [ ] Messages send and receive
- [ ] Clear conversation works

**Edge Cases:**
- [ ] Empty messages are blocked
- [ ] API errors are handled gracefully
- [ ] Long messages work correctly
- [ ] Special characters render properly
- [ ] Rate limiting is handled

**Visual:**
- [ ] Light theme looks good
- [ ] Dark theme looks good
- [ ] Mobile layout works (if applicable)
- [ ] No visual glitches
- [ ] Scrolling works smoothly

**Performance:**
- [ ] No lag when typing
- [ ] Long conversations don't slow down
- [ ] Memory usage is reasonable

## Documentation

Update docs when you:
- Add a new feature
- Change existing behavior
- Add configuration options
- Modify the API

Which docs to update:
- `README.md` - User-facing changes
- `docs/DEVELOPMENT.md` - Developer setup/workflow
- `docs/VISION.md` - New planned features
- Code comments - Complex logic

## Getting Help

Stuck or have questions?

- Check [DEVELOPMENT.md](docs/DEVELOPMENT.md)
- Search existing [issues](https://github.com/charlesbellinger/obsidian-claude-chat/issues)
- Ask in the Obsidian Discord [#plugin-dev](https://discord.gg/obsidianmd)
- Open a [discussion](https://github.com/charlesbellinger/obsidian-claude-chat/discussions)

## Recognition

Contributors will be:
- Listed in CHANGELOG for their contributions
- Mentioned in release notes
- Added to GitHub contributors page

Thank you for contributing to Claude Chat! 🎉
