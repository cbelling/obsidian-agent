# Development Workflow Guide

This guide describes the end-to-end workflow for developing features in the Obsidian Agent plugin, from ideation to production merge.

## Overview

The workflow follows a structured approach:
1. **Document** → Vision and feature ideas
2. **Prioritize** → Decide what to build next
3. **Specify** → Create detailed implementation spec
4. **Branch** → Create isolated development environment
5. **Build** → Implement with tests
6. **Review** → Code review and validation
7. **Merge** → Integrate into main branch
8. **Release** → Version and deploy

---

## Phase 1: Documentation and Ideation

### Product Vision Document (High-Level)

**Location:** `docs/VISION.md` or `docs/PRODUCT.md`

**Purpose:** Long-term direction, core principles, user problems being solved

**Content:**
- What problem does this plugin solve?
- Who is the target user?
- What are the key differentiators?
- What are the version milestones? (v1.0, v2.0, v3.0)
- What features are out of scope?

**Example Structure:**
```markdown
# Product Vision

## Mission
Enable Obsidian users to interact with their vault through AI...

## Target Users
- Knowledge workers with large vaults (500+ notes)
- Researchers who need semantic search
- Writers who want AI assistance grounded in their notes

## Key Principles
1. Read-only by default (safety first)
2. Transparent about what the agent can see
3. Fast responses (streaming, caching)

## Version Roadmap
- v1.0: Read-only agent (CURRENT)
- v2.0: Write operations with user confirmation
- v3.0: Semantic search and embeddings
```

### Feature Documents (Mid-Level)

**Location:** `docs/features/` directory

**Purpose:** Individual feature specifications, one per major capability

**When to create:** When you have a clear feature idea that might take multiple PRs or be built over time

**Naming convention:** `docs/features/[feature-name].md`

**Content:**
- User story (who, what, why)
- Acceptance criteria
- Technical approach (high-level)
- Dependencies and prerequisites
- Success metrics
- Related features

**Example Structure:**
```markdown
# Feature: Write Operations

## User Story
As a user, I want the agent to create and modify notes so that I can have the agent help me organize my vault.

## Acceptance Criteria
- [ ] Agent can create new notes
- [ ] Agent can update existing notes
- [ ] User must confirm all write operations
- [ ] Changes are tracked and can be undone
- [ ] Clear visual indication of what will change

## Technical Approach
- Add write methods to VaultService
- Create confirmation dialog component
- Implement undo/redo stack
- Update agent system prompt

## Dependencies
- v1.0 must be stable and tested
- Settings UI for write permission controls

## Out of Scope (for initial version)
- Bulk operations (move multiple files)
- Complex refactoring (rename with link updates)
```

---

## Phase 2: Prioritization

### Decision Framework

**Ask yourself:**
1. **Does this align with current version goals?** (Check VISION.md roadmap)
2. **Are dependencies ready?** (Check feature doc dependencies)
3. **What's the user impact?** (High/Medium/Low)
4. **What's the complexity?** (Days/Weeks/Months)
5. **Is there a forcing function?** (Bug, user request, blocker for other features)

### Priority Matrix

| Priority | Criteria | Examples |
|----------|----------|----------|
| **P0 - Critical** | Blocks users, security issue, data loss | API key leaking, crashes on mobile |
| **P1 - High** | Core functionality, high user value | Streaming responses, conversation persistence |
| **P2 - Medium** | Nice to have, quality of life | Better error messages, UI polish |
| **P3 - Low** | Future nice-to-have | Advanced features, experimental ideas |

### When to Start

**Start building when:**
- ✅ Feature doc exists with clear acceptance criteria
- ✅ Dependencies are satisfied
- ✅ Priority is P0 or P1 (or you have time for P2)
- ✅ You have a clear technical approach

**Don't start if:**
- ❌ Still unclear what you're building
- ❌ Waiting on external dependencies
- ❌ Experimental idea without clear user value

---

## Phase 3: Create Implementation Spec

### Using Claude Code for Specs

Claude Code has a built-in skill called `spec-builder` that helps create detailed implementation specs.

**Command:**
```
@spec-builder I need to implement [feature name from docs/features/]. Can you create a comprehensive implementation spec?
```

**What to provide:**
- Link to the feature document
- Current codebase context (relevant files)
- Any technical constraints or preferences

**Example:**
```
@spec-builder I need to implement the write operations feature from docs/features/write-operations.md.

Context:
- Current vault service is read-only (src/vault/VaultService.ts)
- Agent is defined in src/agent/AgentGraph.ts
- We need to maintain read-only by default with opt-in write permissions

Please create a spec that includes:
- Detailed file changes
- New classes/methods
- Test requirements
- Settings changes
- User confirmation flow
```

### Spec Output

The spec-builder will create a document like `specs/write-operations-spec.md` with:
- Implementation tasks (numbered, sequential)
- Exact file paths and changes
- Code examples
- Test requirements
- Verification steps

**Save this spec** in `specs/` directory for reference.

---

## Phase 4: Create Git Branch

### Branch Naming Convention

**Format:** `[type]/[feature-name]`

**Types:**
- `feature/` - New functionality
- `fix/` - Bug fixes
- `refactor/` - Code improvements without behavior change
- `docs/` - Documentation only
- `test/` - Test additions/improvements
- `chore/` - Maintenance (deps, config, build)

**Examples:**
```bash
feature/write-operations
feature/semantic-search
fix/mobile-cache-issue
refactor/error-handling
docs/api-reference
test/vault-service-coverage
chore/upgrade-dependencies
```

### When to Branch

**Branch off `main` when:**
1. ✅ You have a spec or clear task list
2. ✅ You're about to make code changes
3. ✅ Feature will take multiple commits

**Stay on `main` when:**
- Quick documentation fixes
- Single-commit changes
- Trivial updates

### Creating the Branch

```bash
# Make sure main is up to date
git checkout main
git pull origin main

# Create and switch to new branch
git checkout -b feature/[feature-name]

# Or for bug fixes
git checkout -b fix/[bug-name]
```

**Example:**
```bash
git checkout main
git pull origin main
git checkout -b feature/write-operations
```

---

## Phase 5: Implementation

### Working with Claude Code

#### Option A: Execute Spec Directly

If you used spec-builder and have a detailed spec:

```
I have a spec in specs/write-operations-spec.md. Please execute it step by step, implementing each task and running tests after each major change.
```

Claude Code will:
- Load the spec
- Work through tasks sequentially
- Write code and tests
- Run verification after each section
- Create commits at logical checkpoints

#### Option B: Iterative Development

For more exploratory work:

```
I want to add [feature]. Let's start by:
1. Exploring the current codebase to understand where this fits
2. Creating a task list
3. Implementing piece by piece with tests

Let's start with step 1.
```

Then iterate:
- Review task list together
- Build one component at a time
- Test as you go
- Refine based on results

### Development Practices

**Always:**
- ✅ Write tests for new code (TDD when possible)
- ✅ Run `npm test` frequently
- ✅ Keep commits atomic (one logical change per commit)
- ✅ Update CLAUDE.md if architecture changes
- ✅ Update README.md if user-facing changes

**Commit message format:**
```
[type]: [concise description]

[optional body explaining why]
```

**Types:** feat, fix, refactor, test, docs, chore

**Examples:**
```bash
git commit -m "feat: Add createNote method to VaultService"
git commit -m "test: Add coverage for VaultService write operations"
git commit -m "docs: Update CLAUDE.md with write operations architecture"
```

### Testing Requirements

**Before moving to next task:**
```bash
# Run tests
npm test

# Check coverage (should stay above 80%)
npm run test:coverage

# Build to catch type errors
npm run build
```

**If tests fail:**
1. Fix the issue
2. Add test for the failure case
3. Verify fix works
4. Continue

---

## Phase 6: Code Review

### Self-Review Checklist

Before requesting review:

- [ ] All tests pass (`npm test`)
- [ ] Coverage meets thresholds (80%+ statements)
- [ ] Build succeeds (`npm run build`)
- [ ] Linting passes (`npm run lint`)
- [ ] CLAUDE.md updated with architectural changes
- [ ] README.md updated if user-facing changes
- [ ] No console.log or debug code left in
- [ ] Error handling is comprehensive
- [ ] Edge cases are tested

### Using Claude Code for Review

Claude Code has a `code-reviewer` agent that can review your work:

```
I've finished implementing write operations (feature/write-operations branch). Can you review the code against the original spec and check for:
- Completeness (all acceptance criteria met)
- Code quality (error handling, tests, documentation)
- Architecture consistency (follows existing patterns)
- Potential issues or edge cases
```

The reviewer will:
- Compare implementation to spec/requirements
- Check code quality and patterns
- Identify gaps or issues
- Suggest improvements

### Address Review Feedback

For each piece of feedback:
1. Discuss if unclear
2. Make changes
3. Re-run tests
4. Commit fixes: `git commit -m "fix: Address review feedback on error handling"`

---

## Phase 7: Merge to Main

### Pre-Merge Checklist

- [ ] All review feedback addressed
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Branch is up to date with main
- [ ] CHANGELOG.md updated (if applicable)

### Update from Main

If main has moved ahead while you were working:

```bash
# Switch to main and update
git checkout main
git pull origin main

# Switch back to feature branch
git checkout feature/write-operations

# Rebase on main (keeps history clean)
git rebase main

# Or merge main into feature (preserves history)
git merge main

# Run tests again after rebase/merge
npm test
npm run build
```

### Merge Options

#### Option A: Squash Merge (Recommended for most features)

Clean history, one commit per feature:

```bash
git checkout main
git merge --squash feature/write-operations
git commit -m "feat: Add write operations with user confirmation

- Add createNote, updateNote, deleteNote to VaultService
- Implement ConfirmationDialog component
- Add write operation tools to agent
- Add 45 tests for write operations
- Update documentation

Closes #123"
```

#### Option B: Regular Merge (For long-lived features with important history)

```bash
git checkout main
git merge feature/write-operations
```

#### Option C: Rebase Merge (For clean linear history)

```bash
# On feature branch
git rebase main

# Switch to main
git checkout main
git merge --ff-only feature/write-operations
```

### Clean Up Branch

After merge:
```bash
# Delete local branch
git branch -d feature/write-operations

# Delete remote branch (if pushed)
git push origin --delete feature/write-operations
```

---

## Phase 8: Release and Deploy

### Version Bumping

Follow semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (v1.0.0 → v2.0.0)
- **MINOR**: New features, backward compatible (v1.0.0 → v1.1.0)
- **PATCH**: Bug fixes (v1.0.0 → v1.0.1)

**Update version in:**
1. `package.json` - version field
2. `manifest.json` - version field
3. `versions.json` - add new entry

### Create Release

```bash
# Tag the release
git tag -a v1.1.0 -m "Release v1.1.0: Write operations"

# Push tag
git push origin v1.1.0
```

### Deploy to Test Vault

```bash
# Build production version
npm run build

# Copy to test vault
cp main.js ~/.obsidian/plugins/obsidian-agent/
cp manifest.json ~/.obsidian/plugins/obsidian-agent/
cp styles.css ~/.obsidian/plugins/obsidian-agent/

# Reload Obsidian
```

### Update CHANGELOG.md

```markdown
## [1.1.0] - 2024-01-15

### Added
- Write operations: create, update, delete notes
- User confirmation dialog for all write operations
- Undo/redo support for write operations

### Changed
- Updated system prompt to describe write capabilities
- Enhanced error messages for permission denied cases

### Fixed
- None

### Breaking Changes
- None
```

---

## Quick Reference: Common Workflows

### Starting a New Feature

```bash
# 1. Make sure you have a feature doc
vim docs/features/my-feature.md

# 2. Create spec with Claude Code
# In Claude Code: "@spec-builder implement docs/features/my-feature.md"

# 3. Create branch
git checkout main
git pull origin main
git checkout -b feature/my-feature

# 4. Implement with Claude Code
# In Claude Code: "Execute specs/my-feature-spec.md"

# 5. Test and commit as you go
npm test
git commit -m "feat: [description]"

# 6. Review and merge
# In Claude Code: "Review this feature against the spec"
git checkout main
git merge --squash feature/my-feature
git commit -m "feat: Complete my-feature implementation"
```

### Fixing a Bug

```bash
# 1. Create branch
git checkout -b fix/bug-description

# 2. Write failing test
# In Claude Code: "Help me write a test that reproduces the bug where..."

# 3. Fix the bug
# In Claude Code: "Fix the bug by..."

# 4. Verify test passes
npm test

# 5. Merge
git checkout main
git merge --squash fix/bug-description
git commit -m "fix: [description]"
```

### Updating Documentation

```bash
# Small doc changes - no branch needed
git checkout main
# Make changes
git commit -m "docs: Update workflow guide with branch naming"
git push origin main

# Large doc restructure - use branch
git checkout -b docs/restructure-documentation
# Make changes
git commit -m "docs: Restructure documentation"
git checkout main
git merge docs/restructure-documentation
```

---

## Tips and Best Practices

### Working with Claude Code

1. **Be specific with context:** Reference specific files, line numbers, and the feature doc
2. **Use skills proactively:** `@spec-builder`, `@code-reviewer`, etc.
3. **Break down large tasks:** Don't try to build everything at once
4. **Review generated code:** Claude Code is powerful but not perfect
5. **Ask for explanations:** "Why did you implement it this way?"

### Git Practices

1. **Commit early and often:** Small commits are easier to understand and revert
2. **Write good commit messages:** Future you will thank you
3. **Keep branches short-lived:** Merge within days, not weeks
4. **Rebase/merge main frequently:** Avoid painful merge conflicts
5. **Don't push broken code:** Always run tests before pushing

### Documentation Practices

1. **Update docs with code:** Don't defer documentation
2. **Keep CLAUDE.md accurate:** It's Claude Code's guide to your project
3. **Feature docs drive development:** Write the doc before the code
4. **VISION.md is your north star:** Check alignment regularly

### Testing Practices

1. **Write tests first when possible:** TDD catches bugs early
2. **Test edge cases:** Null, empty, very large, concurrent access
3. **Keep coverage high:** 80%+ is the goal
4. **Use descriptive test names:** Test names are documentation

---

## Example: Complete Feature Workflow

Let's walk through a complete example of adding semantic search:

### 1. Document the Vision (if not already done)

Already in `docs/VISION.md` as v3.0 milestone ✓

### 2. Create Feature Document

```bash
# Create docs/features/semantic-search.md
```

```markdown
# Feature: Semantic Search

## User Story
As a user, I want to search my vault by meaning rather than keywords, so I can find relevant notes even when I don't know exact terms.

## Acceptance Criteria
- [ ] Generate embeddings for all notes
- [ ] Store embeddings efficiently
- [ ] Search by semantic similarity
- [ ] Return top 10 most relevant results
- [ ] Show similarity scores

## Technical Approach
- Use OpenAI embeddings API
- Store in local SQLite database
- Add semantic_search tool to agent
- Background indexing on vault changes
```

### 3. Prioritize

- **User impact:** High - frequently requested feature
- **Complexity:** Medium - 1-2 weeks
- **Dependencies:** v1.0 stable ✓
- **Priority:** P1 - Next major feature

Decision: **Build it now**

### 4. Create Spec

In Claude Code:
```
@spec-builder I need to implement semantic search from docs/features/semantic-search.md.

Context:
- Using OpenAI embeddings (text-embedding-3-small)
- Store in SQLite for fast lookup
- Add to existing VaultTools
- Need background indexing service

Create a comprehensive spec with all implementation steps.
```

Spec is saved to `specs/semantic-search-spec.md`

### 5. Create Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/semantic-search
```

### 6. Implement

In Claude Code:
```
Execute specs/semantic-search-spec.md step by step. After each major component, run tests and wait for my approval before continuing.
```

Claude Code implements:
- EmbeddingService (generate and store embeddings)
- SemanticSearchService (query similar embeddings)
- Background indexer
- New agent tool
- Tests for all components
- Documentation updates

You review and approve each step.

### 7. Test

```bash
npm test                  # All tests pass ✓
npm run test:coverage     # Coverage: 84% ✓
npm run build            # Build succeeds ✓
npm run lint             # No lint errors ✓
```

### 8. Review

In Claude Code:
```
I've finished implementing semantic search on the feature/semantic-search branch. Please review against the spec and check for:
- Completeness
- Error handling
- Performance considerations
- Documentation
```

Address feedback, make fixes, re-test.

### 9. Merge

```bash
# Update from main
git checkout main
git pull origin main
git checkout feature/semantic-search
git rebase main

# Tests still pass after rebase
npm test

# Merge to main
git checkout main
git merge --squash feature/semantic-search
git commit -m "feat: Add semantic search with embeddings

- Add EmbeddingService using OpenAI API
- Add SemanticSearchService with SQLite storage
- Implement background indexing on vault changes
- Add semantic_search tool to agent
- Add 67 tests for embedding and search
- Update documentation

Closes #456"

# Push
git push origin main

# Clean up
git branch -d feature/semantic-search
```

### 10. Release

Update versions, create tag, deploy to test vault, update CHANGELOG.md.

---

## Troubleshooting

### "I'm stuck between step X and Y"

**Problem:** Not sure if I should create the spec first or start coding

**Solution:** If the task is unclear or complex (more than a few hours), always create a spec first. Specs clarify thinking.

---

### "My branch has diverged from main"

**Problem:** Main has moved ahead, now I have merge conflicts

**Solution:**
```bash
git checkout feature/my-feature
git rebase main
# Resolve conflicts
git add .
git rebase --continue
npm test  # Verify still works
```

---

### "I want to change direction mid-feature"

**Problem:** Started implementing but realized a different approach is better

**Solution:**
- If branch is clean: Just change direction and update spec
- If lots of commits: Create new branch from main, start fresh
- If partially done: Commit current work, create new branch, cherry-pick good commits

---

### "Feature is taking too long"

**Problem:** Been on feature branch for 2+ weeks, losing momentum

**Solution:**
- Break into smaller features: Ship part 1, then part 2
- Create main feature branch, work on sub-branches
- Merge partial functionality behind feature flag

---

This workflow guide should give you a clear path from idea to production. Adapt it to your needs, but the core structure will keep you organized and productive.
