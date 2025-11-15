# Cleanup Specification - Obsidian Agent v0.0.1

**Document Version**: 1.0
**Date**: 2025-11-13
**Status**: Ready for Implementation
**Estimated Total Effort**: 5-9 hours + 1-2 weeks for testing improvements

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Phase 1: Critical Security Fixes](#phase-1-critical-security-fixes)
3. [Phase 2: Essential Cleanup](#phase-2-essential-cleanup)
4. [Phase 3: Documentation Organization](#phase-3-documentation-organization)
5. [Phase 4: Quality Improvements](#phase-4-quality-improvements)
6. [Verification Checklist](#verification-checklist)
7. [Rollback Plan](#rollback-plan)

---

## Executive Summary

### Current State Assessment

**Overall Grade**: B+ (will be A- after cleanup)

**Codebase Metrics**:
- Source Code: 4,012 lines (excluding tests)
- Tests: 2,757 lines across 9 test files
- Test Coverage: 66% overall (target: 80%)
- Documentation: ~20 markdown files (needs organization)

**Critical Issues**: 2
**High Priority Items**: 4
**Medium Priority Items**: 4
**Low Priority Items**: 4

### What's Working Well

✅ **Architecture**: Clean separation of concerns, modern LangGraph pattern
✅ **Tooling**: Vitest, TypeScript strict mode, esbuild
✅ **Error Handling**: Comprehensive with retry logic and rate limiting
✅ **Performance**: Streaming, caching, pagination all well-implemented
✅ **Documentation**: Excellent CLAUDE.md and README

### What Needs Attention

🔴 **Security**: API key exposure risk
⚠️ **Configuration**: Duplicate ESLint configs
⚠️ **Dependencies**: 3 unused, 1 missing
📚 **Documentation**: Too many files, needs organization
🧪 **Testing**: Coverage gaps in critical paths (AgentGraph: 16%, RetryHandler: 5%)

---

## Phase 1: Critical Security Fixes

**Priority**: 🔴 CRITICAL
**Estimated Time**: 1 hour
**Must Complete**: Before any commits or releases

### 1.1 API Key Security

**Issue**: `.env` file contains actual LangSmith API key

**Location**: `/Users/.../obsidian-agent/.env`

**Exposed Key**: `lsv2_pt_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` (redacted)

**Actions Required**:

```bash
# Step 1: Revoke the exposed API key
# Go to: https://smith.langchain.com/settings
# Find key: lsv2_pt_109...
# Click "Revoke"

# Step 2: Delete the .env file
rm .env

# Step 3: Verify .env was never committed
git log --all --full-history -- .env
# Should return nothing

# Step 4: Create new API key and use .env.local (already gitignored)
cp .env.example .env.local
# Edit .env.local with NEW API key
```

**Verification**:
- [ ] Old API key revoked at LangSmith
- [ ] `.env` file deleted from working directory
- [ ] New key created and stored in `.env.local`
- [ ] `.env.local` is in `.gitignore` (already done)
- [ ] `git status` shows no .env file

**Risk if Skipped**: High - API key could be committed to git history

---

### 1.2 Missing Dependency

**Issue**: `@langchain/langgraph-checkpoint` used but not in package.json

**Files Using It**:
- `src/checkpoint/CheckpointService.ts`
- `src/__tests__/checkpoint/CheckpointService.test.ts`

**Actions Required**:

```bash
# Install missing dependency
npm install @langchain/langgraph-checkpoint

# Verify it appears in package.json dependencies
grep "langgraph-checkpoint" package.json

# Test build still works
npm run build

# Test tests still pass
npm test
```

**Verification**:
- [ ] Package installed and in package.json
- [ ] Build succeeds (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] No import errors in CheckpointService.ts

**Risk if Skipped**: Medium - Clean installs will fail

---

## Phase 2: Essential Cleanup

**Priority**: ⚠️ HIGH
**Estimated Time**: 2-3 hours
**Must Complete**: Before v0.0.1 release

### 2.1 Remove Duplicate ESLint Configuration

**Issue**: Two conflicting ESLint configs exist

**Files**:
- `.eslintrc.json` (old format) - **DELETE THIS**
- `eslint.config.mjs` (new flat config) - **KEEP THIS**
- `.eslintignore` - **DELETE THIS** (ignores now in eslint.config.mjs)

**Differences**:
- `.eslintrc.json` has stricter rules for promises/async
- `eslint.config.mjs` excludes tests from linting entirely
- Both try to configure same plugins

**Actions Required**:

```bash
# Step 1: Backup current configs (just in case)
cp .eslintrc.json .eslintrc.json.backup
cp .eslintignore .eslintignore.backup

# Step 2: Delete old configs
rm .eslintrc.json .eslintignore

# Step 3: Update package.json lint scripts
# Before:
#   "lint": "eslint src --ext .ts"
# After:
#   "lint": "eslint src"

# Edit package.json to remove --ext flag
# (flat config doesn't use --ext)

# Step 4: Test linting still works
npm run lint

# Step 5: If all good, delete backups
rm .eslintrc.json.backup .eslintignore.backup
```

**Verification**:
- [ ] Only `eslint.config.mjs` exists
- [ ] `npm run lint` runs without errors
- [ ] No warnings about conflicting configs
- [ ] Tests directory still excluded from linting

**Why This Matters**: Having two configs creates confusion about which rules apply. The flat config is the modern standard (ESLint 9+).

---

### 2.2 Remove Unused Dependencies

**Issue**: 3 dependencies installed but never used

**Dependencies to Remove**:

1. **`langchain`** - Never imported (only using `@langchain/core` and `@langchain/langgraph`)
2. **`tslib`** - TypeScript handles this automatically with modern config
3. **`@vitest/coverage-v8`** - Might be used implicitly by vitest (verify first)

**Actions Required**:

```bash
# Step 1: Verify langchain is unused
grep -r "from 'langchain'" src/
# Should return nothing

# Step 2: Remove unused dependencies
npm uninstall langchain tslib

# Step 3: Test coverage command BEFORE removing @vitest/coverage-v8
npm run test:coverage
# If it works, the package is used implicitly - keep it
# If it fails, it's not needed

# Step 4: If coverage worked, KEEP @vitest/coverage-v8
# If it failed, remove it:
# npm uninstall @vitest/coverage-v8

# Step 5: Verify build and tests still work
npm run build
npm test
```

**Verification**:
- [ ] `langchain` removed from package.json
- [ ] `tslib` removed from package.json
- [ ] Build succeeds
- [ ] Tests pass
- [ ] Coverage command still works if kept

**Expected Savings**: ~50MB in node_modules, faster installs

---

### 2.3 Fix Version Number Inconsistency

**Issue**: README.md shows "v1.1.0" but everything else shows "v0.0.1"

**Files to Check**:
- `README.md` - Claims "v1.1.0 - Current (2025-11-11)" in changelog section
- `package.json` - Correctly shows "0.0.1" ✅
- `manifest.json` - Correctly shows "0.0.1" ✅
- `CLAUDE.md` - Correctly shows "v0.0.1 (current)" ✅
- `CHANGELOG.md` - Check this file

**Actions Required**:

```bash
# Step 1: Find all version references
grep -r "1.1.0" .

# Step 2: Edit README.md
# Find the changelog section
# Change: "v1.1.0 - Current (2025-11-11)"
# To: "v0.0.1 - Current (2025-11-13)"

# Step 3: Verify consistency
grep -r "version" package.json manifest.json README.md CLAUDE.md
```

**Verification**:
- [ ] All files reference v0.0.1 as current version
- [ ] No references to v1.1.0 exist
- [ ] Changelog accurately reflects v0.0.1 features

---

### 2.4 Remove Build Artifact from Working Directory

**Issue**: `main.js` (2.3MB) exists in working directory

**Status**: Not committed (good!), but present

**Actions Required**:

```bash
# Step 1: Verify it's not tracked
git ls-files | grep main.js
# Should return nothing

# Step 2: Verify it's in .gitignore
grep "main.js" .gitignore
# Should show: main.js

# Step 3: Delete it
rm main.js

# Step 4: Rebuild when needed
npm run build
# Creates fresh main.js

# Step 5: For development, use dev mode
npm run dev
# Watches and rebuilds automatically
```

**Verification**:
- [ ] `main.js` not in working directory
- [ ] `main.js` in `.gitignore`
- [ ] `npm run build` recreates it successfully

**Why**: Reduces confusion, saves disk space in development

---

## Phase 3: Documentation Organization

**Priority**: 📚 MEDIUM
**Estimated Time**: 2-4 hours
**Recommended**: Before v1.0.0 release

### 3.1 Clean Up Archive Directory

**Current State**:
```
docs/archive/
├── planning/
│   ├── PHASE_1_IMPLEMENTATION.md
│   ├── TESTING_SPEC.md
│   ├── UPDATE_SPEC.md
│   ├── MVP.md
│   └── README.md
├── ARCHITECTURE.md (710 lines)
├── DEVELOPMENT.md (489 lines)
├── INSTALLATION.md (90 lines)
├── PERFORMANCE_OPTIMIZATIONS.md (211 lines)
├── PROJECT_STRUCTURE.md (181 lines)
├── V2.md (772 lines)
├── WORKFLOW.md
└── CLEANUP_SPEC.md
```

**Issues**:
- `planning/` directory is superseded by `V0.md` and `V1.md`
- Multiple versions of same docs (archive vs. current)
- No explanation of what's in archive and why

**Actions Required**:

```bash
# Step 1: Delete obsolete planning docs
rm -rf docs/archive/planning/

# Step 2: Create archive README
cat > docs/archive/README.md << 'EOF'
# Archive

This directory contains historical documentation from earlier development phases.

## Status: ARCHIVED

These documents are preserved for historical reference but are **no longer maintained**.

For current documentation, see:
- `/docs/V0.md` - Current version (v0.0.1) specification
- `/docs/V1.md` - Planned version (v1.0.0) specification
- `/CLAUDE.md` - Primary developer documentation
- `/README.md` - User-facing documentation

## What's Here

- **ARCHITECTURE.md** - Original architecture design (superseded by V0.md)
- **DEVELOPMENT.md** - Original dev setup (superseded by CLAUDE.md)
- **V2.md** - Future vision (superseded by V1.md and docs/VISION.md)
- **PERFORMANCE_OPTIMIZATIONS.md** - Original perf plan (implemented in v0.0.1)
- Other planning documents from initial development

Last Updated: 2025-11-13
EOF

# Step 3: Verify current docs are complete
ls -la docs/*.md
# Should see: V0.md, V1.md, VISION.md, etc.
```

**Verification**:
- [ ] `docs/archive/planning/` deleted
- [ ] `docs/archive/README.md` created with explanation
- [ ] Current documentation is complete
- [ ] No broken links in current docs

---

### 3.2 Consolidate LangSmith Documentation

**Issue**: LangSmith setup instructions spread across 3 files

**Current Files**:
1. `LANGSMITH_SETUP.md` (root)
2. `docs/LANGSMITH_SETUP_PLAN.md`
3. `docs/development/LANGSMITH_ENVIRONMENT_SETUP.md`

**Recommendation**: Keep ONE canonical source in `docs/development/`

**Actions Required**:

```bash
# Step 1: Compare files to ensure no information loss
diff LANGSMITH_SETUP.md docs/development/LANGSMITH_ENVIRONMENT_SETUP.md
diff docs/LANGSMITH_SETUP_PLAN.md docs/development/LANGSMITH_ENVIRONMENT_SETUP.md

# Step 2: Merge unique content into docs/development/LANGSMITH_ENVIRONMENT_SETUP.md
# (Manual editing required)

# Step 3: Delete redundant files
rm LANGSMITH_SETUP.md
rm docs/LANGSMITH_SETUP_PLAN.md

# Step 4: Update CLAUDE.md reference
# Change: See `LANGSMITH_SETUP.md` for detailed setup
# To: See `docs/development/LANGSMITH_ENVIRONMENT_SETUP.md` for detailed setup

# Step 5: Update any other references
grep -r "LANGSMITH_SETUP.md" .
```

**Verification**:
- [ ] Only one LangSmith setup doc exists
- [ ] All unique content preserved
- [ ] CLAUDE.md references updated
- [ ] No broken links

**Final Structure**:
```
docs/
├── development/
│   ├── LANGSMITH_ENVIRONMENT_SETUP.md (canonical source)
│   ├── LANGSMITH_STATUS.md (current status)
│   └── LINTING.md
└── ...
```

---

### 3.3 Document AsyncLocalStorage Polyfill Architecture

**Issue**: Three polyfill files with complex interactions, needs explanation

**Files**:
- `src/polyfills/async-hooks-stub.ts` (57 lines)
- `src/polyfills/async-hooks.ts` (31 lines)
- `src/polyfills/async-hooks-runtime-patch.ts` (122 lines)

**Problem**: Not clear why all three are needed or how they work together

**Actions Required**:

Create `docs/development/ASYNC_LOCAL_STORAGE.md`:

```markdown
# AsyncLocalStorage Polyfill Architecture

## Overview

LangGraph requires `node:async_hooks` which is not available in all environments:
- ❌ Mobile (iOS/Android): No Node.js environment
- ⚠️ Desktop (Electron): Has Node.js but missing `AsyncLocalStorage.snapshot()` method
- ✅ Node.js: Full support (but we still need polyfill for bundling)

## Three-Layer Solution

### Layer 1: Build-Time Stub (`async-hooks-stub.ts`)
- **Purpose**: Allow esbuild to bundle without errors
- **When Used**: During `npm run build`
- **How**: esbuild.config.mjs aliases `node:async_hooks` → `./src/polyfills/async-hooks-stub.ts`
- **Why**: Can't bundle actual Node.js modules, need stub that exports same API

### Layer 2: Runtime Initialization (`async-hooks.ts`)
- **Purpose**: Initialize polyfill before LangGraph loads
- **When Used**: Mobile platforms (iOS/Android)
- **How**: Called in `src/main.ts:12` before any imports
- **Uses**: LangChain's `MockAsyncLocalStorage` singleton

### Layer 3: Runtime Patch (`async-hooks-runtime-patch.ts`)
- **Purpose**: Add missing `snapshot()` method to Node's AsyncLocalStorage
- **When Used**: Desktop Electron (when real Node.js is available)
- **Why**: LangSmith calls `AsyncLocalStorage.snapshot()` but older Node doesn't have it
- **How**: Dynamically patches at runtime using `require('async_hooks')`

## Call Flow

### Mobile (iOS/Android)
1. esbuild bundles with stub
2. Runtime detects mobile → initializes MockAsyncLocalStorage
3. LangGraph uses mocked context

### Desktop (Electron)
1. esbuild bundles with stub
2. Runtime patches Node's real AsyncLocalStorage with `snapshot()`
3. LangGraph uses real Node.js implementation (patched)

## Why Not Simpler?

**Q**: Why not just use MockAsyncLocalStorage everywhere?
**A**: Desktop has real Node.js - better to use native implementation for performance

**Q**: Why not remove the stub if we patch at runtime?
**A**: esbuild needs SOMETHING to import at build time, can't bundle Node.js modules

**Q**: Can we consolidate these files?
**A**: No - they run at different times (build vs. runtime) and environments (mobile vs. desktop)

## Testing

- Stub used: All builds
- Mock used: Mobile runtime (check Platform.isMobile)
- Patch used: Desktop runtime (check process.versions.node)

See tests in `src/__tests__/polyfills/` (if added)
```

**Verification**:
- [ ] Document created
- [ ] All three polyfill files have clear header comments
- [ ] CLAUDE.md references this doc
- [ ] Developers can understand the architecture

---

## Phase 4: Quality Improvements

**Priority**: 🧪 LOW (but important for v1.0)
**Estimated Time**: 1-2 weeks
**Recommended**: After v0.0.1 release, before v1.0.0

### 4.1 Increase Test Coverage

**Current State**: 66% overall (target: 80%)

**Critical Gaps**:
- `AgentGraph.ts` - **16.54%** coverage (core agent logic!)
- `RetryHandler.ts` - **5.55%** coverage (critical error recovery)
- `Cache.ts` - **19.35%** coverage (performance layer)

**Actions Required**:

#### 4.1.1 AgentGraph Tests

**Goal**: 16% → 80%+ coverage

**Missing Test Scenarios**:
```typescript
// src/__tests__/agent/AgentGraph.integration.test.ts

describe('AgentGraph Integration', () => {
  it('should handle full conversation flow with tool calls', async () => {
    // Test: User message → Agent → VaultTool → Agent → Response
  });

  it('should stream responses with onChunk callback', async () => {
    // Test: invokeStream() with real streaming
  });

  it('should save checkpoint after successful completion', async () => {
    // Test: Checkpoint persistence after conversation
  });

  it('should handle tool errors gracefully', async () => {
    // Test: Tool throws error → Agent recovers
  });

  it('should respect max iterations limit', async () => {
    // Test: Prevents infinite loops
  });

  it('should convert messages between LangChain and Anthropic formats', async () => {
    // Test: Message format conversion
  });
});
```

#### 4.1.2 RetryHandler Tests

**Goal**: 5% → 80%+ coverage

**Missing Test Scenarios**:
```typescript
// src/__tests__/errors/RetryHandler.integration.test.ts

describe('RetryHandler', () => {
  it('should retry on transient errors with exponential backoff', async () => {
    // Test: 429 error → retry with increasing delays
  });

  it('should not retry on permanent errors', async () => {
    // Test: 400 error → immediate failure
  });

  it('should respect maxAttempts limit', async () => {
    // Test: Fails after N attempts
  });

  it('should call onRetry callback with correct parameters', async () => {
    // Test: Callback receives error, attempt, delay
  });

  it('should succeed on eventual success after retries', async () => {
    // Test: Fail, fail, succeed pattern
  });
});
```

#### 4.1.3 Cache Tests

**Goal**: 19% → 80%+ coverage

**Missing Test Scenarios**:
```typescript
// src/__tests__/utils/Cache.integration.test.ts

describe('Cache', () => {
  it('should expire entries after TTL', async () => {
    // Test: Set → wait → get returns null
  });

  it('should handle concurrent access correctly', async () => {
    // Test: Multiple simultaneous get/set
  });

  it('should prune expired entries automatically', async () => {
    // Test: Pruning after 5 minutes
  });

  it('should track hit/miss stats correctly', () => {
    // Test: getCacheStats() accuracy
  });

  it('should handle clear() correctly', () => {
    // Test: Clear all entries
  });
});
```

**Verification**:
- [ ] Overall coverage ≥ 80%
- [ ] AgentGraph coverage ≥ 80%
- [ ] RetryHandler coverage ≥ 80%
- [ ] Cache coverage ≥ 80%
- [ ] All critical paths tested

---

### 4.2 Add Pre-Commit Hook for API Key Detection

**Goal**: Prevent accidental commits of API keys

**Actions Required**:

```bash
# Step 1: Install husky
npm install --save-dev husky

# Step 2: Initialize husky
npx husky init

# Step 3: Create pre-commit hook
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Check for potential API keys
if git diff --cached --name-only | xargs grep -l "sk-ant-\|lsv2_pt_\|ANTHROPIC_API_KEY.*=.*sk-\|LANGSMITH_API_KEY.*=.*lsv2_" 2>/dev/null; then
  echo "❌ ERROR: Potential API key detected in staged files!"
  echo ""
  echo "Files with potential API keys:"
  git diff --cached --name-only | xargs grep -l "sk-ant-\|lsv2_pt_\|ANTHROPIC_API_KEY.*=.*sk-\|LANGSMITH_API_KEY.*=.*lsv2_" 2>/dev/null
  echo ""
  echo "Please remove API keys before committing."
  echo "Use .env.local (gitignored) for local API keys."
  exit 1
fi

echo "✅ No API keys detected in staged files"
EOF

chmod +x .husky/pre-commit

# Step 4: Add to package.json
# Add to "scripts":
#   "prepare": "husky install"

# Step 5: Test it
echo "LANGSMITH_API_KEY=lsv2_pt_test123" > test-file.txt
git add test-file.txt
git commit -m "test"
# Should FAIL with API key detection message

rm test-file.txt
```

**Verification**:
- [ ] Husky installed
- [ ] Pre-commit hook created
- [ ] Hook detects API keys in commits
- [ ] Hook passes when no API keys present

---

### 4.3 Code Refactoring (Optional)

**Goal**: Improve maintainability

**Candidates for Refactoring**:

#### 4.3.1 Split VaultService

**Current**: `VaultService.ts` (459 lines) - single large file

**Proposed Structure**:
```
src/vault/
├── VaultService.ts (main orchestrator, ~150 lines)
├── VaultSearch.ts (search operations, ~150 lines)
├── VaultReader.ts (file reading, ~100 lines)
└── VaultMetadata.ts (metadata extraction, ~100 lines)
```

**Benefits**:
- Easier to test individual concerns
- Better organization
- Each file < 200 lines

**Actions**: (If pursuing this)
- Create new files
- Move methods
- Update imports
- Run tests to verify

#### 4.3.2 Extract Agent Configuration

**Current**: AGENT_SYSTEM_PROMPT and AGENT_CONFIG in AgentGraph.ts

**Proposed**:
```typescript
// src/agent/AgentConfig.ts
export const AGENT_SYSTEM_PROMPT = `...`;
export const AGENT_CONFIG = { ... };

// src/agent/AgentGraph.ts
import { AGENT_SYSTEM_PROMPT, AGENT_CONFIG } from './AgentConfig';
```

**Benefits**:
- Easier to modify prompts without touching agent logic
- Could support multiple agent configurations
- Cleaner separation

---

### 4.4 Add Missing Type Definitions

**Issue**: Several files use `any` type

**Files**:
- `async-hooks-stub.ts` - Has `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
- `async-hooks-runtime-patch.ts` - Uses `any` for polyfill compatibility

**Actions**:
- Document WHY `any` is needed (polyfill compatibility)
- Add more specific types where possible
- Consider creating type guards

**Example**:
```typescript
// Instead of:
function patch(instance: any): void { ... }

// Consider:
interface AsyncLocalStorageLike {
  getStore(): unknown;
  run<R>(store: unknown, callback: () => R): R;
}

function patch(instance: AsyncLocalStorageLike): void { ... }
```

---

## Verification Checklist

Use this checklist to track completion of all phases.

### Phase 1: Critical Security ✅

- [ ] 1.1 API key revoked at LangSmith
- [ ] 1.1 `.env` file deleted
- [ ] 1.1 New key in `.env.local` only
- [ ] 1.1 Verified `.env` never committed
- [ ] 1.2 `@langchain/langgraph-checkpoint` installed
- [ ] 1.2 Build succeeds
- [ ] 1.2 Tests pass

### Phase 2: Essential Cleanup ⚠️

- [ ] 2.1 `.eslintrc.json` deleted
- [ ] 2.1 `.eslintignore` deleted
- [ ] 2.1 package.json lint scripts updated
- [ ] 2.1 `npm run lint` works
- [ ] 2.2 `langchain` dependency removed
- [ ] 2.2 `tslib` dependency removed
- [ ] 2.2 Build and tests still work
- [ ] 2.3 Version numbers consistent (v0.0.1)
- [ ] 2.4 `main.js` deleted from working directory

### Phase 3: Documentation 📚

- [ ] 3.1 `docs/archive/planning/` deleted
- [ ] 3.1 `docs/archive/README.md` created
- [ ] 3.2 LangSmith docs consolidated
- [ ] 3.2 Redundant LangSmith files deleted
- [ ] 3.2 CLAUDE.md references updated
- [ ] 3.3 AsyncLocalStorage architecture documented

### Phase 4: Quality Improvements 🧪

- [ ] 4.1 AgentGraph coverage ≥ 80%
- [ ] 4.1 RetryHandler coverage ≥ 80%
- [ ] 4.1 Cache coverage ≥ 80%
- [ ] 4.1 Overall coverage ≥ 80%
- [ ] 4.2 Husky pre-commit hook installed
- [ ] 4.2 API key detection tested
- [ ] 4.3 (Optional) VaultService refactored
- [ ] 4.4 (Optional) Type safety improved

### Final Verification 🎯

- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Linting passes (`npm run lint`)
- [ ] Coverage meets targets (`npm run test:coverage`)
- [ ] No API keys in repo (`git grep "sk-ant-\|lsv2_pt_"`)
- [ ] Documentation up to date
- [ ] CHANGELOG.md updated
- [ ] Ready for v0.0.1 release

---

## Rollback Plan

If issues occur during cleanup, use these steps to rollback.

### Rollback Phase 1 (Security)

```bash
# If new API key doesn't work:
# 1. Go to LangSmith → Settings → API Keys
# 2. Create another new key
# 3. Update .env.local

# Cannot rollback old key - it's revoked for security
```

### Rollback Phase 2 (Cleanup)

```bash
# Restore old ESLint config
git checkout HEAD -- .eslintrc.json .eslintignore

# Restore dependencies
npm install langchain tslib @vitest/coverage-v8

# Restore version numbers
git checkout HEAD -- README.md
```

### Rollback Phase 3 (Documentation)

```bash
# Restore deleted files
git checkout HEAD -- docs/archive/planning/
git checkout HEAD -- LANGSMITH_SETUP.md docs/LANGSMITH_SETUP_PLAN.md
```

### Rollback Phase 4 (Testing)

```bash
# Remove new tests if they cause issues
git checkout HEAD -- src/__tests__/
```

### Nuclear Option (Rollback Everything)

```bash
# Create safety branch first
git branch before-cleanup

# If total disaster:
git reset --hard before-cleanup

# Verify
npm install
npm test
npm run build
```

---

## Success Metrics

After completing all phases, you should see:

### Code Quality
- ✅ Test coverage ≥ 80%
- ✅ Zero ESLint errors
- ✅ Zero security warnings
- ✅ All tests passing

### Repository Cleanliness
- ✅ No duplicate configs
- ✅ No unused dependencies
- ✅ No API keys in code
- ✅ No build artifacts committed

### Documentation
- ✅ Clear, organized structure
- ✅ No redundant files
- ✅ Easy to find information
- ✅ Architecture well-documented

### Developer Experience
- ✅ Fast `npm install` (fewer dependencies)
- ✅ Clear linting rules
- ✅ Good test coverage
- ✅ Pre-commit hooks prevent mistakes

---

## Timeline

**Minimum (Critical Only)**: 1 hour
**Recommended (Phases 1-2)**: 3-4 hours
**Comprehensive (Phases 1-3)**: 5-8 hours
**Complete (All Phases)**: 1-2 weeks

### Suggested Schedule

**Day 1 (1 hour)**:
- Phase 1: Critical Security

**Day 2 (2-3 hours)**:
- Phase 2: Essential Cleanup

**Day 3 (2-4 hours)**:
- Phase 3: Documentation

**Week 2-3 (ongoing)**:
- Phase 4: Quality Improvements

---

## Questions & Support

If you encounter issues during cleanup:

1. **Check the rollback plan** for each phase
2. **Create a backup branch** before starting: `git branch before-cleanup`
3. **Test after each phase** to catch issues early
4. **Commit after each successful phase** for incremental progress

---

## Appendix: Quick Command Reference

```bash
# Phase 1 - Security
rm .env
npm install @langchain/langgraph-checkpoint

# Phase 2 - Cleanup
rm .eslintrc.json .eslintignore main.js
npm uninstall langchain tslib
# Edit package.json: remove --ext from lint script

# Phase 3 - Documentation
rm -rf docs/archive/planning/
rm LANGSMITH_SETUP.md docs/LANGSMITH_SETUP_PLAN.md

# Phase 4 - Testing
npm run test:coverage
# Write tests until coverage ≥ 80%

# Verification
npm test
npm run build
npm run lint
npm run test:coverage
```

---

**Document Status**: Ready for Implementation
**Last Updated**: 2025-11-13
**Next Review**: After Phase 2 completion
