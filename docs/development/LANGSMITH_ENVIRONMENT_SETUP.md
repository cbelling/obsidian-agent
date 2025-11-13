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
