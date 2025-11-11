# Codebase Cleanup Specification

**Version:** 1.0
**Date:** 2025-11-11
**Status:** Ready for Implementation
**Estimated Time:** 2-4 hours

## Executive Summary

This specification outlines required cleanup tasks to resolve inconsistencies, remove technical debt, and improve maintainability of the Obsidian Agent codebase. Issues were identified through senior engineering review on 2025-11-11.

**Priority Breakdown:**
- 🔴 Critical: 3 items (version sync, naming, changelog)
- ⚠️ Major: 3 items (dependencies, ESLint, built files)
- ⚙️ Minor: 4 items (documentation, utilities, coverage)

---

## Table of Contents

1. [Critical Issues](#1-critical-issues)
2. [Major Issues](#2-major-issues)
3. [Minor Issues](#3-minor-issues)
4. [Implementation Order](#4-implementation-order)
5. [Validation Steps](#5-validation-steps)
6. [Rollback Plan](#6-rollback-plan)

---

## 1. Critical Issues

### 1.1 Package Name Resolution 🔴

**Problem:** Inconsistent naming between package identifier and project name.

**Current State:**
```
package.json:          "obsidian-claude-chat"
manifest.json:         "obsidian-agent"
Project name:          "obsidian-agent"
CHANGELOG URLs:        "obsidian-claude-chat"
```

**Decision Required:** Choose ONE name for the entire project.

**Recommendation:** Use `obsidian-agent` (already in manifest, more generic, future-proof)

**Implementation:**

#### Option A: Rename to "obsidian-agent" (RECOMMENDED)

**Files to update:**
1. `package.json`
   ```json
   {
     "name": "obsidian-agent",
     "version": "1.1.0",
     "description": "AI agent powered by Claude that can search and interact with your vault"
   }
   ```

2. `package-lock.json`
   - Will auto-update on next `npm install`

3. `CHANGELOG.md`
   ```markdown
   [Unreleased]: https://github.com/charlesbellinger/obsidian-agent/compare/v1.1.0...HEAD
   [1.1.0]: https://github.com/charlesbellinger/obsidian-agent/releases/tag/v1.1.0
   [1.0.0]: https://github.com/charlesbellinger/obsidian-agent/releases/tag/v1.0.0
   [0.1.0]: https://github.com/charlesbellinger/obsidian-agent/releases/tag/v0.1.0
   ```

#### Option B: Keep "obsidian-claude-chat"

**Files to update:**
1. `manifest.json` - Change id to "obsidian-claude-chat"
2. Update all documentation references
3. Update README title

**Testing:**
- [ ] `npm install` completes without errors
- [ ] `npm run build` succeeds
- [ ] `npm test` passes
- [ ] Plugin loads in Obsidian with correct name

---

### 1.2 Version Synchronization 🔴

**Problem:** Multiple version numbers across project files are out of sync.

**Current State:**
```
package.json:3        "version": "0.1.0"
manifest.json:4       "version": "1.0.0"
versions.json:2       "0.1.0": "0.15.0"
README.md:139         Claims "v1.1.0" as current
CLAUDE.md:4           No version specified
CHANGELOG.md:20       Latest entry: "0.1.0"
```

**Target State:** All files should reflect **v1.1.0**

**Rationale:** README documents v1.1.0 features (streaming, pagination, caching), so this should be the canonical version.

**Implementation:**

1. **`package.json`**
   ```json
   {
     "version": "1.1.0"
   }
   ```

2. **`manifest.json`**
   ```json
   {
     "version": "1.1.0",
     "minAppVersion": "0.15.0"
   }
   ```

3. **`versions.json`**
   ```json
   {
     "0.1.0": "0.15.0",
     "1.0.0": "0.15.0",
     "1.1.0": "0.15.0"
   }
   ```

4. **`CLAUDE.md:4`** (Update project overview section)
   ```markdown
   Current version: **V1.1.0** (streaming, pagination, caching)
   ```

**Testing:**
- [ ] Version numbers match across all files
- [ ] `npm version` command shows correct version
- [ ] Plugin loads with correct version in Obsidian settings

---

### 1.3 CHANGELOG Update 🔴

**Problem:** CHANGELOG is severely outdated and lists completed features as "Planned"

**Current Issues:**
- Latest entry is v0.1.0 (2025-10-30)
- "Unreleased" section lists features that are already implemented
- Missing v1.0.0 and v1.1.0 release notes
- Users have no visibility into what changed

**Implementation:**

Replace entire `CHANGELOG.md` with updated version:

```markdown
# Changelog

All notable changes to the Obsidian Agent plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned for v2.0
- Write operations (create, update, delete files)
- Active note integration
- Automatic context from current note

See [docs/V2.md](docs/V2.md) for V2.0 roadmap.

---

## [1.1.0] - 2025-11-11

### Added
- ⚡ **Streaming Responses**: Real-time response generation with token-by-token display
- 📄 **Smart Pagination**: Handles large vaults efficiently (default 50 results, max 1000)
- 🚀 **Intelligent Caching**: 90% faster repeated operations with TTL-based cache (60s files, 30s searches)
- 🛡️ **Enhanced Error Handling**:
  - Comprehensive error codes (15+ error types)
  - Automatic retry with exponential backoff (3 attempts, 1s-30s delays)
  - User-friendly error messages
- ⏱️ **Rate Limiting**: Token bucket rate limiter (10 req/min) prevents API throttling
- 📊 **Data Retention**: Configurable automatic cleanup (default 30 days)
- 📱 **Mobile Support**: AsyncLocalStorage polyfill for mobile compatibility
- 🔄 **Graceful Degradation**: Continues working if optional services fail

### Changed
- Improved vault tool performance with caching
- Enhanced search operations with pagination support
- Better error messages for all failure scenarios

### Technical
- Added `src/errors/` module with ErrorHandler, RetryHandler, RateLimiter
- Added `src/utils/Cache.ts` with TTL-based in-memory caching
- Added `src/polyfills/async-hooks.ts` for mobile support
- Comprehensive testing: 137+ tests with 80%+ code coverage
- Updated dependencies for security and performance

---

## [1.0.0] - 2025-11-02

### Added
- 🤖 **LangGraph Agent**: Powered by Anthropic Claude Sonnet 4.5
- 💾 **Persistent Conversations**: LangGraph checkpoint system for conversation state
- 🗂️ **Multi-threaded Conversations**: Create and switch between multiple chat threads
- 🔍 **Vault Integration**: 8 specialized tools for vault operations:
  - **Search Tools**: by filename, content (full-text), tags (frontmatter/inline)
  - **Read Tools**: read files, list directory contents
  - **Metadata Tools**: file metadata, backlinks, outgoing links
- 🎨 **Native Obsidian Design**: Matches light/dark theme automatically
- ✨ **Markdown Support**: Full markdown rendering in chat responses
- 🔒 **Privacy First**: Direct Anthropic API communication, local storage
- 🧪 **LangSmith Integration**: Optional tracing for debugging (desktop only)

### Technical
- TypeScript codebase with strict type checking
- Vitest test framework with comprehensive test coverage
- Mock Obsidian environment for testing
- Custom AsyncLocalStorage polyfill for mobile
- Read-only vault access (V1 scope)

### Documentation
- Comprehensive README with user guide
- CLAUDE.md for Claude Code integration
- CONTRIBUTING.md for contributors
- Architecture documentation
- Development guide

---

## [0.1.0] - 2025-10-30

### Added
- Initial MVP release
- Basic chat interface in sidebar
- Claude Sonnet 4.5 integration via Anthropic API
- Settings tab for API key configuration
- Markdown rendering in responses
- Session-based conversation history
- Clear conversation functionality
- Ribbon icon for quick access
- Command palette integration
- Theme support (light/dark)
- Error handling with user-friendly messages
- Loading states and indicators

### Technical
- TypeScript codebase
- ESBuild for bundling
- Obsidian API integration
- Anthropic SDK integration
- Mobile-compatible design

### Documentation
- README with user instructions
- Installation guide
- Development setup guide
- Vision document with roadmap
- Contributing guidelines
- MIT License

---

[Unreleased]: https://github.com/charlesbellinger/obsidian-agent/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/charlesbellinger/obsidian-agent/releases/tag/v1.1.0
[1.0.0]: https://github.com/charlesbellinger/obsidian-agent/releases/tag/v1.0.0
[0.1.0]: https://github.com/charlesbellinger/obsidian-agent/releases/tag/v0.1.0
```

**Testing:**
- [ ] All version links use correct repository name
- [ ] Features listed match actual implementation
- [ ] Chronological order is correct
- [ ] Follows Keep a Changelog format

---

## 2. Major Issues

### 2.1 Remove Built Files from Git ⚠️

**Problem:** `main.js` (2.3MB) is tracked in git despite being in `.gitignore`

**Current State:**
```bash
$ git status
M main.js  # 2,289,261 bytes - should not be tracked
```

**Implementation:**

```bash
# Remove from git tracking but keep local file
git rm --cached main.js

# Commit the change
git commit -m "chore: Remove built file from version control

The main.js file is generated during build and should not be tracked.
It's already in .gitignore but was accidentally committed."

# Verify it's gone from tracking
git status
```

**Documentation Update:**

Add to `.gitignore` comments:
```gitignore
# Build
main.js         # Generated by esbuild - do not commit
main.js.map
*.js.map
```

**Testing:**
- [ ] `git status` shows main.js as untracked
- [ ] `git ls-files main.js` returns empty
- [ ] Local main.js still exists and works
- [ ] `npm run build` still generates main.js

---

### 2.2 ESLint Configuration ⚠️

**Problem:** ESLint is partially configured but not functional

**Current State:**
- ESLint packages installed: `@typescript-eslint/eslint-plugin@6.19.0`, `@typescript-eslint/parser@6.19.0`
- No ESLint configuration file
- No `lint` script in package.json
- GitHub workflow tries to run `npm run lint --if-present` (line 37)
- Workflow has `continue-on-error: true` to mask the issue

**Decision Required:** Fix ESLint OR remove it completely

#### Option A: Add ESLint Configuration (RECOMMENDED)

**Rationale:** Code quality enforcement is valuable for team collaboration

**Implementation:**

1. **Create `.eslintrc.json`**
   ```json
   {
     "root": true,
     "parser": "@typescript-eslint/parser",
     "parserOptions": {
       "project": "./tsconfig.json",
       "ecmaVersion": 2020,
       "sourceType": "module"
     },
     "plugins": ["@typescript-eslint"],
     "extends": [
       "eslint:recommended",
       "plugin:@typescript-eslint/recommended",
       "plugin:@typescript-eslint/recommended-requiring-type-checking"
     ],
     "rules": {
       "@typescript-eslint/no-explicit-any": "warn",
       "@typescript-eslint/explicit-function-return-type": "off",
       "@typescript-eslint/explicit-module-boundary-types": "off",
       "@typescript-eslint/no-unused-vars": [
         "error",
         { "argsIgnorePattern": "^_" }
       ],
       "no-console": "off"
     },
     "ignorePatterns": [
       "node_modules/",
       "main.js",
       "coverage/",
       "*.config.js",
       "*.config.mjs"
     ]
   }
   ```

2. **Add `.eslintignore`**
   ```
   node_modules/
   main.js
   main.js.map
   coverage/
   *.config.js
   *.config.mjs
   ```

3. **Update `package.json` scripts**
   ```json
   {
     "scripts": {
       "dev": "node esbuild.config.mjs",
       "build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production",
       "lint": "eslint src --ext .ts",
       "lint:fix": "eslint src --ext .ts --fix",
       "version": "node version-bump.mjs && git add manifest.json versions.json",
       "test": "vitest",
       "test:ui": "vitest --ui",
       "test:coverage": "vitest run --coverage",
       "test:watch": "vitest watch"
     }
   }
   ```

4. **Fix any linting errors**
   ```bash
   npm run lint:fix
   # Then manually fix remaining issues
   ```

5. **Update GitHub workflow** (`.github/workflows/test.yml:36-38`)
   ```yaml
   # Run linter
   - name: Lint code
     run: npm run lint
   ```

**Testing:**
- [ ] `npm run lint` runs successfully
- [ ] `npm run lint:fix` auto-fixes issues
- [ ] No blocking lint errors (warnings are OK)
- [ ] GitHub workflow passes

#### Option B: Remove ESLint

**Implementation:**

1. **Remove dependencies from `package.json`**
   ```bash
   npm uninstall @typescript-eslint/eslint-plugin @typescript-eslint/parser
   ```

2. **Remove from GitHub workflow** (`.github/workflows/test.yml:35-38`)
   Delete these lines:
   ```yaml
   # Run linter (if configured)
   - name: Lint code
     run: npm run lint --if-present
     continue-on-error: true
   ```

**Testing:**
- [ ] `npm install` completes without ESLint
- [ ] GitHub workflow runs without lint step
- [ ] Build still succeeds

---

### 2.3 Dependency Updates ⚠️

**Problem:** Multiple outdated dependencies with security and feature updates available

**Current Outdated Packages:**
```
Package                            Current    Latest  Type
@typescript-eslint/eslint-plugin    6.21.0    8.46.4  devDependencies
@typescript-eslint/parser           6.21.0    8.46.4  devDependencies
typescript                          5.3.3     5.9.3   devDependencies
esbuild                            0.19.11    0.27.0  devDependencies
builtin-modules                     3.3.0     5.0.0   devDependencies
tslib                               2.6.2     2.8.1   devDependencies

@types/node                       20.19.24   24.10.0  devDependencies
langsmith                          0.2.15     0.3.79  dependencies
langchain                           1.0.2     1.0.4   dependencies
@langchain/core                     1.0.2     1.0.4   dependencies
@langchain/langgraph                1.0.1     1.0.2   dependencies
zod                                3.25.76    4.1.12  dependencies (MAJOR)
```

**Strategy:** Update in batches, test after each batch

#### Batch 1: TypeScript Tooling (Low Risk)

```bash
npm install --save-dev \
  @typescript-eslint/eslint-plugin@latest \
  @typescript-eslint/parser@latest \
  typescript@latest \
  esbuild@latest \
  builtin-modules@latest \
  tslib@latest \
  @types/node@latest
```

**Testing after Batch 1:**
- [ ] `npm run build` succeeds
- [ ] `npm test` passes
- [ ] Plugin loads in Obsidian
- [ ] No new TypeScript errors

#### Batch 2: LangChain Ecosystem (Medium Risk)

```bash
npm install \
  langchain@latest \
  @langchain/core@latest \
  @langchain/langgraph@latest \
  langsmith@latest
```

**Testing after Batch 2:**
- [ ] Agent initialization works
- [ ] All vault tools function correctly
- [ ] Conversation persistence works
- [ ] LangSmith tracing works (if enabled)
- [ ] All agent tests pass

#### Batch 3: Zod v4 (High Risk - MAJOR VERSION)

**⚠️ CAUTION:** Zod v4 is a major version update with breaking changes

**Before updating:**
1. Review Zod v4 migration guide: https://github.com/colinhacks/zod/releases
2. Identify all Zod usage in codebase:
   ```bash
   grep -r "import.*zod" src/
   # Expected: src/vault/VaultTools.ts (tool schemas)
   ```

**Update:**
```bash
npm install zod@latest zod-to-json-schema@latest
```

**Files to review:**
- `src/vault/VaultTools.ts` - All Zod schemas
- `src/agent/AgentState.ts` - State schema (if using Zod)

**Testing after Batch 3:**
- [ ] All vault tool schemas validate correctly
- [ ] Tool parameter parsing works
- [ ] Agent can call tools successfully
- [ ] All tests pass
- [ ] No runtime Zod errors in console

#### Alternative: Skip Zod Update

If Zod v4 causes issues, stay on v3:
```bash
npm install zod@3.25.76
```

**Testing:**
- [ ] After each batch, run full test suite
- [ ] Manual testing in Obsidian
- [ ] Check for console errors
- [ ] Verify all features work

---

## 3. Minor Issues

### 3.1 Documentation Reorganization ⚙️

**Problem:** 10,190 lines of documentation, much of it outdated planning docs

**Current State:**
```
docs/UPDATE_SPEC.md              4,130 lines  (Implementation complete)
docs/TESTING_SPEC.md             1,591 lines  (Tests implemented)
docs/V1.md                       1,147 lines  (V1 complete)
docs/PHASE_1_IMPLEMENTATION.md     281 lines  (Phase complete)
docs/MVP.md                        382 lines  (MVP complete)
```

**Implementation:**

1. **Create archive directory**
   ```bash
   mkdir -p docs/archive/planning
   ```

2. **Move completed planning docs**
   ```bash
   git mv docs/UPDATE_SPEC.md docs/archive/planning/
   git mv docs/TESTING_SPEC.md docs/archive/planning/
   git mv docs/PHASE_1_IMPLEMENTATION.md docs/archive/planning/
   git mv docs/MVP.md docs/archive/planning/
   git mv docs/V1.md docs/archive/planning/
   ```

3. **Update references in active docs**

   Check these files for broken links:
   - `README.md`
   - `CONTRIBUTING.md`
   - `CLAUDE.md`

   Update any references to moved files:
   ```markdown
   <!-- Before -->
   See [docs/V1.md](docs/V1.md)

   <!-- After -->
   See [docs/archive/planning/V1.md](docs/archive/planning/V1.md)
   ```

4. **Keep active documentation**
   ```
   docs/
   ├── ARCHITECTURE.md         (710 lines - KEEP)
   ├── DEVELOPMENT.md          (489 lines - KEEP)
   ├── INSTALLATION.md         (90 lines - KEEP)
   ├── PROJECT_STRUCTURE.md    (181 lines - KEEP)
   ├── PERFORMANCE_OPTIMIZATIONS.md (211 lines - KEEP)
   ├── V2.md                   (772 lines - KEEP, future roadmap)
   ├── VISION.md               (206 lines - KEEP)
   └── archive/
       └── planning/
           ├── MVP.md
           ├── V1.md
           ├── PHASE_1_IMPLEMENTATION.md
           ├── TESTING_SPEC.md
           └── UPDATE_SPEC.md
   ```

5. **Create archive README**

   `docs/archive/planning/README.md`:
   ```markdown
   # Planning Archive

   This directory contains historical planning documents for completed phases.

   ## Contents

   - **MVP.md** - Initial MVP planning (Complete: v0.1.0)
   - **V1.md** - V1.0 feature planning (Complete: v1.0.0)
   - **PHASE_1_IMPLEMENTATION.md** - Phase 1 implementation summary (Complete: v1.1.0)
   - **TESTING_SPEC.md** - Testing infrastructure spec (Complete: v1.1.0)
   - **UPDATE_SPEC.md** - Improvements and updates spec (Complete: v1.1.0)

   These documents are kept for historical reference but are no longer active.
   ```

6. **Commit the reorganization**
   ```bash
   git add docs/
   git commit -m "docs: Archive completed planning documents

   Moved completed planning specs to docs/archive/planning/ to reduce
   clutter and improve maintainability. Active documentation remains
   in docs/ root."
   ```

**Testing:**
- [ ] All links in README, CONTRIBUTING, CLAUDE.md work
- [ ] Active docs are easily discoverable
- [ ] Archive is clearly labeled as historical

---

### 3.2 CLAUDE.md Path Corrections ⚙️

**Problem:** References non-existent files or incorrect paths

**Issues Found:**
```markdown
Line 456: - [DEVELOPMENT.md](docs/DEVELOPMENT.md)
Line 457: - [ARCHITECTURE.md](docs/ARCHITECTURE.md)
Line 458: - [README.md](README.md)
```

These paths are actually correct, but should be verified.

**Additional issue:**
```markdown
Line 75: See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed development instructions.
```

**Implementation:**

Verify all documentation links in `CLAUDE.md`:
```bash
# Check each link target exists
ls docs/DEVELOPMENT.md      # ✓
ls docs/ARCHITECTURE.md     # ✓
ls README.md                # ✓
ls CONTRIBUTING.md          # ✓
```

If any are missing after reorganization, update the links.

**Testing:**
- [ ] All file paths in CLAUDE.md resolve correctly
- [ ] Links work in GitHub markdown viewer
- [ ] Links work in VS Code markdown preview

---

### 3.3 Review `src/utils/Cache.ts` Usage ⚙️

**Problem:** Unclear if Cache utility is actively used

**Investigation Required:**

```bash
# Find imports of Cache
grep -r "from.*utils/Cache" src/ --include="*.ts"
grep -r "import.*Cache" src/ --include="*.ts"
```

**Expected results:**
- Should be imported in `src/vault/VaultService.ts`
- Used for caching vault operations (file reads, searches)

**Implementation:**

1. **If Cache IS used:**
   - Keep as is, it's a good utility
   - Consider adding JSDoc comments if missing
   - Verify tests exist for Cache (should be in `src/__tests__/utils/`)

2. **If Cache is NOT used:**
   ```bash
   # Remove unused file
   git rm src/utils/Cache.ts

   # If utils/ is now empty, remove directory
   rmdir src/utils/

   # Update tsconfig.json paths if needed
   ```

3. **If tests are missing:**
   - Create `src/__tests__/utils/Cache.test.ts`
   - Test TTL expiration, cache hits/misses, max size limits

**Testing:**
- [ ] Grep confirms usage or non-usage
- [ ] If removed, build still succeeds
- [ ] If kept, tests exist and pass

---

### 3.4 Clean Up Coverage Directory ⚙️

**Problem:** Coverage directory (512KB) exists but is in `.gitignore`

**Current State:**
```bash
$ ls -la coverage/
drwxr-xr-x  15 charlesbellinger  staff  480 Nov  7 18:46 .
# Contains test coverage HTML reports
```

**Implementation:**

```bash
# Remove coverage directory
rm -rf coverage/

# Remove from git if accidentally tracked
git rm -rf coverage/ --cached 2>/dev/null || true

# Verify it's in .gitignore
grep "coverage/" .gitignore  # Should be on line 26
```

**Testing:**
- [ ] `npm run test:coverage` regenerates coverage/
- [ ] coverage/ is not tracked by git
- [ ] `git status` doesn't show coverage/ files

---

## 4. Implementation Order

Execute tasks in this order to minimize risk and maximize efficiency:

### Phase 1: Critical Fixes (30-45 minutes)
Do these first - highest impact, lowest risk:

1. **Version Sync** (10 min)
   - Update package.json, manifest.json, versions.json
   - Update CLAUDE.md
   - Test: Build and verify version numbers

2. **Package Name Resolution** (10 min)
   - Choose name (recommend: obsidian-agent)
   - Update package.json, CHANGELOG.md
   - Run `npm install` to update package-lock.json
   - Test: Build succeeds

3. **CHANGELOG Update** (15 min)
   - Replace CHANGELOG.md with new version
   - Verify all URLs use correct repo name
   - Test: Links work in GitHub

4. **Git Cleanup** (5 min)
   - Remove main.js from tracking
   - Remove coverage/ if tracked
   - Test: `git status` is clean

### Phase 2: Major Fixes (60-90 minutes)
Higher risk, requires testing:

5. **ESLint Decision** (30 min)
   - Choose: Add config OR remove completely
   - If adding: Create config, run lint, fix errors
   - If removing: Uninstall packages, update workflow
   - Test: Lint passes OR is removed

6. **Dependency Updates - Batch 1** (15 min)
   - Update TypeScript tooling
   - Test: Build and tests pass

7. **Dependency Updates - Batch 2** (15 min)
   - Update LangChain ecosystem
   - Test: Agent works, tests pass

8. **Dependency Updates - Batch 3** (30 min)
   - Update Zod (or skip if risky)
   - Test thoroughly: schemas, tools, tests

### Phase 3: Minor Cleanup (30-45 minutes)
Low priority, improves maintainability:

9. **Documentation Reorganization** (20 min)
   - Create archive directory
   - Move completed planning docs
   - Update links
   - Test: All links work

10. **CLAUDE.md Verification** (5 min)
    - Verify all file paths
    - Fix any broken links
    - Test: Paths resolve

11. **Cache.ts Review** (10 min)
    - Check if used
    - Remove if unused OR add tests
    - Test: Build succeeds

12. **Coverage Cleanup** (5 min)
    - Remove coverage directory
    - Verify .gitignore entry
    - Test: Regenerates correctly

---

## 5. Validation Steps

After completing all changes, validate the entire codebase:

### Build Validation
```bash
# Clean build
rm -rf node_modules/ main.js
npm install
npm run build

# Should complete without errors
# Should generate main.js (~2.3MB)
```

### Test Validation
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Expected: All 137+ tests pass, 80%+ coverage
```

### Lint Validation (if ESLint added)
```bash
# Run linter
npm run lint

# Should pass with 0 errors
# Warnings are acceptable
```

### Version Validation
```bash
# Check version consistency
grep '"version"' package.json     # Should be 1.1.0
grep '"version"' manifest.json    # Should be 1.1.0
cat versions.json                 # Should include 1.1.0
```

### Git Validation
```bash
# Check working directory
git status

# Should show:
# - No main.js
# - No coverage/ files
# - Only intentional changes
```

### Obsidian Validation
1. Copy plugin files to test vault:
   ```bash
   cp main.js manifest.json styles.css ~/.obsidian/plugins/obsidian-agent/
   ```

2. Open Obsidian and enable plugin

3. Test core functionality:
   - [ ] Plugin loads without errors
   - [ ] Chat interface opens
   - [ ] Can send message to agent
   - [ ] Agent can search vault
   - [ ] Agent can read files
   - [ ] Conversations persist
   - [ ] Settings page loads
   - [ ] Version shows correctly in settings

4. Check console for errors (Cmd/Ctrl + Shift + I)

### GitHub Workflow Validation
```bash
# Create a test branch and push
git checkout -b test/cleanup-validation
git push origin test/cleanup-validation

# Watch GitHub Actions
# - Tests should pass
# - Build should succeed
# - Lint should pass (if configured)
```

---

## 6. Rollback Plan

If issues arise during implementation:

### Immediate Rollback
```bash
# Discard all changes
git reset --hard HEAD
git clean -fd

# Reinstall previous dependencies
npm install
```

### Partial Rollback

If a specific change causes issues:

```bash
# Rollback specific files
git checkout HEAD -- path/to/file

# Rollback specific commit
git revert <commit-hash>
```

### Dependency Rollback

If updated dependencies cause issues:

```bash
# Rollback to previous package.json
git checkout HEAD -- package.json package-lock.json
npm install

# Or rollback specific packages
npm install package@previous-version
```

### Testing Rollback

After rollback:
- [ ] `npm run build` succeeds
- [ ] `npm test` passes
- [ ] Plugin loads in Obsidian
- [ ] Core features work

---

## 7. Acceptance Criteria

All changes are complete when:

### Critical Issues
- [ ] All version numbers are synchronized (1.1.0)
- [ ] Package name is consistent across all files
- [ ] CHANGELOG documents v1.0.0 and v1.1.0
- [ ] main.js removed from git tracking

### Major Issues
- [ ] ESLint is configured OR completely removed
- [ ] Dependencies updated (at least Batch 1 + 2)
- [ ] All tests pass after updates

### Minor Issues
- [ ] Completed planning docs archived
- [ ] CLAUDE.md paths verified
- [ ] Cache.ts usage confirmed or removed
- [ ] Coverage directory cleaned

### Validation
- [ ] `npm run build` succeeds
- [ ] `npm test` passes (all 137+ tests)
- [ ] Plugin loads in Obsidian
- [ ] GitHub Actions workflow passes
- [ ] Git status is clean

### Documentation
- [ ] All links work in documentation
- [ ] README reflects current state
- [ ] CONTRIBUTING guide is up to date

---

## 8. Post-Implementation

After completing cleanup:

1. **Create Release Tag**
   ```bash
   git tag -a v1.1.0 -m "Release v1.1.0: Streaming, pagination, caching"
   git push origin v1.1.0
   ```

2. **Update GitHub Release**
   - Copy CHANGELOG entry for v1.1.0
   - Attach build artifacts (main.js, manifest.json, styles.css)
   - Mark as latest release

3. **Update README Badge** (if any)
   - Version badge
   - Build status badge
   - Coverage badge

4. **Announce Changes**
   - Post in Obsidian community forum (if applicable)
   - Update any external documentation

---

## Appendix A: File Checklist

Track file changes:

```
Critical Files:
[ ] package.json          - Name, version
[ ] package-lock.json     - Auto-update
[ ] manifest.json         - Version
[ ] versions.json         - Add 1.1.0
[ ] CHANGELOG.md          - Complete rewrite
[ ] CLAUDE.md             - Version update
[ ] main.js               - Remove from git

Major Files:
[ ] .eslintrc.json        - Create (if adding ESLint)
[ ] .eslintignore         - Create (if adding ESLint)
[ ] .github/workflows/test.yml  - Update lint step

Minor Files:
[ ] docs/archive/         - Create directory
[ ] docs/archive/planning/README.md - Create
[ ] docs/*.md             - Move to archive

Dependencies:
[ ] package.json          - Updated versions
[ ] package-lock.json     - Regenerate
```

---

## Appendix B: Testing Checklist

Complete testing matrix:

```
Unit Tests:
[ ] VaultService tests pass
[ ] VaultTools tests pass
[ ] AgentGraph tests pass
[ ] ErrorHandler tests pass
[ ] RateLimiter tests pass
[ ] CheckpointService tests pass
[ ] Cache tests pass (if kept)

Integration Tests:
[ ] Agent can search files
[ ] Agent can read files
[ ] Agent can list directories
[ ] Agent can get metadata
[ ] Conversation persistence works
[ ] Thread management works

Build Tests:
[ ] npm install completes
[ ] npm run dev starts
[ ] npm run build succeeds
[ ] main.js generates correctly
[ ] Plugin loads in Obsidian

Regression Tests:
[ ] Chat interface works
[ ] Message sending works
[ ] Streaming responses work
[ ] Markdown rendering works
[ ] Theme switching works
[ ] Settings page works
[ ] API key validation works
```

---

## Appendix C: Timeline Estimate

**Total Time:** 2-4 hours (depending on issues encountered)

```
Phase 1 (Critical):      30-45 minutes
Phase 2 (Major):         60-90 minutes
Phase 3 (Minor):         30-45 minutes
Validation:              15-30 minutes
Documentation:           15-30 minutes
```

**Recommended Approach:** Complete Phase 1 in one session, test thoroughly, then Phase 2 in a second session.

---

## Document History

| Version | Date       | Author            | Changes                    |
|---------|------------|-------------------|----------------------------|
| 1.0     | 2025-11-11 | Charles Bellinger | Initial specification      |

---

**Next Steps:** Review this specification, decide on options (package name, ESLint), and begin Phase 1 implementation.
