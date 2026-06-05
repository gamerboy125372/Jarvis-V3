# J.A.R.V.I.S. — Desktop Build Guide
## Build a working Windows .exe from scratch

---

## What you'll end up with

A **JARVIS-Setup.exe** installer. Double-click it, install like any Windows app, and JARVIS runs exactly as it does on Replit — full voice pipeline, HUD, everything.

---

## Step 1 — Install the required software on your PC

Install these **in order**. All are free.

### 1a. Node.js 22 LTS
- Go to **https://nodejs.org** → click **"22 LTS"** (the left green button)
- Run the installer. On the "Tools for Native Modules" page, **check the box** ("Automatically install the necessary tools")
- When finished it opens a black window — let it run, press any key when it asks

### 1b. Python 3.12
- Go to **https://www.python.org/downloads/**
- Click the top **Download Python 3.12.x** button
- Run the installer. **CRITICAL: check "Add Python to PATH"** at the bottom of the first screen before clicking Install
- Finish the install

### 1c. Git
- Go to **https://git-scm.com/download/win**
- Download and run the installer. Click Next on every screen — defaults are fine

### 1d. VS Code (optional but makes commands easier)
- Go to **https://code.visualstudio.com/**
- Download and install — defaults are fine

---

## Step 2 — Download the JARVIS project from Replit

1. In Replit, click the **three dots (⋮)** menu at the top of the file tree
2. Click **"Download as ZIP"**
3. Save it somewhere like `C:\Users\YourName\Desktop\`
4. **Right-click the ZIP → Extract All → Extract** to a folder called `JARVIS`
   - You should now have `C:\Users\YourName\Desktop\JARVIS\` with folders like `api-server`, `jarvis-ui`, `electron` inside

---

## Step 3 — Open a terminal inside the JARVIS folder

**Option A (easiest) — VS Code:**
1. Open VS Code
2. File → Open Folder → select your `JARVIS` folder
3. Terminal → New Terminal (a panel opens at the bottom)

**Option B — Windows Terminal / PowerShell:**
1. Open the `JARVIS` folder in File Explorer
2. Hold **Shift** + right-click on an empty space
3. Click **"Open PowerShell window here"** (or "Open in Terminal")

All commands below go in this terminal.

---

## Step 4 — Get your API keys

You need **one required key** and one optional one.

### Required — Groq API key (FREE, takes 2 minutes)
1. Go to **https://console.groq.com/keys**
2. Sign up / log in (free)
3. Click **"Create API Key"**, name it anything (e.g. `jarvis`), copy the key
4. Keep it handy — you'll paste it in Step 5

### Optional — ElevenLabs key (for the premium British "Daniel" voice)
1. Go to **https://elevenlabs.io** → sign up (free tier gives you characters/month)
2. Click your profile icon → **Profile + API Key**
3. Copy the API key
- **If you skip this:** JARVIS will use Microsoft Edge's built-in British neural voice (Ryan Neural) as a fallback — still sounds great, fully offline

---

## Step 5 — Create your secrets file

In the terminal, run:

```
cd api-server
```

Then create the file. **Choose the method that works for you:**

**VS Code:** Right-click the `api-server` folder in the file tree → New File → name it `.env` → paste this:
```
GROQ_API_KEY=paste_your_groq_key_here
ELEVENLABS_API_KEY=paste_your_elevenlabs_key_here
ELEVENLABS_VOICE_ID=onwK4e9ZLuTAKqWW03F9
PORT=5001
```
If you don't have ElevenLabs, leave that line as:
```
ELEVENLABS_API_KEY=
```

**Terminal method:**
```powershell
# Back in PowerShell, inside the JARVIS folder:
cd api-server
New-Item .env -ItemType File
notepad .env
```
Paste the contents above, save, close Notepad.

Then go back to the root:
```
cd ..
```

---

## Step 6 — Install pnpm (the package manager this project uses)

```
npm install -g pnpm
```

Wait for it to finish. Then verify:
```
pnpm --version
```
You should see something like `10.x.x` — if so, continue.

---

## Step 7 — Install all project dependencies

```
pnpm install
```

This downloads all the Node.js packages. It will take **2–5 minutes** on first run. You'll see a lot of text scroll by — that's normal.

---

## Step 8 — Install the Python voice package (edge-tts)

This powers the British neural voice fallback:
```
pip install edge-tts
```

Verify it works:
```
edge-tts --voice en-GB-RyanNeural --text "Hello sir" --write-media test.mp3
```
If no errors, delete `test.mp3` and continue.

---

## Step 9 — Build the app

Run these three commands **in order**. Each one must finish with no errors before running the next.

**Build the frontend (React HUD):**
```
pnpm --filter @workspace/jarvis-ui run build
```
Takes ~30 seconds. You should see `✓ built in` at the end.

**Build the backend (API server):**
```
pnpm --filter @workspace/api-server run build
```
Takes ~10 seconds. You should see `⚡ Done`.

**Quick test — run in desktop mode without Electron:**
```
cd api-server
set DESKTOP_APP=1 && set PORT=5001 && node dist/index.mjs
```
Open your browser and go to `http://localhost:5001` — you should see the full JARVIS HUD.
Press **Ctrl+C** to stop, then `cd ..` to go back.

---

## Step 10 — Set up Electron (the desktop wrapper)

Install Electron and the packager:
```
npm install --save-dev electron@latest electron-builder@latest
```

**Test it as a desktop app first** (before making the .exe):
```
npx electron .
```

A dark window should open, show "INITIALIZING SYSTEMS...", then load the JARVIS HUD.
- Test the mic, test asking JARVIS questions
- If it all works: close the window and go to Step 11

**Troubleshooting the test:**
- Window stays black or crashes → check that `api-server/.env` has your real Groq key
- "Could not locate api-server/dist/index.mjs" → re-run the build commands in Step 9
- Microphone not working → Windows may block mic for Electron apps; see the note at the bottom

---

## Step 11 — Package as a .exe installer

```
npx electron-builder --win --x64
```

This takes **3–10 minutes** — it's downloading Electron's runtime and packing everything together.

When it finishes, look in the `dist-desktop/` folder. You'll find:
```
dist-desktop/
  JARVIS-Setup-1.0.0.exe    ← This is your installer
```

**That's it.** Double-click `JARVIS-Setup-1.0.0.exe`, install it, and JARVIS will appear in your Start menu and on your desktop.

---

## Step 12 — Share or move to another PC

Copy `JARVIS-Setup-1.0.0.exe` to any Windows 10/11 x64 PC and install it.

**Important:** The `.env` file with your API keys is bundled INTO the installer automatically during the build. If you need to change your API keys later, edit `api-server/.env` and run Step 11 again.

If you don't want keys bundled (for sharing with others), they can paste their own keys into:
```
C:\Users\YourName\AppData\Roaming\J.A.R.V.I.S\resources\app\api-server\.env
```

---

## Rebuilding after making changes

Whenever you change the code on Replit and re-download:

1. Download the new ZIP, extract it, overwrite your old folder
2. Copy your `api-server/.env` back in (it gets overwritten)
3. Run Steps 7, 9, and 11 again

Or just run this one block:
```
pnpm install && pnpm --filter @workspace/jarvis-ui run build && pnpm --filter @workspace/api-server run build && npx electron-builder --win --x64
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `pnpm: command not found` | Close and reopen terminal after `npm install -g pnpm` |
| `python: command not found` | Reinstall Python with "Add to PATH" checked |
| `edge-tts: command not found` | Run `pip install edge-tts` again; try `python -m edge_tts` |
| JARVIS opens but gives no response | Check `api-server/.env` — Groq key must be correct |
| Microphone blocked | Right-click JARVIS in taskbar → Properties → check mic permissions; or open Windows Settings → Privacy → Microphone → enable for Desktop Apps |
| "Could not locate index.mjs" | Run `pnpm --filter @workspace/api-server run build` |
| `.exe` build fails with icon error | Normal if no icon file — delete the `"icon"` line from `electron-builder.json` |
| Antivirus flags the installer | This is normal for self-signed Electron apps. Add an exclusion in your antivirus for the `dist-desktop` folder |

---

## Quick reference — all commands

```powershell
# One-time setup (only do this once)
npm install -g pnpm
pip install edge-tts
pnpm install

# Every time you want to rebuild
pnpm --filter @workspace/jarvis-ui run build
pnpm --filter @workspace/api-server run build

# Test as desktop app (no install)
npx electron .

# Build the .exe installer
npx electron-builder --win --x64
```

---

## File structure after setup

```
JARVIS/
├── api-server/
│   ├── .env               ← YOUR API KEYS (never share this)
│   ├── dist/              ← built backend
│   └── src/
├── jarvis-ui/
│   ├── dist/              ← built frontend
│   └── src/
├── electron/
│   └── main.js            ← Electron entry point
├── electron-builder.json  ← packaging config
├── dist-desktop/
│   └── JARVIS-Setup-1.0.0.exe  ← your final .exe
└── DESKTOP_BUILD.md       ← this file
```

---

*Built with Electron 33+, Node.js 22, React + Vite, Express 5, Groq LLaMA 3.3 70B, ElevenLabs TTS*
