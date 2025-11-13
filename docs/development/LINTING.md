# Linting Guide

This document explains the ESLint configuration and linting standards for the Obsidian Agent project.

## Overview

We use ESLint with TypeScript support to maintain code quality and consistency. The linting rules enforce best practices for TypeScript, LangGraph patterns, and Obsidian plugin development.

## Configuration Files

### `.eslintrc.json`

Main ESLint configuration with comprehensive TypeScript rules:

- **Async/Promise Handling**: Enforces proper promise handling to prevent floating promises and misused promises
- **Type Safety**: Warns about explicit `any` types and unsafe type operations
- **Code Quality**: Enforces `const` over `let`, bans `var`, and controls console usage
- **LangGraph Patterns**: Allows underscore-prefixed unused variables (common in LangGraph)

### `.eslintignore`

Specifies files and directories to exclude from linting:
- `node_modules/`
- `coverage/`
- `dist/`
- `main.js`
- Build configuration files (`*.config.mjs`)

## Running Linting

### Check for issues

```bash
npm run lint
```

### Auto-fix issues

```bash
npm run lint:fix
```

## ESLint Rules

### Async/Promise Rules (Errors)

These rules prevent common async/await mistakes:

- `@typescript-eslint/no-floating-promises`: Promises must be awaited or handled
- `@typescript-eslint/no-misused-promises`: Promises shouldn't be used where void is expected
- `@typescript-eslint/await-thenable`: Only await actual promises
- `@typescript-eslint/promise-function-async`: Functions returning promises should be async (warning)

**Example fixes:**

```typescript
// ❌ Bad: Floating promise
someAsyncFunction();

// ✅ Good: Explicitly void fire-and-forget
void someAsyncFunction();

// ✅ Good: Await the promise
await someAsyncFunction();

// ❌ Bad: Promise in event handler
button.addEventListener('click', () => handleClick());

// ✅ Good: Explicitly mark as fire-and-forget
button.addEventListener('click', () => void handleClick());
```

### Type Safety Rules (Warnings)

These rules encourage better type safety:

- `@typescript-eslint/no-explicit-any`: Warns about `any` types
- `@typescript-eslint/no-unsafe-assignment`: Warns about unsafe type assignments
- `@typescript-eslint/no-unsafe-member-access`: Warns about accessing properties on `any`
- `@typescript-eslint/no-unsafe-call`: Warns about calling functions on `any`

**When to use `any`:**

Sometimes `any` is necessary (e.g., for external API compatibility). In these cases:

```typescript
// Add a comment explaining why
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const apiData = response as any; // Anthropic SDK type complexity
```

**Better alternatives:**

```typescript
// ❌ Avoid: Using any
const data: any = getUserData();

// ✅ Better: Use unknown and type guard
const data: unknown = getUserData();
if (isUserData(data)) {
  // TypeScript knows data is UserData here
}

// ✅ Better: Use Record for objects
const metadata: Record<string, unknown> = getMetadata();
```

### Code Quality Rules

- `no-console`: Warns about `console.log` (allows `console.warn` and `console.error`)
- `prefer-const`: Enforces `const` for variables that are never reassigned
- `no-var`: Bans `var` in favor of `let`/`const`
- `no-prototype-builtins`: Disabled (Obsidian API uses this pattern)

### LangGraph-Specific Patterns

- `@typescript-eslint/no-unused-vars`: Allows underscore-prefixed variables like `_state`

```typescript
// ✅ OK: Underscore prefix for intentionally unused params
async function toolHandler(_context: Context, input: ToolInput) {
  return process(input);
}
```

## Pre-commit Hooks

Husky and lint-staged automatically lint staged files before commits:

```json
{
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "git add"
    ]
  }
}
```

This ensures that:
1. Linting runs only on changed files (fast)
2. Auto-fixable issues are corrected automatically
3. Fixed files are re-staged for commit
4. Commits are blocked if unfixable errors remain

### Bypassing Pre-commit Hooks

**Not recommended**, but if absolutely necessary:

```bash
git commit --no-verify -m "message"
```

## CI/CD Integration

GitHub Actions runs linting on every push and PR:

1. **Lint check**: `npm run lint`
2. **Zero warnings**: `npm run lint -- --max-warnings 0`

Both must pass for CI to succeed.

## Editor Integration

### VS Code

Install the ESLint extension:

```bash
code --install-extension dbaeumer.vscode-eslint
```

Add to `.vscode/settings.json`:

```json
{
  "eslint.validate": ["typescript"],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### WebStorm / IntelliJ

1. Go to **Settings** → **Languages & Frameworks** → **JavaScript** → **Code Quality Tools** → **ESLint**
2. Enable **Automatic ESLint configuration**
3. Enable **Run eslint --fix on save**

### Vim/Neovim

Install ALE or use built-in LSP with `eslint-lsp`:

```vim
" Using ALE
let g:ale_fixers = {
\   'typescript': ['eslint'],
\}
let g:ale_fix_on_save = 1
```

## Common Patterns and Fixes

### Event Handlers with Async Functions

```typescript
// ❌ Bad: Promise returned where void expected
button.addEventListener('click', () => handleClick());

// ✅ Good: Explicitly void
button.addEventListener('click', () => void handleClick());
```

### Constructor Calls to Async Methods

```typescript
class Service {
  constructor() {
    // ❌ Bad: Floating promise in constructor
    this.initialize();
  }

  // ✅ Good: Void for fire-and-forget
  constructor() {
    void this.initialize();
  }

  private async initialize() {
    // async initialization
  }
}
```

### Type Assertions for Complex External APIs

```typescript
// When dealing with complex SDK types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
tools: convertedTools as any // Anthropic SDK type mismatch

// Or use Record<string, unknown> for objects
const toolInput: Record<string, unknown> = parseInput(data);
```

### Removing Unnecessary Awaits

```typescript
// ❌ Warning: await-thenable
const result = await synchronousFunction();

// ✅ Fixed: Remove await
const result = synchronousFunction();
```

## Temporarily Disabling Rules

### Single Line

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = externalApi.getData();
```

### Block

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
function legacyCode() {
  const data: any = {};
  return data as any;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
```

### File

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
// Entire file disabled for any rule
```

**Important**: Always add a comment explaining why the rule is disabled.

## Troubleshooting

### "Promises must be awaited"

This usually means you're calling an async function but not handling the returned promise.

**Solutions:**
1. `await` the promise if you need the result
2. Use `void` if it's intentional fire-and-forget
3. Add `.catch()` if you want to handle errors without await

### "Unexpected any"

**Solutions:**
1. Use proper types: `Record<string, unknown>`, `unknown`, or specific interfaces
2. Add type guards to narrow `unknown` types
3. If truly necessary, add `eslint-disable-next-line` with explanation

### "Promise returned where void expected"

Common in event handlers and callbacks.

**Solution**: Use `void` operator:
```typescript
element.addEventListener('click', () => void asyncHandler());
```

## Best Practices

1. **Fix warnings incrementally**: Don't accumulate linting warnings
2. **Use auto-fix**: Run `npm run lint:fix` before committing
3. **Don't disable rules globally**: Use targeted disables with comments
4. **Keep config up-to-date**: Update ESLint and plugins regularly
5. **Document exceptions**: Always comment why a rule is disabled

## Related Documentation

- [ESLint TypeScript Plugin](https://typescript-eslint.io/)
- [Obsidian Plugin Best Practices](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)

## Summary

Our linting setup ensures:
- ✅ No floating promises or misused async/await
- ✅ Minimal use of `any` types
- ✅ Consistent code style
- ✅ Early error detection
- ✅ Automatic fixes via pre-commit hooks
- ✅ Zero warnings in CI/CD

Keep the codebase clean by running `npm run lint:fix` before commits!
