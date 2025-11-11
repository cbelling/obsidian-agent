# Contributing to Obsidian Agent

Thank you for considering contributing to Obsidian Agent! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [How to Contribute](#how-to-contribute)
4. [Development Workflow](#development-workflow)
5. [Coding Standards](#coding-standards)
6. [Testing Requirements](#testing-requirements)
7. [Pull Request Process](#pull-request-process)
8. [Issue Guidelines](#issue-guidelines)

---

## Code of Conduct

This project adheres to a code of conduct that promotes a welcoming and inclusive environment:

- **Be respectful**: Treat all contributors with respect and courtesy
- **Be constructive**: Provide helpful feedback and suggestions
- **Be collaborative**: Work together to improve the project
- **Be patient**: Remember that everyone is learning and growing

Unacceptable behavior will not be tolerated and may result in removal from the project.

---

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js 16+** and npm installed
- **Git** for version control
- **Obsidian desktop app** for testing
- **TypeScript knowledge** (intermediate level recommended)
- **Familiarity with Obsidian plugin API** (helpful but not required)

### Setting Up Your Development Environment

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR-USERNAME/obsidian-agent.git
   cd obsidian-agent
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/charlesbellinger/obsidian-agent.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Create a test vault** for development (or use an existing one)

6. **Symlink the plugin** to your test vault:
   ```bash
   ln -s $(pwd) "/path/to/test-vault/.obsidian/plugins/obsidian-agent"
   ```

7. **Start development mode**:
   ```bash
   npm run dev
   ```

See [DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed development instructions.

---

## How to Contribute

### Types of Contributions

We welcome all types of contributions:

- **Bug fixes**: Fix issues reported in GitHub Issues
- **Feature enhancements**: Improve existing features
- **New features**: Add new capabilities (discuss first in an issue)
- **Documentation**: Improve docs, add examples, fix typos
- **Tests**: Add test coverage for existing code
- **Performance**: Optimize performance bottlenecks
- **Code quality**: Refactor code, improve types, add comments

### Finding Something to Work On

1. **Check existing issues**: Look for issues labeled `good first issue` or `help wanted`
2. **Review the roadmap**: See what features are planned for future versions
3. **Fix bugs**: Pick an open bug report and submit a fix
4. **Improve docs**: Documentation can always be improved
5. **Add tests**: Increase test coverage in areas that need it

If you want to work on something that doesn't have an issue, please create one first to discuss the approach.

---

## Development Workflow

### 1. Create a Branch

Always create a new branch for your work:

```bash
# Update your fork with latest changes
git fetch upstream
git checkout main
git merge upstream/main

# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

### 2. Make Your Changes

- Write clean, readable code following our [coding standards](#coding-standards)
- Add tests for new functionality
- Update documentation if needed
- Keep commits focused and atomic

### 3. Test Your Changes

Before submitting, ensure:

```bash
# All tests pass
npm test

# Build succeeds
npm run build

# Test in Obsidian
# 1. Reload plugin (Cmd/Ctrl + R)
# 2. Test your changes manually
# 3. Check console for errors
```

### 4. Commit Your Changes

Write clear, descriptive commit messages:

```bash
# Good commit messages
git commit -m "feat: Add streaming support for agent responses"
git commit -m "fix: Resolve pagination bug in search results"
git commit -m "docs: Update README with caching documentation"
git commit -m "test: Add tests for VaultService pagination"

# Use conventional commit format:
# feat: New feature
# fix: Bug fix
# docs: Documentation changes
# test: Test additions or modifications
# refactor: Code refactoring
# perf: Performance improvements
# chore: Build process or tooling changes
```

### 5. Push and Create Pull Request

```bash
# Push to your fork
git push origin feature/your-feature-name

# Then create a Pull Request on GitHub
```

---

## Coding Standards

### TypeScript Guidelines

- **Use explicit types**: Always specify parameter and return types
- **Avoid `any`**: Use proper types or `unknown`
- **Prefer `const`**: Use `const` over `let` when possible
- **Use async/await**: Instead of `.then()` chains
- **Document complex logic**: Add comments for non-obvious code

**Example:**

```typescript
// Good
async function readFile(path: string): Promise<string> {
    const file = this.vault.getAbstractFileByPath(path);

    if (!file || !(file instanceof TFile)) {
        throw new Error(`File not found: ${path}`);
    }

    return await this.vault.read(file);
}

// Avoid
function readFile(path: any): any {
    let file = this.vault.getAbstractFileByPath(path);
    return this.vault.read(file);
}
```

### Error Handling

Always use the `ErrorHandler` for consistent error handling:

```typescript
import { ErrorHandler } from './errors/ErrorHandler';

try {
    await someOperation();
} catch (error) {
    const agentError = ErrorHandler.handle(error);
    ErrorHandler.log(agentError);
    throw agentError;
}
```

### File Organization

- Keep files focused on a single responsibility
- Use clear, descriptive file names
- Group related files in directories
- Export only what's needed (avoid default exports)

### Naming Conventions

- **Classes**: PascalCase (`VaultService`, `AgentGraph`)
- **Functions/Methods**: camelCase (`searchFiles`, `readFile`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_LIMIT`, `MAX_RETRIES`)
- **Interfaces/Types**: PascalCase (`SearchOptions`, `PaginatedResults`)
- **Private members**: prefix with `_` (`_cacheStore`, `_pruneInterval`)

---

## Testing Requirements

### Test Coverage Requirements

All contributions must maintain or improve test coverage:

- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

### Writing Tests

Tests should be:

1. **Focused**: Test one thing at a time
2. **Descriptive**: Use clear test names
3. **Independent**: Don't rely on test execution order
4. **Fast**: Avoid unnecessary delays

**Test structure:**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('FeatureName', () => {
    beforeEach(() => {
        // Setup
    });

    it('should handle success case', () => {
        // Test implementation
    });

    it('should handle error case', () => {
        // Test implementation
    });

    it('should handle edge case', () => {
        // Test implementation
    });
});
```

Use mocks from `src/__tests__/mocks/` for Obsidian API.

### Running Tests

```bash
# Run all tests
npm test

# Run in watch mode (recommended during development)
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific tests
npm test -- VaultService
```

---

## Pull Request Process

### Before Submitting

Ensure your PR:

- [ ] Has a clear, descriptive title
- [ ] References related issues (e.g., "Fixes #123")
- [ ] Includes tests for new functionality
- [ ] Updates documentation if needed
- [ ] Passes all tests (`npm test`)
- [ ] Builds successfully (`npm run build`)
- [ ] Follows coding standards
- [ ] Has meaningful commit messages

### PR Description Template

```markdown
## Description
Brief description of what this PR does.

## Related Issue
Fixes #123

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
How did you test these changes?

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Tests pass
- [ ] Build succeeds
- [ ] Documentation updated
- [ ] Follows coding standards
```

### Review Process

1. **Automated checks**: CI runs tests and build
2. **Code review**: Maintainers review your code
3. **Feedback**: Address any requested changes
4. **Approval**: Once approved, PR will be merged
5. **Cleanup**: Delete your branch after merge

### Tips for Getting Your PR Accepted

- **Keep it focused**: One feature/fix per PR
- **Write tests**: PRs with tests are prioritized
- **Update docs**: Help users understand your changes
- **Respond promptly**: Address feedback quickly
- **Be patient**: Reviews take time

---

## Issue Guidelines

### Reporting Bugs

When reporting bugs, please include:

1. **Clear title**: Describe the bug briefly
2. **Steps to reproduce**: How to trigger the bug
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **Environment**:
   - Obsidian version
   - Plugin version
   - Operating system
   - Mobile or desktop
6. **Console logs**: Any relevant error messages
7. **Screenshots**: If applicable

**Bug report template:**

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Obsidian version: 1.x.x
- Plugin version: 1.x.x
- OS: macOS/Windows/Linux/iOS/Android
- Platform: Desktop/Mobile

## Console Logs
```
Paste error logs here
```

## Screenshots
Add screenshots if helpful
```

### Requesting Features

When requesting features:

1. **Clear description**: What feature do you want?
2. **Use case**: Why is this feature needed?
3. **Proposed solution**: How might it work?
4. **Alternatives**: Any alternative approaches?
5. **Willingness to contribute**: Can you help implement it?

**Feature request template:**

```markdown
## Feature Description
Clear description of the feature

## Use Case
Why is this feature needed?

## Proposed Solution
How might this feature work?

## Alternatives Considered
Any alternative approaches?

## Additional Context
Any other relevant information

## Willing to Contribute
- [ ] I would like to implement this feature
- [ ] I can help with testing
- [ ] I can help with documentation
```

---

## Additional Resources

- [DEVELOPMENT.md](docs/DEVELOPMENT.md) - Detailed development guide
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture documentation
- [README.md](README.md) - User documentation
- [Obsidian Plugin API](https://docs.obsidian.md/) - Official API docs
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/) - Agent framework
- [Anthropic API Docs](https://docs.anthropic.com/) - Claude API reference

---

## Questions?

If you have questions:

1. Check existing documentation
2. Search closed issues
3. Open a new issue with your question
4. Tag it with the `question` label

---

## Thank You!

Thank you for contributing to Obsidian Agent! Every contribution, no matter how small, helps improve the project for everyone.

We appreciate your time and effort in making this plugin better.
