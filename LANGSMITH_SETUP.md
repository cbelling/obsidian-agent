# Quick LangSmith Setup

## One-Time Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Add your API key** to `.env.local`:
   ```bash
   LANGSMITH_API_KEY=lsv2_pt_your_actual_key_here
   LANGSMITH_PROJECT=obsidian-agent-dev
   ```

   Get your API key from: https://smith.langchain.com/settings

3. **Done!** Your `.env.local` is gitignored and won't be committed.

## Usage

**Launch Obsidian with tracing:**
```bash
./dev-obsidian.sh
```

**Launch Obsidian normally (no tracing):**
Just open Obsidian the regular way (Dock, Applications folder, etc.)

## Verify It's Working

1. Launch Obsidian using `./dev-obsidian.sh`
2. Open DevTools: `Cmd+Shift+I`
3. Look for in console:
   ```
   [DEV] LangSmith tracing enabled
   [DEV] Project: obsidian-agent-dev
   [DEV] Dashboard: https://smith.langchain.com
   ```

4. Use the agent, then check https://smith.langchain.com for traces!

## Troubleshooting

**Script says ".env.local not found"**
- You forgot step 1! Run: `cp .env.example .env.local`

**No traces appearing**
- Check your API key is correct in `.env.local`
- Make sure you launched from `./dev-obsidian.sh`, not the Dock
- Close other Obsidian instances first

**Want to disable tracing temporarily?**
- Just launch Obsidian normally (not via the script)

---

For detailed setup including Windows instructions, see: `docs/development/LANGSMITH_ENVIRONMENT_SETUP.md`
