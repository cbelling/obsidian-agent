# LangSmith Observability & Debugging Setup - Implementation Plan

**Phase:** V0.0 - Development Infrastructure
**Component:** 1. LangSmith Observability & Debugging Setup
**Status:** 📋 Planning
**Estimated Duration:** 2-3 days

---

## Overview

This document outlines the implementation plan for verifying, enhancing, and documenting LangSmith observability capabilities in the Obsidian Agent plugin. The goal is to establish robust debugging workflows using LangSmith traces to enable confident development.

**Key Principle:** This is NOT about building a formal evaluation framework (that's V1.0+). This is about making LangSmith traces useful for everyday debugging during development.

---

## Objectives

1. **Verify** that LangSmith tracing integration works correctly
2. **Enhance** development configuration for smoother workflows
3. **Document** how to effectively use LangSmith for debugging
4. **Enable** developers to quickly diagnose issues using traces
5. **Establish** foundation for future evaluation capabilities (V1.0+)

---

## Current State Analysis

### What Exists

**LangSmith Integration (User-Facing - TO BE REMOVED):**
- Currently exposed in plugin settings UI (`src/settings.ts` lines 54-119)
- Settings stored in `ClaudeChatSettings` interface (`src/types.ts`)
- Users can configure API key, project name, and enable/disable toggle
- Environment variables set in `main.ts` based on plugin settings

**⚠️ PROBLEM:** This is a development tool, not a user feature!
- End users don't need LangSmith tracing
- Adds complexity to settings UI
- Requires users to understand what LangSmith is
- API keys stored in plugin settings (security concern)

### What Needs to Change

**1. Remove User-Facing Configuration:**
- Remove LangSmith section from `src/settings.ts` (lines 54-119)
- Remove `langsmithApiKey`, `langsmithProject`, `langsmithEnabled` from `src/types.ts`
- Simplify settings UI to focus on user features only

**2. Move to Environment-Based Configuration:**
- Read `LANGSMITH_API_KEY` from environment variables
- Read `LANGSMITH_PROJECT` from environment (optional, defaults to "obsidian-agent-dev")
- Enable tracing automatically when environment variables are present
- Developer-only workflow: Set env vars before launching Obsidian

**3. Code Cleanup:**
- Update `main.ts` to check environment instead of settings
- Remove settings persistence for LangSmith
- Add clear developer logging when tracing is enabled
- Update documentation to reflect environment-based approach

### What's Missing (After Cleanup)

1. **Code Changes:** Remove user-facing settings, implement environment-based config
2. **Verification:** Test that environment-based tracing works correctly
3. **Developer Setup Guide:** How to set environment variables per platform
4. **Debugging Guide:** How to use traces for debugging (content remains the same)
5. **Documentation Updates:** Update CLAUDE.md to reflect new approach

---

## Implementation Tasks

### Task 0: Remove User-Facing LangSmith Settings

**Duration:** 2-3 hours
**Priority:** HIGH (must do first)

This task removes LangSmith from the user-facing settings and moves to environment-based configuration.

#### 0.1 Remove Settings UI Code

**File: `src/settings.ts`**

Remove lines 54-119 (entire LangSmith section):
```typescript
// DELETE THIS SECTION:
// LangSmith section
containerEl.createEl('h2', { text: 'LangSmith Tracing (Optional)' });
// ... through ...
containerEl.createEl('p', {
  text: 'View your traces at: https://smith.langchain.com',
  cls: 'mod-success'
});
```

**Result:** Settings UI should only show:
1. Anthropic API Key
2. Data Retention settings

#### 0.2 Update Settings Interface

**File: `src/types.ts`**

Remove LangSmith fields from `ClaudeChatSettings`:
```typescript
export interface ClaudeChatSettings {
  apiKey: string;
  // DELETE THESE:
  // langsmithApiKey: string;
  // langsmithProject: string;
  // langsmithEnabled: boolean;

  // KEEP THESE:
  retentionDays: number;
  maxHistorySize: number;
  enableAutoCleanup: boolean;
}
```

Update `DEFAULT_SETTINGS`:
```typescript
export const DEFAULT_SETTINGS: ClaudeChatSettings = {
  apiKey: '',
  // DELETE THESE:
  // langsmithApiKey: '',
  // langsmithProject: 'obsidian-agent',
  // langsmithEnabled: false,

  // KEEP THESE:
  retentionDays: 30,
  maxHistorySize: 100,
  enableAutoCleanup: true
};
```

#### 0.3 Update Plugin Initialization

**File: `src/main.ts`**

Replace lines 30-48 with environment-based approach:

```typescript
// OLD CODE (lines 30-48) - DELETE THIS:
if (!Platform.isMobile && this.settings.langsmithEnabled && this.settings.langsmithApiKey) {
  if (typeof process !== 'undefined' && process.env) {
    process.env.LANGSMITH_TRACING = "true";
    process.env.LANGSMITH_API_KEY = this.settings.langsmithApiKey;
    process.env.LANGSMITH_PROJECT = this.settings.langsmithProject || "obsidian-agent";
    process.env.LANGSMITH_ENDPOINT = "https://api.smith.langchain.com";
    console.log('[Plugin] Langsmith tracing enabled for project:', this.settings.langsmithProject);
  }
} else {
  if (typeof process !== 'undefined' && process.env) {
    process.env.LANGSMITH_TRACING = "false";
  }
  if (Platform.isMobile && this.settings.langsmithEnabled) {
    console.log('[Plugin] Langsmith tracing not available on mobile');
  }
}

// NEW CODE - REPLACE WITH THIS:
// Configure LangSmith from environment (development only)
if (!Platform.isMobile && typeof process !== 'undefined' && process.env?.LANGSMITH_API_KEY) {
  process.env.LANGSMITH_TRACING = "true";
  process.env.LANGSMITH_PROJECT = process.env.LANGSMITH_PROJECT || "obsidian-agent-dev";
  process.env.LANGSMITH_ENDPOINT = "https://api.smith.langchain.com";
  console.log('[DEV] LangSmith tracing enabled');
  console.log('[DEV] Project:', process.env.LANGSMITH_PROJECT);
  console.log('[DEV] Dashboard: https://smith.langchain.com');
} else {
  if (typeof process !== 'undefined' && process.env) {
    process.env.LANGSMITH_TRACING = "false";
  }
  if (!Platform.isMobile && typeof process === 'undefined') {
    console.log('[DEV] LangSmith tracing not available (no process.env)');
  }
}
```

#### 0.4 Test Code Changes

**Verification:**
1. Build the plugin: `npm run build`
2. Reload in Obsidian
3. Check settings UI:
   - ✅ Should NOT see LangSmith section
   - ✅ Should only see Anthropic API Key and Data Retention
4. Check console logs:
   - ✅ Should see LangSmith status logged
5. Verify plugin still works normally

**Deliverables:**
- [ ] `src/settings.ts` updated (LangSmith section removed)
- [ ] `src/types.ts` updated (LangSmith fields removed)
- [ ] `src/main.ts` updated (environment-based config)
- [ ] Plugin builds successfully
- [ ] Settings UI verified (no LangSmith)
- [ ] Plugin functionality verified (still works)

---

### Task 1: Environment Setup & Verification

**Duration:** 3-4 hours

#### 1.1 Create Developer Setup Guide

**Create:** `docs/development/LANGSMITH_ENVIRONMENT_SETUP.md`

**Content:**

```markdown
# LangSmith Environment Setup for Development

LangSmith tracing is a **development-only feature** for debugging the Obsidian Agent. End users never see or interact with LangSmith.

## Prerequisites

1. **LangSmith Account:**
   - Sign up at https://smith.langchain.com
   - Create an API key in Settings → API Keys
   - Copy your API key (starts with `lsv2_pt_...`)

2. **Desktop Platform:**
   - LangSmith tracing only works on desktop (macOS, Windows, Linux)
   - Mobile platform doesn't support `process.env`

## Setting Environment Variables

### macOS / Linux

**Option 1: Terminal Session (Temporary)**
```bash
# Set environment variables
export LANGSMITH_API_KEY="lsv2_pt_your_key_here"
export LANGSMITH_PROJECT="obsidian-agent-dev"

# Launch Obsidian from this terminal
/Applications/Obsidian.app/Contents/MacOS/Obsidian
```

**Option 2: Shell Profile (Persistent)**

Add to `~/.zshrc` or `~/.bashrc`:
```bash
# LangSmith for Obsidian Agent development
export LANGSMITH_API_KEY="lsv2_pt_your_key_here"
export LANGSMITH_PROJECT="obsidian-agent-dev"
```

Then reload:
```bash
source ~/.zshrc  # or ~/.bashrc
```

**Option 3: Launch Script (Recommended)**

Create `dev-obsidian.sh`:
```bash
#!/bin/bash
export LANGSMITH_API_KEY="lsv2_pt_your_key_here"
export LANGSMITH_PROJECT="obsidian-agent-dev"
/Applications/Obsidian.app/Contents/MacOS/Obsidian
```

Make executable and run:
```bash
chmod +x dev-obsidian.sh
./dev-obsidian.sh
```

### Windows

**Option 1: Command Prompt (Temporary)**
```cmd
set LANGSMITH_API_KEY=lsv2_pt_your_key_here
set LANGSMITH_PROJECT=obsidian-agent-dev
start "" "C:\Program Files\Obsidian\Obsidian.exe"
```

**Option 2: PowerShell (Temporary)**
```powershell
$env:LANGSMITH_API_KEY="lsv2_pt_your_key_here"
$env:LANGSMITH_PROJECT="obsidian-agent-dev"
Start-Process "C:\Program Files\Obsidian\Obsidian.exe"
```

**Option 3: Batch Script (Recommended)**

Create `dev-obsidian.bat`:
```batch
@echo off
set LANGSMITH_API_KEY=lsv2_pt_your_key_here
set LANGSMITH_PROJECT=obsidian-agent-dev
start "" "C:\Program Files\Obsidian\Obsidian.exe"
```

Double-click to run.

**Option 4: System Environment Variables (Persistent)**
1. Search for "Environment Variables" in Start menu
2. Click "Edit the system environment variables"
3. Click "Environment Variables" button
4. Add new User variables:
   - Name: `LANGSMITH_API_KEY`, Value: `lsv2_pt_your_key_here`
   - Name: `LANGSMITH_PROJECT`, Value: `obsidian-agent-dev`
5. Click OK
6. Restart Obsidian

## Verifying Setup

1. Launch Obsidian with environment variables set
2. Open Developer Tools (Cmd/Ctrl + Shift + I)
3. Go to Console tab
4. Look for these logs:
   ```
   [DEV] LangSmith tracing enabled
   [DEV] Project: obsidian-agent-dev
   [DEV] Dashboard: https://smith.langchain.com
   ```

5. If you see these logs, tracing is enabled!

## Testing Tracing

1. Open the Obsidian Agent chat
2. Send a message: "What files are in my vault?"
3. Wait for response
4. Go to https://smith.langchain.com
5. Select your project from dropdown
6. You should see a new trace!

## Troubleshooting

### Traces Not Appearing

**Check environment variables are set:**
```javascript
// In Obsidian DevTools Console:
console.log('API Key set:', !!process.env.LANGSMITH_API_KEY);
console.log('Project:', process.env.LANGSMITH_PROJECT);
console.log('Tracing:', process.env.LANGSMITH_TRACING);
```

Expected output:
```
API Key set: true
Project: obsidian-agent-dev
Tracing: true
```

**Common Issues:**
1. **Environment variables not set before launching**
   - Must set vars BEFORE starting Obsidian
   - Restart Obsidian after setting vars

2. **Wrong Obsidian instance**
   - Make sure you launched from terminal/script
   - Close any other Obsidian instances

3. **Mobile platform**
   - Tracing doesn't work on mobile
   - Only desktop platforms supported

4. **Invalid API key**
   - Key should start with `lsv2_pt_`
   - Check for typos or extra spaces

### Disabling Tracing

Simply launch Obsidian normally (without environment variables):
- Don't run the launch script
- Don't set environment variables
- Or unset them: `unset LANGSMITH_API_KEY` (macOS/Linux)

## Security Notes

**⚠️ Keep your API key private!**
- Don't commit API keys to git
- Don't share launch scripts with keys
- Use `.gitignore` for scripts with keys

**Recommended: Use dotenv pattern**

Create `.env.local` (gitignored):
```bash
LANGSMITH_API_KEY=lsv2_pt_your_key_here
LANGSMITH_PROJECT=obsidian-agent-dev
```

Load from script:
```bash
#!/bin/bash
source .env.local
/Applications/Obsidian.app/Contents/MacOS/Obsidian
```

Add to `.gitignore`:
```
.env.local
dev-obsidian.sh
```

## Next Steps

Once tracing is working:
1. Read `LANGSMITH_DEBUGGING.md` to learn how to use traces
2. Start developing and debugging with confidence!
3. Share trace URLs with team for collaboration
```

**Deliverables:**
- [ ] `LANGSMITH_ENVIRONMENT_SETUP.md` created
- [ ] Platform-specific instructions documented
- [ ] Troubleshooting section complete
- [ ] Security notes included

#### 1.2 Test Environment-Based Configuration

**Test Scenarios:**

**Test 1: Basic Environment Setup**
- Set `LANGSMITH_API_KEY` environment variable
- Launch Obsidian from terminal/script
- Check console logs for "[DEV] LangSmith tracing enabled"
- Verify environment variables in DevTools console

**Test 2: Trace Creation**
- With tracing enabled, send agent query
- Go to https://smith.langchain.com
- Verify trace appears in dashboard
- Check trace includes agent + tool calls

**Test 3: Without Environment Variables**
- Launch Obsidian normally (no env vars)
- Check console logs - should NOT see LangSmith messages
- Verify plugin works normally
- No tracing should occur

**Test 4: Custom Project Name**
- Set `LANGSMITH_PROJECT=test-custom-project`
- Launch Obsidian
- Verify console shows custom project name
- Check traces appear in custom project

**Test 5: Mobile Platform (Expected Failure)**
- Not applicable (we develop on desktop)
- Document that mobile is not supported

#### 1.3 Document Test Results

**Update:** `docs/development/LANGSMITH_STATUS.md`

```markdown
# LangSmith Integration Status

**Last Updated:** [Date]
**Tested By:** [Name]
**LangSmith Version:** 0.3.79
**Configuration:** Environment-based (development only)

## Integration Approach

LangSmith is a **development-only tool** configured via environment variables:
- `LANGSMITH_API_KEY` - Required to enable tracing
- `LANGSMITH_PROJECT` - Optional, defaults to "obsidian-agent-dev"

**Not user-facing:** End users never see or configure LangSmith.

## What Works

- [x] Environment variable detection
- [x] Automatic tracing when env vars present
- [x] Desktop platform support
- [x] Trace creation and visibility
- [x] Tool call tracing
- [x] Error tracing
- [x] Multi-turn conversations
- [x] Token usage tracking
- [x] Custom project names

## What Doesn't Work

- [x] Mobile platform (expected - no process.env support)
- [x] User configuration (removed - development only now)

## Environment Setup

### Required
- `LANGSMITH_API_KEY` - Your LangSmith API key

### Optional
- `LANGSMITH_PROJECT` - Project name (default: "obsidian-agent-dev")

See `LANGSMITH_ENVIRONMENT_SETUP.md` for detailed setup instructions.

## Test Results

### Test 1: Basic Environment Setup
- **Status:** ✅ Pass
- **Environment:** macOS with `export` commands
- **Console Output:**
  ```
  [DEV] LangSmith tracing enabled
  [DEV] Project: obsidian-agent-dev
  [DEV] Dashboard: https://smith.langchain.com
  ```

### Test 2: Trace Creation
- **Status:** ✅ Pass
- **Query:** "What files are in my vault?"
- **Trace ID:** [ID from test]
- **Dashboard:** Trace visible in LangSmith
- **Contents:** Agent call + tool calls + response

### Test 3: Without Environment Variables
- **Status:** ✅ Pass
- **Environment:** Normal Obsidian launch
- **Console:** No LangSmith logs (as expected)
- **Plugin:** Works normally without tracing

### Test 4: Custom Project Name
- **Status:** ✅ Pass
- **Project:** test-custom-project
- **Console:** Shows custom project name
- **Dashboard:** Traces appear in custom project

## Code Locations

**Environment Detection:** `src/main.ts` lines 30-43
```typescript
if (!Platform.isMobile && typeof process !== 'undefined' && process.env?.LANGSMITH_API_KEY) {
  process.env.LANGSMITH_TRACING = "true";
  process.env.LANGSMITH_PROJECT = process.env.LANGSMITH_PROJECT || "obsidian-agent-dev";
  // ...
}
```

**No User Settings:** LangSmith completely removed from `src/settings.ts` and `src/types.ts`

## Developer Workflow

1. Set environment variables (see LANGSMITH_ENVIRONMENT_SETUP.md)
2. Launch Obsidian from terminal/script
3. Check console for "[DEV] LangSmith tracing enabled"
4. Develop and interact with agent
5. View traces at https://smith.langchain.com
6. Debug using LANGSMITH_DEBUGGING.md guide

## Known Limitations

- Desktop only (mobile doesn't support process.env)
- Must launch Obsidian from environment with vars set
- Can't enable/disable tracing without restarting Obsidian

## Migration from User Settings

**Old approach (v0.0.0):**
- Users configured LangSmith in plugin settings
- API keys stored in Obsidian settings
- Toggle to enable/disable

**New approach (v0.0.1+):**
- Development-only feature
- Environment variables only
- No user configuration
- Cleaner, more secure

**Migration:** No action needed - old settings simply ignored after update.
```

**Deliverables:**
- [ ] Environment-based config tested thoroughly
- [ ] All test scenarios documented
- [ ] `LANGSMITH_STATUS.md` updated with results
- [ ] Screenshots captured (if needed)

---

### Task 2: Trace Analysis & Debugging Guide

**Duration:** 6-8 hours
**Priority:** HIGH (core deliverable)

**Note:** The debugging guide content remains largely the same as originally planned, but with updated setup instructions pointing to environment variables instead of plugin settings.

#### 2.1 Create Comprehensive Debugging Guide

**Create:** `docs/development/LANGSMITH_DEBUGGING.md`

**Key Changes from Original Plan:**
1. Setup section references environment variables, not plugin settings
2. Links to `LANGSMITH_ENVIRONMENT_SETUP.md` for initial setup
3. Emphasizes this is a development tool throughout
4. All other content (reading traces, scenarios, performance analysis) remains the same

**Updated Setup Section for LANGSMITH_DEBUGGING.md:**

```markdown
## Setup & Access

### Prerequisites

1. **LangSmith Account:**
   - Sign up at https://smith.langchain.com
   - Create an API key in Settings → API Keys

2. **Environment Configuration:**
   - This is a development-only feature
   - See `LANGSMITH_ENVIRONMENT_SETUP.md` for detailed setup
   - Set `LANGSMITH_API_KEY` environment variable
   - Optionally set `LANGSMITH_PROJECT` (defaults to "obsidian-agent-dev")

3. **Verify Tracing:**
   - Launch Obsidian with environment variables set
   - Check console for "[DEV] LangSmith tracing enabled"
   - Send a query to the agent
   - Go to https://smith.langchain.com
   - Select your project
   - You should see a new trace

[Rest of debugging guide content remains the same...]
```

**Deliverables:**
- [ ] `LANGSMITH_DEBUGGING.md` created with environment-based setup
- [ ] All debugging scenarios documented (unchanged)
- [ ] Performance analysis section complete (unchanged)
- [ ] Best practices documented (unchanged)
- [ ] Screenshots and examples added

---

### Task 3: Update CLAUDE.md Documentation

**Duration:** 1-2 hours
**Priority:** HIGH (keep docs in sync)

#### 3.1 Update CLAUDE.md

**File:** `CLAUDE.md` (root of repo)

**Changes Needed:**

Find and replace the "Langsmith Tracing (Optional)" section:

```markdown
<!-- OLD CONTENT - REMOVE -->
### Langsmith Tracing (Optional)

**Configuration:**
- Enable in plugin settings (desktop only, not available on mobile)
- Set Langsmith API key and project name
- Tracing applies to Anthropic SDK calls and agent execution

**Environment variables set by plugin:**
```
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=<user-configured>
LANGSMITH_PROJECT=<user-configured>
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
```

<!-- NEW CONTENT - REPLACE WITH -->
### Langsmith Tracing (Development Only)

**Important:** LangSmith is a development-only feature, not user-facing.

**Configuration:**
- Set via environment variables before launching Obsidian
- `LANGSMITH_API_KEY` - Required to enable tracing
- `LANGSMITH_PROJECT` - Optional (default: "obsidian-agent-dev")
- Desktop only (mobile doesn't support process.env)

**Setup:**
See `docs/development/LANGSMITH_ENVIRONMENT_SETUP.md` for platform-specific instructions.

**Environment variables set at startup:**
```
LANGSMITH_TRACING=true  # When LANGSMITH_API_KEY is present
LANGSMITH_API_KEY=<from environment>
LANGSMITH_PROJECT=<from environment or default>
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
```

**Usage:**
See `docs/development/LANGSMITH_DEBUGGING.md` for how to use traces for debugging.
```

**Deliverables:**
- [ ] `CLAUDE.md` updated with environment-based approach
- [ ] Links to new documentation added
- [ ] Old references to plugin settings removed

---

### Task 4: Update .gitignore

**Duration:** 15 minutes
**Priority:** MEDIUM

#### 4.1 Add Development Scripts to .gitignore

**File:** `.gitignore`

**Add these entries:**
```
# Development scripts with API keys
.env.local
dev-obsidian.sh
dev-obsidian.bat
launch-with-tracing.sh
launch-with-tracing.bat
```

**Rationale:** Prevent accidental commit of API keys in launch scripts.

**Deliverables:**
- [ ] `.gitignore` updated

## Optional: Development Utilities

### Enhanced Development Configuration (Optional, Low Priority)

**Duration:** 3-4 hours
**Priority:** Medium (only if time permits)

#### 2.1 Create LangSmith Configuration Utility

**Rationale:** Make it easier to enable/configure LangSmith during development without changing plugin settings.

**Create:** `src/utils/LangsmithConfig.ts`

```typescript
/**
 * LangSmith Configuration Utilities
 *
 * Helpers for configuring LangSmith tracing during development.
 * These are utilities for developers, not end-users.
 */

export class LangsmithConfig {
  private static readonly DEFAULT_DEV_PROJECT = 'obsidian-agent-dev';
  private static isTracing = false;

  /**
   * Enable LangSmith tracing for development.
   * Only works on desktop (mobile doesn't support tracing).
   *
   * @param options Configuration options
   */
  static enableDevTracing(options?: {
    apiKey?: string;
    project?: string;
    verbose?: boolean;
  }): void {
    // Check if we're on mobile
    if (Platform.isMobile) {
      console.warn('LangSmith tracing not available on mobile platform');
      return;
    }

    // Get API key from options or environment
    const apiKey = options?.apiKey || process.env.LANGSMITH_API_KEY;
    if (!apiKey) {
      console.warn(
        'LangSmith API key not set. Set LANGSMITH_API_KEY environment variable ' +
        'or pass apiKey option.'
      );
      return;
    }

    // Configure environment
    process.env.LANGSMITH_TRACING = 'true';
    process.env.LANGSMITH_API_KEY = apiKey;
    process.env.LANGSMITH_PROJECT = options?.project || this.DEFAULT_DEV_PROJECT;
    process.env.LANGSMITH_ENDPOINT = 'https://api.smith.langchain.com';

    this.isTracing = true;

    if (options?.verbose !== false) {
      console.log(`✓ LangSmith tracing enabled`);
      console.log(`  Project: ${process.env.LANGSMITH_PROJECT}`);
      console.log(`  Dashboard: https://smith.langchain.com`);
    }
  }

  /**
   * Disable LangSmith tracing.
   */
  static disableDevTracing(): void {
    delete process.env.LANGSMITH_TRACING;
    this.isTracing = false;
    console.log('LangSmith tracing disabled');
  }

  /**
   * Check if tracing is currently enabled.
   */
  static isTracingEnabled(): boolean {
    return this.isTracing || process.env.LANGSMITH_TRACING === 'true';
  }

  /**
   * Get the current LangSmith project name.
   */
  static getCurrentProject(): string | undefined {
    return process.env.LANGSMITH_PROJECT;
  }

  /**
   * Log trace URL for a specific run.
   * Helpful for quickly jumping to traces during development.
   *
   * @param runId The LangSmith run ID
   */
  static logTraceUrl(runId: string): void {
    const project = this.getCurrentProject() || 'default';
    // Note: Replace <org-name> with actual org when known
    const url = `https://smith.langchain.com/o/<org-name>/projects/p/${project}/r/${runId}`;
    console.log(`View trace: ${url}`);
  }
}
```

**Usage Example:**
```typescript
// In development scripts or tests
import { LangsmithConfig } from '@/utils/LangsmithConfig';

// Enable tracing for this session
LangsmithConfig.enableDevTracing({
  project: 'obsidian-agent-testing',
  verbose: true
});

// Run your agent tests...
```

#### 2.2 Create Development Testing Script (Optional)

**Create:** `scripts/test-with-tracing.ts`

```typescript
#!/usr/bin/env tsx

/**
 * Development script for testing agent with LangSmith tracing enabled.
 *
 * Usage:
 *   npm run dev:trace
 *
 * Requirements:
 *   - LANGSMITH_API_KEY environment variable set
 *   - Desktop platform (not mobile)
 */

import { LangsmithConfig } from '../src/utils/LangsmithConfig';

async function main() {
  console.log('Obsidian Agent - LangSmith Tracing Test\n');

  // Enable tracing
  LangsmithConfig.enableDevTracing({
    project: 'obsidian-agent-dev-testing'
  });

  console.log('\nSetup complete!');
  console.log('Next steps:');
  console.log('1. Load the plugin in Obsidian');
  console.log('2. Interact with the agent');
  console.log('3. Check traces at: https://smith.langchain.com');
  console.log('\nPress Ctrl+C to exit');

  // Keep script running
  await new Promise(() => {});
}

main().catch(console.error);
```

**Add to `package.json`:**
```json
{
  "scripts": {
    "dev:trace": "tsx scripts/test-with-tracing.ts"
  },
  "devDependencies": {
    "tsx": "^4.7.0"
  }
}
```

**Deliverables (Optional):**
- [ ] `src/utils/LangsmithConfig.ts` created
- [ ] `scripts/test-with-tracing.ts` created
- [ ] npm script added to package.json
- [ ] Utility tested and working

---

### Task 3: Trace Analysis & Debugging Guide

**Duration:** 6-8 hours
**Priority:** High (core deliverable)

#### 3.1 Create Comprehensive Debugging Guide

**Create:** `docs/development/LANGSMITH_DEBUGGING.md`

**Structure:**

```markdown
# LangSmith Debugging Guide

Complete guide to using LangSmith traces for debugging the Obsidian Agent.

## Table of Contents
1. [Introduction](#introduction)
2. [Setup & Access](#setup--access)
3. [Understanding Trace Hierarchy](#understanding-trace-hierarchy)
4. [Reading Traces](#reading-traces)
5. [Common Debugging Scenarios](#common-debugging-scenarios)
6. [Performance Analysis](#performance-analysis)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is LangSmith?

LangSmith is LangChain's observability platform that captures detailed traces of LLM applications. For the Obsidian Agent, this means you can see:

- Every message sent to/from Claude
- Every tool call made by the agent
- Token usage and costs
- Execution timing
- Errors and their context

### When to Use LangSmith

**Use LangSmith when:**
- Debugging why the agent made a specific decision
- Understanding which tools were called and why
- Analyzing performance bottlenecks
- Investigating errors or unexpected behavior
- Optimizing token usage
- Verifying agent behavior changes

**Don't need LangSmith when:**
- Simple plugin configuration issues
- UI bugs unrelated to agent logic
- File system or Obsidian API issues
- Mobile platform (tracing not supported)

---

## Setup & Access

### Prerequisites

1. **LangSmith Account:**
   - Sign up at https://smith.langchain.com
   - Create an API key in Settings → API Keys

2. **Plugin Configuration:**
   - Open Obsidian Settings → Obsidian Agent
   - Enter your LangSmith API Key
   - Set a project name (e.g., "obsidian-agent-dev")
   - Save settings

3. **Verify Tracing:**
   - Send a query to the agent
   - Go to https://smith.langchain.com
   - Select your project
   - You should see a new trace

[Screenshot: LangSmith dashboard showing successful trace]

### Accessing Traces

**Option 1: Via Dashboard**
- Go to https://smith.langchain.com
- Select your project from the dropdown
- Traces appear in chronological order

**Option 2: Direct Links**
- Each trace has a unique URL
- Share links with team members for collaboration

---

## Understanding Trace Hierarchy

### Trace Structure

A typical Obsidian Agent trace has this structure:

```
Agent Run (root)
├── Input Messages
│   └── User query
├── Agent Node
│   ├── System Prompt
│   ├── Conversation History
│   ├── Tool Definitions
│   └── LLM Call (Anthropic)
│       ├── Request
│       │   ├── Model: claude-sonnet-4-5
│       │   ├── Messages
│       │   └── Tools
│       └── Response
│           ├── Content (or tool calls)
│           └── Token Usage
├── Tool Node (if tools called)
│   ├── Tool: search_vault_by_filename
│   │   ├── Input: { filename: "example" }
│   │   └── Output: [search results]
│   └── [Additional tool calls...]
├── Agent Node (tool results → final response)
│   └── LLM Call (with tool results)
└── Output Messages
    └── Final response to user
```

### Key Components

**1. Agent Node**
- Contains the LLM call to Claude
- Shows system prompt and conversation history
- Displays available tools
- Shows the model's decision (respond or use tools)

**2. Tool Node**
- Executed when agent decides to use tools
- Shows tool name, input parameters, and output
- Multiple tools can be called in parallel

**3. Messages**
- Input: User's query
- Output: Agent's final response
- Intermediate: Tool results, agent reasoning

---

## Reading Traces

### Step-by-Step Trace Analysis

#### Step 1: Locate Your Trace

[Screenshot: LangSmith trace list]

- Traces are ordered by timestamp (newest first)
- Look for the timestamp matching your test
- Click on the trace to open details

#### Step 2: Examine Input/Output

[Screenshot: Trace input/output]

- **Input:** What the user asked
- **Output:** What the agent responded
- Quick sanity check: Did the agent answer correctly?

#### Step 3: Inspect Agent Decisions

[Screenshot: Agent node expanded]

- Click on "Agent Node" to expand
- Look at the LLM Call
- See what Claude received:
  - System prompt
  - Conversation history
  - Available tools
  - Current user message

#### Step 4: Check Tool Calls

[Screenshot: Tool node with calls]

- If agent used tools, expand "Tool Node"
- See which tools were called
- Check tool inputs and outputs
- Verify tool outputs are what you expected

#### Step 5: Review Token Usage

[Screenshot: Token usage stats]

- Click on any LLM call
- See token breakdown:
  - Input tokens
  - Output tokens
  - Total tokens
- Useful for optimization

---

## Common Debugging Scenarios

### Scenario 1: "Why did the agent call this tool?"

**Problem:** Agent used a tool you didn't expect.

**How to Debug:**

1. Open the trace for that interaction
2. Expand the Agent Node → LLM Call → Request
3. Look at the messages sent to Claude:
   - What was the user query?
   - What was the conversation history?
   - What tools were available?
4. Check the tool descriptions:
   - Are they clear and unambiguous?
   - Do they overlap in purpose?
5. Look at the Response:
   - What did Claude decide?
   - Did it explain its reasoning?

**Common Causes:**
- Ambiguous tool descriptions
- Missing context in system prompt
- Overlapping tool purposes
- User query could match multiple tools

**Example:**

[Screenshot showing tool selection reasoning]

**Fix:**
- Clarify tool descriptions
- Add examples to tool descriptions
- Update system prompt to guide tool selection

---

### Scenario 2: "Why is this slow?"

**Problem:** Agent takes a long time to respond.

**How to Debug:**

1. Open the trace
2. Look at the timing for each component:
   - Agent Node duration
   - Tool Node duration
   - Individual tool call durations
3. Identify the bottleneck

**Timing Breakdown:**

[Screenshot: Trace with timing information highlighted]

- **Agent Node:** Time spent in LLM call
  - Input token count affects latency
  - Output token count affects latency
  - Model choice (Sonnet vs Opus)
- **Tool Node:** Time spent in vault operations
  - File reads
  - Search operations
  - Cache hits vs misses

**Common Bottlenecks:**
1. **Large input context**
   - Long conversation history
   - Many tools in prompt
   - Large system prompt
   - Fix: Prune conversation history, reduce tool list

2. **Slow tool execution**
   - Content search scanning many files
   - Reading large files
   - Cache misses
   - Fix: Optimize search, add caching, use pagination

3. **Multiple tool calls**
   - Agent calls many tools sequentially
   - Each call has latency
   - Fix: Consider if tools can be combined

**Example Analysis:**

```
Total time: 5.2s
├── Agent Node 1: 2.1s (LLM call)
├── Tool Node: 2.8s
│   ├── search_vault: 2.5s (SLOW!)
│   └── read_file: 0.3s
└── Agent Node 2: 0.3s (LLM call with tool results)

Conclusion: search_vault is the bottleneck
Action: Check if cache is working, optimize search logic
```

---

### Scenario 3: "What went wrong?"

**Problem:** Agent returned an error or unexpected result.

**How to Debug:**

1. Open the trace
2. Look for red error indicators
3. Find where the error occurred:
   - Agent Node (LLM API error?)
   - Tool Node (tool execution error?)
4. Examine the error details

**Error Types:**

**1. API Errors (Agent Node)**

[Screenshot: API error in trace]

- Rate limit exceeded
- Invalid API key
- Model not found
- Timeout

**Where to look:**
- Agent Node → LLM Call → Error
- Check error code and message
- Verify API key is valid
- Check rate limiter settings

**2. Tool Execution Errors (Tool Node)**

[Screenshot: Tool error in trace]

- File not found
- Invalid search parameters
- Permission issues

**Where to look:**
- Tool Node → Specific tool → Error
- Check tool input parameters
- Verify file/path exists
- Check error message

**3. Validation Errors**

- Invalid tool parameters
- Schema validation failures

**Where to look:**
- Tool Node → Input validation
- Check Zod schema definition
- Verify parameter types

**Example:**

[Screenshot of error trace with annotations]

---

### Scenario 4: "How can I reproduce this?"

**Problem:** User reported an issue, need to reproduce it.

**How to Debug:**

1. Get the trace ID from the user (if possible)
2. Open the trace in LangSmith
3. Extract the exact inputs:
   - User query
   - Conversation history
   - Vault state (files that existed)
4. Recreate the scenario locally

**Extracting Inputs:**

[Screenshot: Copying input from trace]

```typescript
// Example: Reproduce from trace
const userQuery = "..." // From trace input
const conversationHistory = [...] // From trace messages
const threadId = "..." // From trace metadata

// Recreate the exact scenario
await agent.invoke({
  messages: [
    ...conversationHistory,
    new HumanMessage(userQuery)
  ]
}, {
  threadId
});
```

**Tips:**
- Take note of which files existed in vault
- Check conversation history length
- Verify tool availability
- Note any errors in the trace

---

## Performance Analysis

### Token Usage Optimization

**Finding Token Waste:**

1. Open a trace
2. Expand each LLM call
3. Check token counts:
   - Input tokens
   - Output tokens
4. Identify opportunities to reduce

**Common Token Sinks:**

1. **System Prompt (typically 200-500 tokens)**
   - Review for unnecessary detail
   - Keep focused on core capabilities
   - Example vs explanation tradeoff

2. **Tool Definitions (50-100 tokens per tool)**
   - 8 tools × ~75 tokens = ~600 tokens
   - Concise descriptions
   - Remove unnecessary tools from context

3. **Conversation History (grows over time)**
   - Each message pair adds tokens
   - Consider limiting history length
   - Prune old messages in long conversations

4. **Tool Results**
   - Search results can be large
   - File content can be large
   - Use pagination and limits

**Example Analysis:**

[Screenshot: Token usage breakdown]

```
Input Tokens: 2,450
├── System Prompt: 350
├── Tool Definitions: 600
├── Conversation History: 1,200 (8 message pairs)
└── Current Message: 300

Output Tokens: 420

Optimization Ideas:
- Limit conversation history to 5 pairs (save ~600 tokens)
- Reduce tool descriptions (save ~200 tokens)
- Total savings: ~800 tokens (33% reduction)
```

### Execution Time Optimization

**Use traces to identify slow operations:**

1. Sort traces by duration
2. Identify patterns:
   - Which tools are slowest?
   - Which queries take longest?
   - Are there cache misses?

3. Optimize based on findings:
   - Add caching where missing
   - Optimize search algorithms
   - Reduce tool execution time

**Metrics to Track:**
- P50 latency (median)
- P95 latency (95th percentile)
- Cache hit rate
- Tool execution time distribution

---

## Best Practices

### During Development

1. **Always enable tracing during feature development**
   - Helps verify behavior matches expectations
   - Documents agent behavior for future reference

2. **Review traces for new features**
   - Does the agent use the new tool correctly?
   - Is the tool description clear enough?
   - Are there edge cases to handle?

3. **Use traces to verify bug fixes**
   - Before: Trace showing the bug
   - After: Trace showing it fixed
   - Keep both for documentation

4. **Share trace URLs when asking for help**
   - Much easier than describing the problem
   - Team can see exact agent behavior

### When Optimizing

1. **Baseline before optimizing**
   - Capture traces before changes
   - Note current performance metrics

2. **Compare traces after optimization**
   - Did token usage decrease?
   - Did latency improve?
   - Did behavior stay correct?

3. **Document optimization in commits**
   - Link to "before" and "after" traces
   - Show quantitative improvements

### Project Organization

1. **Use descriptive project names**
   - `obsidian-agent-dev` for development
   - `obsidian-agent-testing` for formal tests
   - `obsidian-agent-prod` if running in production

2. **Tag traces with metadata**
   - Feature being tested
   - Bug being investigated
   - Version number

3. **Prune old projects periodically**
   - Archive completed projects
   - Keep trace history manageable

---

## Troubleshooting

### Traces Not Appearing

**Symptoms:** Agent works but no traces in LangSmith.

**Checklist:**
1. [ ] Is this desktop (not mobile)?
   - Mobile doesn't support tracing
2. [ ] Is LangSmith API key set in settings?
3. [ ] Is project name set in settings?
4. [ ] Check console for errors:
   - Look for LangSmith connection errors
5. [ ] Verify environment variables are set:
   - `LANGSMITH_TRACING=true`
   - `LANGSMITH_API_KEY=sk-...`
   - `LANGSMITH_PROJECT=...`

**How to Check:**
```typescript
// In browser console (Obsidian DevTools)
console.log(process.env.LANGSMITH_TRACING);
console.log(process.env.LANGSMITH_PROJECT);
console.log(process.env.LANGSMITH_API_KEY?.substring(0, 10) + '...');
```

### Incomplete Traces

**Symptoms:** Traces appear but missing information.

**Possible Causes:**
1. Error occurred during tracing
   - Check console logs
2. Trace still processing
   - Wait a few seconds, refresh
3. Network connectivity issues
   - Check LangSmith status page

### Slow LangSmith Dashboard

**Symptoms:** Dashboard takes long to load.

**Tips:**
1. Filter by date range (last 24h, last week)
2. Use search/filters to narrow results
3. Prune old projects
4. Clear browser cache

### Can't Find Specific Trace

**Tips:**
1. Filter by timestamp
2. Search by user query text
3. Filter by status (success/error)
4. Check you're in the right project
5. Sort by duration to find outliers

---

## Additional Resources

### LangSmith Documentation
- Official docs: https://docs.smith.langchain.com
- Tracing concepts: https://docs.smith.langchain.com/tracing
- API reference: https://docs.smith.langchain.com/api

### Obsidian Agent Specific
- `LANGSMITH_STATUS.md`: Current integration status
- `ARCHITECTURE.md`: Agent architecture overview
- `DEVELOPMENT.md`: Development setup guide

### Getting Help

If you encounter issues not covered in this guide:

1. Check console logs for errors
2. Verify setup following LANGSMITH_STATUS.md
3. Capture a trace (if possible) and share the URL
4. Open an issue with:
   - What you were trying to do
   - What you expected
   - What actually happened
   - Trace URL (if available)
   - Console errors (if any)

---

## Appendix: Trace Examples

### Example 1: Simple Query (No Tools)

[Screenshot: Simple query trace]

**Query:** "Hello, who are you?"

**Trace Structure:**
- Agent Node
  - LLM Call (single round)
  - Response: Introduction message
- No tool calls
- Fast response (~1s)

### Example 2: Query with Tool Use

[Screenshot: Query with tools trace]

**Query:** "What markdown files mention 'LangGraph'?"

**Trace Structure:**
- Agent Node (decides to use search tool)
- Tool Node
  - search_vault_by_content
  - Input: { query: "LangGraph" }
  - Output: [list of files]
- Agent Node (formats results for user)

### Example 3: Multi-Tool Query

[Screenshot: Multi-tool trace]

**Query:** "Find files about testing and show me the content of the first one"

**Trace Structure:**
- Agent Node (decides to search)
- Tool Node
  - search_vault_by_content (query: "testing")
- Agent Node (decides to read file)
- Tool Node
  - read_file (path: "tests/README.md")
- Agent Node (formats combined results)

### Example 4: Error Case

[Screenshot: Error trace]

**Query:** "Read the file xyz.md"

**Trace Structure:**
- Agent Node (decides to read file)
- Tool Node
  - read_file (path: "xyz.md")
  - ERROR: File not found
- Agent Node (explains error to user)

---

**End of Guide**
```

**Deliverables:**
- [ ] `docs/development/LANGSMITH_DEBUGGING.md` created
- [ ] Screenshots captured and embedded
- [ ] Examples tested and verified
- [ ] Guide reviewed for accuracy

---

### Task 4: Document Common Debugging Scenarios

**Duration:** 2-3 hours
**Priority:** High

This is integrated into Task 3 above (section: "Common Debugging Scenarios").

Additional scenarios to consider documenting:

1. **"Agent keeps calling the same tool repeatedly"**
   - How to identify infinite loops in traces
   - Common causes and fixes

2. **"Tool returns correct data but agent doesn't use it"**
   - Examining tool output format
   - Checking agent's interpretation

3. **"Agent hallucinates instead of using tools"**
   - Verifying tools are visible to agent
   - Checking tool descriptions
   - Prompt engineering insights

4. **"Different behavior with same query"**
   - LLM non-determinism
   - Temperature settings
   - Conversation context differences

---

## Testing & Validation

### Validation Checklist

Before marking this task complete:

- [ ] **Verification Testing:**
  - [ ] LangSmith traces confirmed working on desktop
  - [ ] All test scenarios documented in LANGSMITH_STATUS.md
  - [ ] Screenshots captured of successful traces

- [ ] **Documentation Testing:**
  - [ ] Another developer can follow LANGSMITH_DEBUGGING.md
  - [ ] All screenshots are clear and annotated
  - [ ] Examples are realistic and helpful
  - [ ] Links work correctly

- [ ] **Optional Utilities (if implemented):**
  - [ ] LangsmithConfig utility works correctly
  - [ ] Development script runs without errors
  - [ ] npm scripts added and tested

---

## Success Criteria

### Must Have (Required)
1. ✅ LangSmith tracing verified working on desktop
2. ✅ `LANGSMITH_STATUS.md` documents current state with test results
3. ✅ `LANGSMITH_DEBUGGING.md` provides comprehensive debugging guide
4. ✅ Common debugging scenarios documented with examples
5. ✅ Screenshots of traces included in documentation

### Nice to Have (Optional)
1. LangsmithConfig utility for development
2. Development testing scripts
3. Trace URL helpers
4. Additional debugging utilities

### Out of Scope
- Formal evaluation framework (V1.0+)
- Automated evaluation runs
- Metrics collection pipelines
- CI/CD evaluation integration

---

## Dependencies

### External Dependencies
- LangSmith account (free tier sufficient)
- LangSmith API key
- `langsmith` package (already installed: ^0.3.79)

### Optional Dependencies
- `tsx` for TypeScript script execution (if creating dev scripts)

### Internal Dependencies
- Existing LangSmith integration in plugin settings
- Desktop platform (mobile doesn't support tracing)

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| LangSmith API changes | Medium | Low | Document version used, update if needed |
| Traces don't capture all data | Medium | Low | Test thoroughly, document limitations |
| Documentation becomes outdated | Low | Medium | Keep close to code, update with changes |
| Too much detail overwhelms users | Low | Medium | Progressive disclosure, good structure |

---

## Next Steps After Completion

1. **Use LangSmith actively during development**
   - Review traces for all new features
   - Document interesting patterns
   - Share helpful traces with team

2. **Update documentation as needed**
   - Add new scenarios as discovered
   - Improve examples based on real usage
   - Keep screenshots current

3. **Foundation for V1.0 Evaluation Framework**
   - Trace data can seed evaluation datasets
   - Common scenarios become test cases
   - Performance baselines for regression testing

---

## Decisions Made

### ✅ Decision 1: Environment-Based Configuration Only

**Chosen Approach:** LangSmith is development-only, configured via environment variables

**Rationale:**
- LangSmith is a developer debugging tool, not a user feature
- Removes complexity from user-facing settings
- Better security (no API keys in plugin settings)
- Standard practice for development tools
- Cleaner separation of concerns

**Implementation:**
- Remove all LangSmith settings from plugin UI
- Read `LANGSMITH_API_KEY` from environment
- Auto-enable when API key is present
- Default project name: `obsidian-agent-dev`

### ✅ Decision 2: Tracing Enabled Automatically

**Chosen Approach:** Enable tracing when `LANGSMITH_API_KEY` environment variable is set

**Rationale:**
- Most developer-friendly
- No additional configuration needed
- Clear console logging when active
- Easy to disable (don't set the env var)

### ✅ Decision 3: Documentation First, Utilities Later

**Chosen Approach:** Create comprehensive documentation, add utilities only if needed

**Rationale:**
- Don't over-engineer at this stage
- See what pain points actually emerge
- Environment variables are simple enough
- Can add helpers later based on real usage

### ✅ Decision 4: Default Project Name

**Chosen:** `obsidian-agent-dev` as default

**Rationale:**
- Clear it's for development
- Different from any potential production project
- Developer can override with `LANGSMITH_PROJECT` env var

---

## Timeline

**Estimated Total:** 2-3 days (16-20 hours)

### Day 1: Code Cleanup & Environment Setup
**Morning: Remove User-Facing Settings (2-3h)**
- Task 0.1-0.3: Remove LangSmith from settings.ts, types.ts
- Update main.ts to environment-based config
- Build and verify plugin still works

**Afternoon: Environment Setup Documentation (2-3h)**
- Task 1.1: Create LANGSMITH_ENVIRONMENT_SETUP.md
- Platform-specific instructions (macOS, Windows, Linux)
- Troubleshooting and security notes

**Evening: Testing & Status Documentation (2-3h)**
- Task 1.2: Test environment-based configuration
- Task 1.3: Document results in LANGSMITH_STATUS.md
- **Deliverables:** Code cleanup complete, environment docs, status doc

### Day 2: Debugging Guide
**Morning: Guide Structure & Core Sections (3-4h)**
- Task 2: Create LANGSMITH_DEBUGGING.md
- Introduction, setup (environment-based), trace hierarchy
- Reading traces step-by-step

**Afternoon: Debugging Scenarios (3-4h)**
- Common debugging scenarios (4-5 scenarios)
- Examples and explanations
- Performance analysis section

**Evening: Best Practices & Polish (2h)**
- Best practices section
- Troubleshooting section
- **Deliverable:** LANGSMITH_DEBUGGING.md (draft)

### Day 3: Documentation Updates & Final Testing
**Morning: Update Project Documentation (2-3h)**
- Task 3: Update CLAUDE.md with environment approach
- Task 4: Update .gitignore
- Review all documentation for consistency

**Afternoon: Final Testing & Screenshots (2-3h)**
- Capture screenshots for debugging guide
- End-to-end testing of all documentation
- Verify guides can be followed successfully

**Evening: Review & Polish (1-2h)**
- Final documentation review
- Fix any issues found during testing
- **Deliverable:** All documentation complete and verified

### Optional (If Time Permits)
- LangsmithConfig utility (~2h)
- Development testing scripts (~2h)

---

## Definition of Done

**Code Changes:**
- [ ] LangSmith removed from `src/settings.ts` (lines 54-119 deleted)
- [ ] LangSmith removed from `src/types.ts` interface
- [ ] `src/main.ts` updated to environment-based configuration
- [ ] Plugin builds successfully
- [ ] Settings UI verified (no LangSmith section)
- [ ] Plugin functionality verified (still works normally)

**Documentation:**
- [ ] `LANGSMITH_ENVIRONMENT_SETUP.md` created with platform instructions
- [ ] `LANGSMITH_STATUS.md` created with test results
- [ ] `LANGSMITH_DEBUGGING.md` created with comprehensive guide
- [ ] `CLAUDE.md` updated to reflect environment-based approach
- [ ] `.gitignore` updated to exclude dev scripts
- [ ] All screenshots captured and embedded
- [ ] Examples tested and accurate

**Verification:**
- [ ] LangSmith tracing verified working with environment variables
- [ ] Another developer can follow setup guide successfully
- [ ] Debugging guide is clear and helpful
- [ ] All documentation reviewed and approved
- [ ] Changes committed to repository

---

## References

- V0.md specification (source requirements)
- CLAUDE.md (current LangSmith integration)
- LangSmith docs: https://docs.smith.langchain.com
- LangGraph docs: https://langchain-ai.github.io/langgraph/
