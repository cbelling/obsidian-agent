# ESLint Configuration Enhancement - Quick Summary

**Status:** ✅ Ready for Implementation
**Full Spec:** `docs/ESLINT_SPEC.md`

---

## What We're Doing

1. **Add Prettier** for automated code formatting
2. **Enhance ESLint** with stricter async rules and re-enabled type safety
3. **Add pre-commit hooks** to auto-format and prevent bad commits
4. **Fix 18 async errors** that could cause bugs
5. **Document type warnings** for gradual improvement

---

## Key Decisions

✅ **Upgrade async rules to errors** (no-floating-promises, no-misused-promises)
- Why: Prevent real bugs (crashes, data loss, race conditions)
- Impact: Must fix 18 warnings before merging

✅ **Re-enable type safety warnings** (no-unsafe-*)
- Why: Track type issues, improve gradually
- Impact: Warnings increase from 31 → 50-100+ (tracked, don't block builds)

✅ **Add Prettier**
- Why: Industry standard, auto-format on save, consistent style
- Impact: All files reformatted once

❌ **No Airbnb config**
- Why: Too opinionated, conflicts with Obsidian patterns
- Alternative: TypeScript ESLint recommended + Prettier

---

## 3-Day Implementation Plan

### Day 1: Setup (4-5 hours)
**Morning:**
- Install Prettier, format codebase (1 commit)
- Enhance eslint.config.mjs (upgrade async → errors, re-enable type safety)
- Install Husky + lint-staged for pre-commit hooks

**Deliverable:** Auto-formatting and enhanced linting configured

### Day 2: Fixes (6-8 hours)
**Morning/Afternoon:**
- Fix 18 async/promise errors across 4 files
- Document type safety warnings with eslint-disable comments
- Update CI/CD workflow

**Deliverable:** Zero async errors, type warnings documented

### Day 3: Documentation (4-5 hours)
**All day:**
- Write comprehensive LINTING.md guide
- Final validation and testing
- Create PR

**Deliverable:** Complete documentation, ready to merge

---

## What Gets Installed

```bash
npm install --save-dev prettier eslint-config-prettier husky lint-staged
```

**Total:** 4 new packages

---

## What Changes

### New Files
- `.prettierrc` - Prettier config
- `.prettierignore` - Formatting exclusions
- `.husky/pre-commit` - Pre-commit hook script
- `.vscode/settings.json` - Editor integration
- `docs/development/LINTING.md` - Developer guide

### Modified Files
- `eslint.config.mjs` - Enhanced rules + Prettier integration
- `package.json` - New scripts + lint-staged config
- `.github/workflows/test.yml` - Added format check
- All `.ts` files - Formatted by Prettier (one-time)

---

## Expected Outcomes

**Before:**
- 31 warnings (18 async, 13 type safety)
- No code formatting standards
- Can commit code with async bugs

**After:**
- 0 async errors (all fixed)
- 50-100+ type warnings (documented, tracked in GitHub issue)
- Auto-formatted code on every save
- Pre-commit hook prevents async bugs from being committed
- CI/CD fails on formatting or linting errors

---

## Success Criteria

✅ Zero async/promise errors
✅ All files formatted consistently
✅ Pre-commit hook working (auto-format + block errors)
✅ CI/CD enforces formatting and linting
✅ Type warnings documented with explanations
✅ Comprehensive developer documentation

---

## Next Steps

Ready to execute? The full implementation plan is in `docs/ESLINT_SPEC.md`.

**Start with:**
```bash
# Phase 1: Install Prettier
npm install --save-dev prettier eslint-config-prettier

# See ESLINT_SPEC.md Phase 1 for detailed steps
```
