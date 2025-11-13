# ESLint Configuration Enhancement - Specification

**Version:** 1.0.0
**Status:** ✅ Ready for Implementation
**Parent:** V0.0 Development Infrastructure & Tooling Setup
**Estimated Duration:** 3 days
**Decision:** Re-enable type safety warnings (Option A) + Add Prettier

---

## Executive Summary

This specification defines the ESLint configuration enhancement for the Obsidian Agent plugin. The goal is to establish comprehensive linting standards, enforce TypeScript and LangGraph best practices, add automated code formatting with Prettier, and integrate linting into the development workflow.

**Key Deliverables:**
1. Enhanced `eslint.config.mjs` configuration (ESLint 9.x flat config)
2. Prettier integration for code formatting
3. Pre-commit hooks (Husky + lint-staged) for both ESLint and Prettier
4. Resolution of all async/promise errors (18 warnings → 0 errors)
5. Documentation of type safety warnings with eslint-disable comments
6. CI/CD enforcement (errors fail build, warnings tracked)
7. Developer documentation

**Key Decisions:**
- ✅ Upgrade async rules to errors (prevent bugs)
- ✅ Re-enable type safety warnings (Option A - track issues)
- ✅ Add Prettier for code formatting
- ❌ Do NOT use Airbnb config (too opinionated, conflicts with Obsidian patterns)

---

## Current State Analysis

### Existing ESLint Setup

**✅ Already Configured:**
- **ESLint 9.x flat config:** `eslint.config.mjs` (modern format)
- TypeScript ESLint plugin: `@typescript-eslint/eslint-plugin@^8.46.4`
- TypeScript parser: `@typescript-eslint/parser@^8.46.4`
- Lint scripts in package.json:
  - `npm run lint`: Check for errors (`eslint src --ext .ts`)
  - `npm run lint:fix`: Auto-fix issues
- CI integration: `.github/workflows/test.yml` runs linting
- **Current config ignores:** Tests (`src/__tests__/**/*`), build outputs, configs

**Current Rule Configuration:**
```javascript
// eslint.config.mjs (excerpt)
rules: {
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
  '@typescript-eslint/no-unsafe-assignment': 'off',      // ⚠️ Disabled
  '@typescript-eslint/no-unsafe-member-access': 'off',   // ⚠️ Disabled
  '@typescript-eslint/no-unsafe-argument': 'off',        // ⚠️ Disabled
  '@typescript-eslint/no-floating-promises': 'warn',     // ⚠️ Warning only
  '@typescript-eslint/no-misused-promises': 'warn',      // ⚠️ Warning only
  '@typescript-eslint/await-thenable': 'warn',           // ⚠️ Warning only
  'no-console': 'off'
}
```

**⚠️ Gaps and Issues:**
- **No `.eslintignore` file** (using inline ignores in config)
- **No pre-commit hooks** to prevent bad code from being committed
- **Critical safety rules disabled:** `no-unsafe-assignment`, `no-unsafe-member-access`, `no-unsafe-argument`
- **Async rules as warnings:** `no-floating-promises`, `no-misused-promises` should be errors
- **Current warnings:** 31 total across 7 files:
  - `ChatView.ts`: 7 warnings (4 misused promises, 1 floating promise, 2 any types)
  - `AgentGraph.ts`: 11 warnings (10 any types, 1 await-thenable)
  - `CheckpointService.ts`: 2 warnings (floating promises)
  - `main.ts`: 5 warnings (4 floating promises, 1 misused promise)
  - `async-hooks-stub.ts`: 1 warning (any type)
  - `ConversationManager.ts`: 1 warning (any type)
  - `VaultService.ts`: 4 warnings (any types)

### Current Warnings Breakdown

#### ChatView.ts (7 warnings)
- **4 misused promises:** Promise-returning functions in void contexts (lines 82, 133, 139, 472)
- **1 floating promise:** Unawaited promise (line 121)
- **2 any types:** Untyped variables (lines 273, 284)

#### AgentGraph.ts (11 warnings)
- **10 any types:** Untyped variables throughout (lines 77, 159, 179, 221, 296, 304, 322, 324, 351, 362)
- **1 await-thenable:** Awaiting non-promise (line 357)

#### Other Files (13 warnings)
- **CheckpointService.ts:** 2 floating promises (constructor cleanup)
- **main.ts:** 4 floating promises + 1 misused promise (plugin lifecycle)
- **async-hooks-stub.ts:** 1 any type (polyfill implementation)
- **ConversationManager.ts:** 1 any type
- **VaultService.ts:** 4 any types

---

## Objectives

1. **Async Safety (Critical):** Prevent floating promises and misused promises - upgrade to errors
2. **Type Safety (Progressive):** Re-enable type safety warnings to track issues, fix incrementally
3. **Code Formatting (New):** Add Prettier for consistent, automated formatting
4. **Code Quality:** Establish consistent code patterns and best practices
5. **LangGraph Patterns:** Optimize rules for LangGraph-specific code
6. **Obsidian Compatibility:** Account for Obsidian API patterns
7. **Developer Experience:** Auto-fix where possible, auto-format on save, clear error messages
8. **CI/CD Integration:** Block merges on errors (not warnings)

---

## Detailed Implementation Plan

### 1. ESLint Configuration Enhancement

**File:** `eslint.config.mjs` (already exists, will be updated)

The project uses **ESLint 9.x flat config format** (modern approach). We will enhance the existing configuration rather than replace it.

#### Current Configuration (Reference)

```javascript
// eslint.config.mjs (current state)
export default [
  {
    ignores: [
      'node_modules/**',
      'main.js',
      'coverage/**',
      '*.config.js',
      '*.config.mjs',
      'src/__tests__/**/*'
    ]
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2020,
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      // Current rules (see analysis above)
    }
  }
];
```

#### Proposed Changes Summary

**Key Changes:**
1. **Upgrade async rules from warnings to errors:** `no-floating-promises`, `no-misused-promises`
2. **Keep type safety warnings:** Gradual migration from `any` (don't break existing code)
3. **Add new rules:** Code quality, performance, LangGraph patterns
4. **Keep tests ignored:** Maintain current test exclusion

#### Updated Rule Categories

**1. Async/Promise Handling (High Priority - CHANGES)**

**Current:** Warnings only
**Proposed:** Errors (prevent bugs from being committed)

```javascript
{
  '@typescript-eslint/no-floating-promises': 'error',        // ⬆️ warn → error
  '@typescript-eslint/no-misused-promises': 'error',         // ⬆️ warn → error
  '@typescript-eslint/await-thenable': 'error',              // ⬆️ warn → error
  '@typescript-eslint/promise-function-async': 'warn',       // NEW
  '@typescript-eslint/require-await': 'off'                  // Keep off (false positives)
}
```

**Rationale:**
- `no-floating-promises`: Prevents forgotten await/catch (current issue in ChatView.ts)
- `no-misused-promises`: Ensures promises used correctly in conditionals
- `await-thenable`: Prevents awaiting non-promises
- `promise-function-async`: Functions returning promises should be async
- `require-await`: Async functions should actually await something

**2. Type Safety (MINIMAL CHANGES)**

**Current:** Most unsafe rules are OFF
**Proposed:** Keep as warnings for gradual improvement

```javascript
{
  '@typescript-eslint/no-explicit-any': 'warn',              // ✅ Keep (already set)
  '@typescript-eslint/no-unsafe-assignment': 'warn',         // ⬆️ off → warn (re-enable)
  '@typescript-eslint/no-unsafe-member-access': 'warn',      // ⬆️ off → warn (re-enable)
  '@typescript-eslint/no-unsafe-call': 'warn',               // NEW
  '@typescript-eslint/no-unsafe-return': 'warn',             // NEW
  '@typescript-eslint/no-unsafe-argument': 'warn',           // ⬆️ off → warn (re-enable)
  '@typescript-eslint/strict-boolean-expressions': 'off'     // Keep off
}
```

**Rationale:**
- Warnings (not errors) allow gradual migration from `any`
- Current codebase has 31 `any` warnings - fixing all would be too disruptive
- Re-enabling disabled rules helps identify problem areas
- Can address incrementally over time

**3. LangGraph-Specific Patterns (MINOR ADDITIONS)**

**Current:** Basic unused vars pattern
**Proposed:** Add caught errors and vars patterns

```javascript
{
  '@typescript-eslint/no-unused-vars': ['error', {
    'argsIgnorePattern': '^_',                               // ✅ Keep (already set)
    'varsIgnorePattern': '^_',                               // NEW
    'caughtErrors': 'all',                                   // NEW
    'caughtErrorsIgnorePattern': '^_'                        // NEW
  }],
  '@typescript-eslint/naming-convention': ['warn', {         // NEW
    'selector': 'variable',
    'format': ['camelCase', 'PascalCase', 'UPPER_CASE'],
    'leadingUnderscore': 'allow'
  }]
}
```

**Rationale:**
- LangGraph often has unused state parameters (use `_` prefix for clarity)
- Allow unused caught errors (common in error handlers that only log)
- Support multiple naming conventions (component names, constants)

**4. Code Quality (NEW RULES)**

General best practices to add:

```javascript
{
  'no-console': 'off',                                       // ✅ Keep (already set)
  'prefer-const': 'error',                                   // NEW
  'no-var': 'error',                                         // NEW
  'eqeqeq': ['error', 'always', { 'null': 'ignore' }],       // NEW
  'curly': ['error', 'all'],                                 // NEW
  'no-throw-literal': 'error'                                // NEW
}
```

**Rationale:**
- Keep console.* allowed (debugging is important for plugin development)
- Enforce modern JS patterns (const, ===)
- Require curly braces (prevent subtle bugs)
- Throw proper Error objects (better stack traces)

**5. Obsidian Plugin Compatibility (NEW)**

Disable rules that conflict with Obsidian API patterns:

```javascript
{
  'no-prototype-builtins': 'off',                            // NEW
  '@typescript-eslint/no-namespace': 'off'                   // NEW
}
```

**Rationale:**
- Obsidian API uses `hasOwnProperty` directly in some places
- Obsidian uses namespaces in some API interfaces

**6. Performance (NEW - OPTIONAL)**

Consider adding for cleaner code:

```javascript
{
  '@typescript-eslint/no-unnecessary-condition': 'warn',     // NEW (optional)
  '@typescript-eslint/prefer-nullish-coalescing': 'warn',    // NEW (optional)
  '@typescript-eslint/prefer-optional-chain': 'warn'         // NEW (optional)
}
```

**Rationale:**
- Detect always-true/false conditions
- Prefer modern null-checking patterns (?? over ||)
- Use optional chaining (?. for cleaner code)

### 2. Prettier Configuration (NEW)

Prettier handles code formatting (indentation, quotes, semicolons, line length) while ESLint handles code quality and bugs.

#### Installation

```bash
npm install --save-dev prettier eslint-config-prettier
```

**Packages:**
- `prettier`: The code formatter
- `eslint-config-prettier`: Disables ESLint formatting rules that conflict with Prettier

#### Configuration Files

**File:** `.prettierrc`

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

**Rule Explanations:**
- `semi: true` - Always use semicolons (matches TypeScript convention)
- `singleQuote: true` - Use single quotes for strings (consistent with current codebase)
- `tabWidth: 2` - 2 spaces for indentation
- `useTabs: false` - Spaces, not tabs
- `trailingComma: "es5"` - Trailing commas where valid in ES5 (objects, arrays)
- `printWidth: 100` - Wrap lines at 100 characters
- `arrowParens: "avoid"` - Omit parens when possible: `x => x` not `(x) => x`
- `endOfLine: "lf"` - Unix-style line endings

**File:** `.prettierignore`

```
# Dependencies
node_modules/

# Build outputs
coverage/
dist/
main.js

# Generated files
*.config.mjs
esbuild.config.mjs
version-bump.mjs

# Checksums and locks
package-lock.json
*.log

# Documentation (may have specific formatting)
CHANGELOG.md
```

#### Integration with ESLint

Update `eslint.config.mjs` to disable conflicting rules:

```javascript
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';  // NEW

export default [
  // ... ignores config
  {
    // ... TypeScript config
    rules: {
      // ... all ESLint rules
    }
  },
  prettier  // NEW: Disables ESLint formatting rules that conflict with Prettier
];
```

#### NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "format": "prettier --write \"src/**/*.{ts,json,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,json,md}\""
  }
}
```

**Usage:**
- `npm run format` - Format all files
- `npm run format:check` - Check if files are formatted (for CI/CD)

#### Initial Formatting

Run once to format entire codebase:

```bash
npm run format
```

This will format all TypeScript files. Commit with:
```bash
git add .
git commit -m "chore: add Prettier and format codebase"
```

#### Editor Integration

**VS Code:** Create `.vscode/settings.json`

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

**Extensions to install:**
- ESLint (dbaeumer.vscode-eslint)
- Prettier (esbenp.prettier-vscode)

**WebStorm/IntelliJ:**
- Settings → Languages & Frameworks → Prettier
- Enable "On save"
- Set to run Prettier on `.ts` files

**Rationale:**
- **Auto-format on save:** Never think about formatting again
- **Consistent style:** All files look the same
- **Cleaner diffs:** Git shows only logical changes
- **Faster reviews:** No "fix indentation" comments

### 3. Pre-commit Hooks (ESLint + Prettier)

Pre-commit hooks run automatically before each commit to ensure code quality and formatting.

#### Installation

Install required dependencies:

```bash
npm install --save-dev husky lint-staged
```

Initialize Husky:

```bash
npx husky install
```

#### Husky Configuration

**File:** `.husky/pre-commit`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

**Permissions:** Must be executable

```bash
chmod +x .husky/pre-commit
```

#### Lint-Staged Configuration

**File:** `package.json` (add section)

```json
{
  "lint-staged": {
    "*.ts": [
      "prettier --write",
      "eslint --fix",
      "git add"
    ],
    "*.{json,md}": [
      "prettier --write",
      "git add"
    ]
  }
}
```

**Order matters:**
1. **Prettier first** - Format the code
2. **ESLint second** - Fix linting issues (auto-fixable)
3. **git add** - Stage the formatted/fixed files

**Rationale:**
- **Prevents bad code:** Blocks commits with linting errors
- **Auto-formats:** Prettier runs automatically
- **Auto-fixes:** ESLint fixes simple issues (unused imports, etc.)
- **Fast:** Only runs on staged files, not entire codebase

#### Package.json Scripts

Update `package.json` scripts:

```json
{
  "scripts": {
    "prepare": "husky install",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.{ts,json,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,json,md}\""
  }
}
```

**New scripts:**
- `prepare` - Auto-installs Husky hooks when running `npm install`
- `format` - Manually format all files
- `format:check` - Check if files are formatted (for CI/CD)

#### Testing the Pre-commit Hook

```bash
# Make a change to a file
echo "const x = 1" >> src/test.ts

# Stage the file
git add src/test.ts

# Try to commit (hook will run)
git commit -m "test: verify pre-commit hook"

# Hook will:
# 1. Format with Prettier
# 2. Lint with ESLint
# 3. Block commit if errors exist
# 4. Auto-fix and stage if possible
```

**Expected behavior:**
- ✅ **Formatting issues:** Auto-fixed by Prettier
- ✅ **Auto-fixable lint issues:** Auto-fixed by ESLint
- ❌ **Linting errors:** Commit blocked, must fix manually
- ✅ **All good:** Commit proceeds

### 4. Addressing Current Warnings

#### Strategy

**Current State:** 31 warnings across 7 files

**Proposed Approach:**
1. **Fix critical async/promise warnings first** (18 warnings - prevents bugs)
2. **Address type safety incrementally** (13 any-type warnings - can be done over time)
3. **Goal:** Zero async warnings, acceptable any-type warnings documented

**Rationale:**
- Async bugs are critical (can cause data loss, crashes)
- Type safety warnings can be addressed gradually
- Some `any` types may be necessary (Obsidian API, polyfills)

#### Priority 1: Async/Promise Warnings (18 total)

**Files Affected:**
- ChatView.ts: 5 async warnings (lines 82, 121, 133, 139, 472)
- CheckpointService.ts: 2 warnings (lines 45, 46)
- main.ts: 5 warnings (lines 68, 86, 95, 115, 140)
- AgentGraph.ts: 1 warning (line 357)

**Common Fix Patterns:**

**Pattern 1: Event Handlers (Misused Promises)**
```typescript
// ❌ Before (lines 82, 133, 139, 472 in ChatView)
button.addEventListener('click', async () => {
  await this.sendMessage(input.value); // ❌ Promise in void context
});

// ✅ After (proper handling)
button.addEventListener('click', () => {
  void this.sendMessage(input.value); // Explicitly ignore promise
});

// ✅ OR with error handling (better)
button.addEventListener('click', () => {
  this.sendMessage(input.value).catch(err => {
    console.error('Failed to send message:', err);
    new Notice('Failed to send message');
  });
});
```

**Pattern 2: Floating Promises (Unawaited)**
```typescript
// ❌ Before (line 121 in ChatView, lines 45/46 in CheckpointService)
this.cleanup(); // Returns promise, not awaited

// ✅ After
void this.cleanup(); // Explicit void

// ✅ OR
this.cleanup().catch(err => console.error('Cleanup failed:', err));
```

**Pattern 3: Plugin Lifecycle (Misused Promise)**
```typescript
// ❌ Before (line 115 in main.ts)
async onunload() {
  // Obsidian expects void, but we're returning Promise
}

// ✅ After
onunload() {
  // Don't make lifecycle methods async unless needed
  // If async work needed, use void:
  void this.cleanup();
}
```

**Pattern 4: Await Non-Thenable**
```typescript
// ❌ Before (line 357 in AgentGraph.ts)
await someNonPromiseValue;

// ✅ After
someNonPromiseValue; // Remove await if not a promise
```

#### Priority 2: Type Safety Warnings (13 total - Address Incrementally)

**Files Affected:**
- AgentGraph.ts: 10 warnings (any types)
- ChatView.ts: 2 warnings (lines 273, 284)
- VaultService.ts: 4 warnings
- Others: 3 warnings (polyfill, ConversationManager)

**Strategy:**
- Document legitimate `any` usage with `// eslint-disable-next-line` and comments
- Fix obvious cases where types are known
- Some may remain (Obsidian API, LangGraph internals, polyfills)

### 5. CI/CD Integration

#### GitHub Actions Workflow

**File:** `.github/workflows/test.yml` (update)

```yaml
name: Test, Lint & Format

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Check code formatting
        run: npm run format:check

      - name: Lint code
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Generate coverage
        run: npm run test:coverage
```

**Key Changes:**
1. **Added formatting check:** `npm run format:check` fails if code isn't formatted
2. **Linting errors fail build:** ESLint errors block merge
3. **Warnings are logged:** Warnings don't fail build (tracked separately)
4. **Order:** Format check → Lint → Tests (fail fast on style issues)

**Why not `--max-warnings 0`?**
- We're re-enabling type safety warnings (expect 50-100+ warnings initially)
- Warnings are tracked and fixed incrementally
- Errors (async bugs) still fail the build
- Can add `--max-warnings` later once warnings are under control

### 6. Documentation

**File:** `docs/development/LINTING.md`

#### Structure

1. **Overview**
   - Why we lint
   - ESLint configuration summary
   - Quick start guide

2. **Running Linting**
   - `npm run lint`: Check for errors
   - `npm run lint:fix`: Auto-fix issues
   - Pre-commit hooks (automatic)

3. **Editor Integration**
   - VS Code setup (recommended extensions)
   - WebStorm/IntelliJ setup
   - Vim/Neovim setup

4. **Rule Explanations**
   - Async/Promise rules and why they matter
   - Type safety rules
   - LangGraph patterns
   - When to use `eslint-disable` comments

5. **Common Patterns**
   - Event handlers with async functions
   - Type guards for Obsidian API
   - Handling tool results
   - Unused parameters in LangGraph nodes

6. **Troubleshooting**
   - Pre-commit hook not running
   - False positives (and how to disable)
   - Performance issues

---

## Implementation Checklist

### Phase 1: Prettier Setup (Day 1 Morning - 1-2 hours)

- [ ] Install Prettier packages:
  - [ ] `npm install --save-dev prettier`
  - [ ] `npm install --save-dev eslint-config-prettier`
- [ ] Create `.prettierrc` configuration file
- [ ] Create `.prettierignore` file
- [ ] Add Prettier scripts to `package.json`:
  - [ ] `format`: Format all files
  - [ ] `format:check`: Check formatting (for CI/CD)
- [ ] Create `.vscode/settings.json` for editor integration
- [ ] Run initial format: `npm run format`
- [ ] Review formatting changes
- [ ] Commit formatted code: `git commit -m "chore: add Prettier and format codebase"`

### Phase 2: ESLint Configuration Enhancement (Day 1 Morning - 1 hour)

- [ ] Update `eslint.config.mjs` with enhanced rules:
  - [ ] Import `eslint-config-prettier`
  - [ ] Upgrade async rules to errors (no-floating-promises, no-misused-promises, await-thenable)
  - [ ] Re-enable type safety warnings (no-unsafe-assignment, no-unsafe-member-access, etc.)
  - [ ] Add code quality rules (prefer-const, no-var, eqeqeq, curly)
  - [ ] Enhance LangGraph patterns (varsIgnorePattern, caughtErrors)
  - [ ] Add Obsidian compatibility rules (no-prototype-builtins, no-namespace)
  - [ ] Add prettier config at end to disable conflicting rules
- [ ] Test configuration: `npm run lint`
- [ ] Document expected warning increase (31 → 50-100+ warnings)

### Phase 3: Pre-commit Hooks (Day 1 Afternoon - 1 hour)

- [ ] Install Husky: `npm install --save-dev husky`
- [ ] Install lint-staged: `npm install --save-dev lint-staged`
- [ ] Initialize Husky: `npx husky install`
- [ ] Create `.husky/pre-commit` script
- [ ] Set executable permissions: `chmod +x .husky/pre-commit`
- [ ] Add `lint-staged` config to `package.json` (Prettier → ESLint → git add)
- [ ] Add `prepare` script to `package.json`
- [ ] Test pre-commit hook with dummy change
- [ ] Verify hook:
  - [ ] Auto-formats with Prettier
  - [ ] Auto-fixes with ESLint
  - [ ] Blocks commits with linting errors

### Phase 4: Fix Critical Async Errors (Day 2 - 4-6 hours)

**Priority:** Fix 18 async/promise warnings (now errors after config update)

**ChatView.ts** (5 errors)
- [ ] Line 82: Event handler misused promise - Add `.catch()` or `void`
- [ ] Line 121: Floating promise - Add `void` or `.catch()`
- [ ] Line 133: Event handler misused promise - Add `.catch()` or `void`
- [ ] Line 139: Event handler misused promise - Add `.catch()` or `void`
- [ ] Line 472: Event handler misused promise - Add `.catch()` or `void`

**CheckpointService.ts** (2 errors)
- [ ] Lines 45, 46: Floating promises in constructor - Add `void` or `.catch()`

**main.ts** (5 errors)
- [ ] Line 68: Floating promise - Add `void` or `.catch()`
- [ ] Line 86: Floating promise - Add `void` or `.catch()`
- [ ] Line 95: Floating promise - Add `void` or `.catch()`
- [ ] Line 115: onunload misused promise - Remove `async` or use `void`
- [ ] Line 140: Floating promise - Add `void` or `.catch()`

**AgentGraph.ts** (1 error)
- [ ] Line 357: Await non-thenable - Remove `await`

**Verification:**
- [ ] Run `npm run lint` - should show 0 async errors
- [ ] Try to commit - pre-commit hook should pass
- [ ] Verify all fixes use proper error handling (prefer `.catch()` over `void`)

### Phase 5: Document Type Safety Warnings (Day 2 - 1-2 hours)

After re-enabling type safety rules, many new warnings will appear (expect 50-100+).

- [ ] Run `npm run lint` and count total warnings
- [ ] Categorize warnings by file and type
- [ ] Add `// eslint-disable-next-line` with clear justifications:

  **Legitimate `any` usage (keep):**
  - [ ] async-hooks-stub.ts: Polyfill implementation (no types available)
  - [ ] AgentGraph.ts: LangGraph internal types (library limitation)
  - [ ] VaultService.ts: Obsidian API returns (API limitation)
  - [ ] ChatView.ts: Obsidian plugin access (API limitation)

  **Example format:**
  ```typescript
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Obsidian API returns any, no type available
  const plugin = this.app.plugins.plugins['obsidian-agent'];
  ```

- [ ] Create GitHub issue: "Reduce type safety warnings from X to <20"
- [ ] Document which warnings can be fixed vs. which are unavoidable
- [ ] Run `npm run lint` - confirm warnings are documented

### Phase 6: CI/CD Integration (Day 2 - 30 minutes)

- [ ] Update `.github/workflows/test.yml`:
  - [ ] Add `npm run format:check` step
  - [ ] Keep `npm run lint` step (errors fail build, warnings logged)
  - [ ] Add comment explaining warning policy
- [ ] Create feature branch
- [ ] Push to test CI/CD
- [ ] Verify:
  - [ ] Formatting errors fail build
  - [ ] Linting errors fail build
  - [ ] Warnings are logged but don't fail build
  - [ ] Tests still run

### Phase 7: Documentation (Day 3 - 3-4 hours)

- [ ] Create `docs/development/LINTING.md`:

  **Sections:**
  - [ ] Overview (why we lint, why we format)
  - [ ] Quick Start (running lint, running format)
  - [ ] Editor Integration:
    - [ ] VS Code setup (extensions, settings.json)
    - [ ] WebStorm setup
  - [ ] ESLint Rules Explained:
    - [ ] Async/Promise rules (why they're errors)
    - [ ] Type safety rules (why they're warnings)
    - [ ] Code quality rules
    - [ ] LangGraph patterns
  - [ ] Prettier Configuration (explain each option)
  - [ ] Common Fix Patterns:
    - [ ] Event handlers (misused promises)
    - [ ] Floating promises (void vs .catch())
    - [ ] Type guards for `any` types
  - [ ] Using eslint-disable:
    - [ ] When it's okay (legitimate `any` usage)
    - [ ] Required format (must have explanation)
  - [ ] Pre-commit Hooks (what happens when you commit)
  - [ ] CI/CD (what happens on push)
  - [ ] Troubleshooting:
    - [ ] Hook not running
    - [ ] False positives
    - [ ] Editor not formatting

- [ ] Review and polish documentation
- [ ] Add examples and screenshots where helpful

### Phase 8: Final Validation (Day 3 - 1 hour)

- [ ] Run full lint: `npm run lint`
  - [ ] Zero async/promise errors ✅
  - [ ] Type warnings documented with explanations ✅
  - [ ] Total warnings: X (tracked in GitHub issue)
- [ ] Run format check: `npm run format:check`
  - [ ] All files formatted ✅
- [ ] Test pre-commit hook:
  - [ ] Make formatting change → auto-fixed ✅
  - [ ] Make linting error → commit blocked ✅
  - [ ] Fix error → commit succeeds ✅
- [ ] Test CI/CD:
  - [ ] Push to feature branch
  - [ ] Verify all checks pass ✅
- [ ] Documentation review:
  - [ ] LINTING.md complete ✅
  - [ ] ESLINT_SPEC.md complete ✅
- [ ] Create PR for review
- [ ] Get approval and merge

---

## Success Criteria

### Quantitative
- ✅ Zero async/promise errors: All floating promises and misused promises fixed (18 warnings → 0 errors)
- ✅ Type warnings documented: All `any` types have eslint-disable comments with justification
- ✅ Pre-commit hook success rate: 100% (blocks commits with errors)
- ✅ CI/CD linting step passes (errors fail build, warnings logged)
- ✅ Linting adds < 30 seconds to CI/CD pipeline

### Qualitative
- ✅ Developers understand why async rules are critical
- ✅ Auto-fix resolves event handler patterns (void keyword)
- ✅ Clear error messages guide fixes
- ✅ Rules prevent real bugs (async data loss, crashes)
- ✅ Type warnings tracked for future improvement (GitHub issue)

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Rules too strict, block development | Medium | High | Use warnings for subjective rules, errors for bugs |
| Pre-commit hooks slow | Low | Medium | Only lint staged files, not entire codebase |
| Existing code has many violations | Medium | Medium | Fix warnings incrementally, allow `eslint-disable` with comments |
| Team resistance to linting | Low | High | Document rationale, show real bugs caught |
| CI/CD pipeline slowdown | Low | Low | Linting is fast (<30s), run in parallel with tests |

---

## Dependencies

### NPM Packages (New)
- `prettier@^3.0.0`: Code formatter
- `eslint-config-prettier@^9.0.0`: Disables ESLint formatting rules that conflict with Prettier
- `husky@^9.0.0`: Git hooks management
- `lint-staged@^15.0.0`: Run linters and formatters on staged files

### NPM Packages (Existing)
- `@typescript-eslint/eslint-plugin@^8.46.4`: TypeScript rules
- `@typescript-eslint/parser@^8.46.4`: TypeScript parser
- `eslint@^9.21.0`: Core linting engine

### Configuration Files (New)
- `.prettierrc`: Prettier configuration
- `.prettierignore`: Files to exclude from formatting
- `.husky/pre-commit`: Pre-commit hook script
- `.vscode/settings.json`: Editor integration (optional but recommended)

### Configuration Files (Modified)
- `eslint.config.mjs`: Enhanced with new rules and Prettier integration
- `package.json`: New scripts (format, format:check, prepare) and lint-staged config
- `.github/workflows/test.yml`: Added format check step

### Configuration Files (Existing)
- `tsconfig.json`: Required for type-aware linting

---

## Alternatives Considered

### 1. Use Biome Instead of ESLint

**Pros:**
- Faster than ESLint
- Built-in formatter (replaces Prettier)
- Simpler configuration

**Cons:**
- Less mature ecosystem
- Fewer TypeScript-specific rules
- Migration cost from existing ESLint setup

**Decision:** Stick with ESLint (already configured, mature ecosystem)

### 2. Skip Pre-commit Hooks

**Pros:**
- Faster local development
- Developers can commit work-in-progress code

**Cons:**
- More CI/CD failures
- Lower code quality baseline

**Decision:** Use pre-commit hooks (prevent issues early)

### 3. Warnings vs Errors

**Option A:** All rules as errors (strict)
**Option B:** Mix of warnings and errors (pragmatic)

**Decision:** Mix approach:
- **Errors:** Async bugs, type safety issues (prevent bugs)
- **Warnings:** Style, code quality (gradual improvement)

---

## Decisions Made

### Q1: Should we use Prettier alongside ESLint?

**Decision:** ✅ Yes, add Prettier

**Rationale:**
- Industry standard for TypeScript projects
- Separates concerns: ESLint for bugs, Prettier for formatting
- Auto-format on save improves developer experience
- Small codebase makes initial adoption easy
- Works seamlessly with ESLint via `eslint-config-prettier`

### Q2: Should we use Airbnb ESLint config?

**Decision:** ❌ No, do not use Airbnb

**Rationale:**
- Too opinionated (1000+ rules)
- Conflicts with Obsidian plugin patterns
- TypeScript ESLint recommended rules are sufficient
- Prettier handles style/formatting better than Airbnb's style rules
- Would require fixing hundreds of existing violations

### Q3: Re-enable type safety warnings?

**Decision:** ✅ Yes, re-enable as warnings (Option A)

**Rationale:**
- Visibility is better than ignorance
- Track type safety issues for gradual improvement
- Warnings don't block builds (can fix incrementally)
- Document legitimate `any` usage with eslint-disable comments
- Create tracking issue to reduce warnings over time

### Q4: Maximum function complexity limits?

**Decision:** ⏸️ Not now, revisit in V1.0

**Rationale:**
- Focus on critical bugs (async) first
- Current codebase functions are reasonably sized
- Can add later if complexity becomes an issue
- Complexity rules can be subjective

### Q5: Enforce strict naming conventions?

**Decision:** ⏸️ Light conventions only

**Rationale:**
- `naming-convention` rule added for variables (supports camelCase, PascalCase, UPPER_CASE)
- No file naming enforcement (too restrictive)
- Team is small (you), conventions emerge naturally
- Can tighten later if needed

---

## Timeline

**Total Duration:** 3 days

**Day 1: Setup**
- Morning: Create ESLint config, ignore file
- Afternoon: Install and configure pre-commit hooks
- End of day: Configuration tested and working

**Day 2: Fixes & CI/CD**
- Morning: Fix ChatView.ts warnings (7)
- Afternoon: Fix AgentGraph.ts warnings (5), update CI/CD
- End of day: Zero warnings achieved, CI/CD passing

**Day 3: Documentation & Validation**
- Morning: Write comprehensive linting documentation
- Afternoon: Final validation, team review
- End of day: All deliverables complete, ready to merge

---

## Definition of Done

- [ ] `.eslintrc.json` created with all specified rules
- [ ] `.eslintignore` configured
- [ ] Husky + lint-staged installed and working
- [ ] All 12 current warnings resolved
- [ ] `npm run lint -- --max-warnings 0` passes
- [ ] Pre-commit hook prevents new violations
- [ ] CI/CD workflow updated and passing
- [ ] `docs/development/LINTING.md` complete
- [ ] Code reviewed and approved
- [ ] Changes merged to main branch

---

## Next Steps After Completion

With ESLint fully configured:
1. **Monitor for false positives:** Adjust rules if needed
2. **Educate team:** Share linting guide with contributors
3. **Iterate on rules:** Add stricter rules gradually as codebase matures
4. **Consider Prettier:** Add code formatting if team agrees
5. **Move to V0.0 completion:** Complete LangSmith and template setup

---

## Appendix: Complete eslint.config.mjs (Enhanced)

```javascript
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    // Global ignores
    ignores: [
      'node_modules/**',
      'main.js',
      'coverage/**',
      'dist/**',
      '*.config.js',
      '*.config.mjs',
      'src/__tests__/**/*'  // Keep tests excluded
    ]
  },
  {
    // TypeScript files
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2022,  // Updated from 2020
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      // Base recommended rules
      ...tseslint.configs.recommended.rules,
      ...tseslint.configs['recommended-requiring-type-checking'].rules,

      // === ASYNC/PROMISE HANDLING (UPGRADED TO ERRORS) ===
      '@typescript-eslint/no-floating-promises': 'error',        // ⬆️ warn → error
      '@typescript-eslint/no-misused-promises': 'error',         // ⬆️ warn → error
      '@typescript-eslint/await-thenable': 'error',              // ⬆️ warn → error
      '@typescript-eslint/promise-function-async': 'warn',       // NEW
      '@typescript-eslint/require-await': 'off',                 // Keep off

      // === TYPE SAFETY (RE-ENABLED AS WARNINGS) ===
      '@typescript-eslint/no-explicit-any': 'warn',              // ✅ Keep
      '@typescript-eslint/no-unsafe-assignment': 'warn',         // ⬆️ off → warn
      '@typescript-eslint/no-unsafe-member-access': 'warn',      // ⬆️ off → warn
      '@typescript-eslint/no-unsafe-call': 'warn',               // NEW
      '@typescript-eslint/no-unsafe-return': 'warn',             // NEW
      '@typescript-eslint/no-unsafe-argument': 'warn',           // ⬆️ off → warn
      '@typescript-eslint/strict-boolean-expressions': 'off',    // Keep off

      // === LANGGRAPH PATTERNS (ENHANCED) ===
      '@typescript-eslint/no-unused-vars': ['error', {
        'argsIgnorePattern': '^_',                               // ✅ Keep
        'varsIgnorePattern': '^_',                               // NEW
        'caughtErrors': 'all',                                   // NEW
        'caughtErrorsIgnorePattern': '^_'                        // NEW
      }],
      '@typescript-eslint/naming-convention': ['warn', {         // NEW
        'selector': 'variable',
        'format': ['camelCase', 'PascalCase', 'UPPER_CASE'],
        'leadingUnderscore': 'allow'
      }],

      // === CODE QUALITY (NEW) ===
      'no-console': 'off',                                       // ✅ Keep
      'prefer-const': 'error',                                   // NEW
      'no-var': 'error',                                         // NEW
      'eqeqeq': ['error', 'always', { 'null': 'ignore' }],       // NEW
      'curly': ['error', 'all'],                                 // NEW
      'no-throw-literal': 'error',                               // NEW

      // === OBSIDIAN COMPATIBILITY (NEW) ===
      'no-prototype-builtins': 'off',                            // NEW
      '@typescript-eslint/no-namespace': 'off',                  // NEW

      // === PERFORMANCE (OPTIONAL - commented out initially) ===
      // '@typescript-eslint/no-unnecessary-condition': 'warn',
      // '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      // '@typescript-eslint/prefer-optional-chain': 'warn',

      // === EXISTING RULES (KEEP) ===
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off'
    }
  }
];
```

**Key Changes Summary:**
1. ⬆️ **Upgraded to errors:** `no-floating-promises`, `no-misused-promises`, `await-thenable`
2. ⬆️ **Re-enabled as warnings:** Type safety rules (`no-unsafe-*`)
3. ✨ **New rules:** Code quality, LangGraph patterns, Obsidian compatibility
4. 🎨 **Prettier integration:** Disables conflicting rules at the end
5. 📝 **Comments:** Clear markers for what changed and why

---

## Appendix B: Complete .prettierrc

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

---

## Appendix C: Complete package.json Scripts

```json
{
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.{ts,json,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,json,md}\"",
    "prepare": "husky install",
    "version": "node version-bump.mjs && git add manifest.json versions.json",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch"
  },
  "lint-staged": {
    "*.ts": [
      "prettier --write",
      "eslint --fix",
      "git add"
    ],
    "*.{json,md}": [
      "prettier --write",
      "git add"
    ]
  }
}
```

---

## Appendix D: VS Code Settings (.vscode/settings.json)

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[markdown]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

**Required VS Code Extensions:**
- ESLint (dbaeumer.vscode-eslint)
- Prettier - Code formatter (esbenp.prettier-vscode)

---

## Appendix E: Installation Commands Summary

```bash
# Install all dependencies
npm install --save-dev prettier eslint-config-prettier husky lint-staged

# Initialize Husky
npx husky install

# Create pre-commit hook
npx husky add .husky/pre-commit "npx lint-staged"

# Make hook executable
chmod +x .husky/pre-commit

# Format codebase (first time)
npm run format

# Commit formatted code
git add .
git commit -m "chore: add Prettier and format codebase"

# Test the setup
npm run lint          # Should show errors for async issues
npm run format:check  # Should pass after formatting
```

---

**End of Specification**

**Version:** 1.0.0
**Status:** ✅ Ready for Implementation
**Approved By:** User
**Date:** 2025-01-13
