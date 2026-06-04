# Smart Campus AI — Windows Setup Guide

A step-by-step guide to install, run, and troubleshoot this project on **Windows**.

> All commands below are written for **PowerShell** (recommended). Open it by pressing `Win + X` → Windows Terminal or Windows PowerShell.

---

## Table of Contents

1. [Install Prerequisites](#1-install-prerequisites)
2. [Get the Code](#2-get-the-code)
3. [Check Workspace Config](#3-check-workspace-config)
4. [Install Dependencies](#4-install-dependencies)
5. [Set Up Environment Variables](#5-set-up-environment-variables)
6. [Build the Shared Library](#6-build-the-shared-library)
7. [Run the Backend (Flask API)](#7-run-the-backend-flask-api)
8. [Run the Frontend (React + Vite)](#8-run-the-frontend-react--vite)
9. [Log In](#9-log-in)
10. [Common Errors and Fixes](#10-common-errors-and-fixes)

---

## 1. Install Prerequisites

Install each tool below. After each install, **close and reopen PowerShell** so the new commands are recognized.

### Node.js 20+

1. Go to https://nodejs.org
2. Download the **LTS** installer (`.msi` file)
3. Run the installer — keep all defaults, make sure "Add to PATH" is checked
4. Verify: `node -v` should print `v20.x.x` or higher

### pnpm

```powershell
npm install -g pnpm
```

Verify: `pnpm -v` should print `10.x.x` or higher

### Python 3.12+

1. Go to https://www.python.org/downloads/windows/
2. Download **Python 3.12.x** (Windows installer 64-bit)
3. Run the installer — **check "Add python.exe to PATH"** before clicking Install
4. Verify:

```powershell
python --version
```

Should print `Python 3.12.x`

### Git

1. Go to https://git-scm.com/download/win
2. Download and run the installer — keep all defaults
3. Verify: `git --version`

---

## 2. Get the Code

### Option A — Download ZIP

1. Download the project ZIP from your source repository
2. Extract the zip somewhere easy to find, for example `C:\Projects\smart-campus`
3. Open PowerShell and navigate to that folder:

```powershell
cd C:\Projects\smart-campus
```

### Option B — Clone from GitHub

```powershell
git clone <your-repo-url>
cd smart-campus
```

---

## 3. Check Workspace Config

The workspace config is ready for Windows. You can quickly inspect it if you want:

```powershell
Get-Content pnpm-workspace.yaml
```

---

## 4. Install Dependencies

From the project root folder (where `pnpm-workspace.yaml` is):

```powershell
pnpm install
```

This installs all JavaScript/TypeScript packages. It may take a minute or two the first time.

Then install the Python packages for the backend:

```powershell
cd artifacts\api-server
pip install -r requirements.txt
cd ..\..
```

> If `pip` is not recognized, try `python -m pip install -r requirements.txt`

---

## 5. Set Up Environment Variables

### Create the backend `.env` file

Navigate to the backend folder and create the file:

```powershell
cd artifacts\api-server
```

Create a new file called `.env` (you can use Notepad):

```powershell
notepad .env
```

Paste this content into Notepad and save:

```
JWT_SECRET=change-me-to-any-long-random-string-at-least-32-chars
GROQ_API_KEY=your_groq_api_key_here
```

- **JWT_SECRET** — any long random string (32+ characters). Signs login tokens.
- **GROQ_API_KEY** — get a free key at https://console.groq.com (needed for AI question generation).

Go back to the project root:

```powershell
cd ..\..
```

> The frontend does not need a `.env` file — its variables are passed in the run command (see Step 8).

---

## 6. Build the Shared Library

The frontend imports types from a shared TypeScript library. Build it once before starting the frontend:

```powershell
cd lib\api-client-react
npx tsc -p tsconfig.json
cd ..\..
```

You only need to do this once (or again if you change files inside `lib\`).

---

## 7. Run the Backend (Flask API)

Open a **PowerShell window** and run:

```powershell
cd artifacts\api-server
python -m flask --app app run --port 8080
```

You should see:

```
 * Running on http://127.0.0.1:8080
```

**Keep this window open.** The backend must stay running while you use the app.

> The first time you run it, it automatically creates the SQLite database at `artifacts\api-server\data\exam-manager.sqlite` and seeds a default admin account.

---

## 8. Run the Frontend (React + Vite)

Open a **second PowerShell window** (keep the backend window open) and run:

```powershell
cd artifacts\exam-system
$env:PORT="5000"; $env:BASE_PATH="/"; $env:API_PROXY_TARGET="http://127.0.0.1:8080"; pnpm run dev
```

You should see:

```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5000/
```

Open **http://localhost:5000** in your browser (Chrome or Edge recommended).

### Prefer Command Prompt (cmd)?

```cmd
cd artifacts\exam-system
set PORT=5000 && set BASE_PATH=/ && set API_PROXY_TARGET=http://127.0.0.1:8080 && pnpm run dev
```

---

## 9. Log In

Once both servers are running, open http://localhost:5000 and sign in with the default admin account:

| Field | Value |
|-------|-------|
| **Email** | `admin@example.com` |
| **Password** | `admin123` |

### User Roles

| Role | Permissions |
|------|-------------|
| **admin** | Full access — manage users, exams, questions, results |
| **teacher** | Create and monitor exams, view results |
| **student** | Take exams, view own results |

You can register new accounts from the Sign Up page and assign any role.

---

## 10. Common Errors and Fixes

### `pnpm install` fails with "platform not supported" or binary errors

**Cause:** The `overrides:` block in `pnpm-workspace.yaml` is still present and blocking Windows binaries.

**Fix:** Delete the `overrides:` block as described in Step 3, then run `pnpm install` again.

---

### `'python' is not recognized as an internal or external command`

**Cause:** Python was not added to PATH during installation.

**Fix:**
1. Uninstall Python from Settings → Apps
2. Re-download from https://python.org/downloads/windows/
3. Run the installer again — **this time check "Add python.exe to PATH"**

---

### `pip is not recognized`

**Fix:**

```powershell
python -m pip install -r artifacts\api-server\requirements.txt
```

---

### `ModuleNotFoundError: No module named 'flask'`

**Cause:** Python packages are not installed.

**Fix:**

```powershell
cd artifacts\api-server
python -m pip install -r requirements.txt
```

---

### `Error: PORT environment variable is required`

**Cause:** You started the frontend without setting the environment variables.

**Fix:** Use the full PowerShell command from Step 8:

```powershell
$env:PORT="5000"; $env:BASE_PATH="/"; $env:API_PROXY_TARGET="http://127.0.0.1:8080"; pnpm run dev
```

> Note: Setting `$env:` variables with a semicolon only lasts for that PowerShell session. If you close and reopen the window, you need to set them again.

---

### `Cannot find module '@workspace/api-client-react'`

**Cause:** The shared library has not been built yet.

**Fix:**

```powershell
cd lib\api-client-react
npx tsc -p tsconfig.json
cd ..\..
```

---

### `EADDRINUSE: address already in use :::5000` or `:::8080`

**Cause:** Another program (or a previous run) is already using that port.

**Fix — find and kill the process using the port:**

```powershell
# Find the process using port 5000
netstat -ano | findstr :5000

# The last column is the PID. Kill it (replace 1234 with the actual PID):
taskkill /PID 1234 /F
```

Or just use different port numbers:

```powershell
# Backend on 8081
python -m flask --app app run --port 8081

# Frontend on 3000, pointing to new backend port
$env:PORT="3000"; $env:BASE_PATH="/"; $env:API_PROXY_TARGET="http://127.0.0.1:8081"; pnpm run dev
```

---

### `401 Unauthorized` on every API call after restart

**Cause:** The JWT token in your browser is stale (happens if `JWT_SECRET` changed).

**Fix:**
1. Open Chrome/Edge DevTools (`F12`)
2. Go to **Application** tab → **Local Storage** → `http://localhost:5000`
3. Delete the entry named `exam_auth_token`
4. Refresh the page and log in again

---

### AI question generation fails or shows an error

**Cause:** `GROQ_API_KEY` is missing or wrong.

**Fix:**
1. Get a free key from https://console.groq.com
2. Open `artifacts\api-server\.env` in Notepad
3. Replace `your_groq_api_key_here` with your actual key
4. Restart the backend (Ctrl+C, then run the flask command again)

---

### CORS errors in the browser console

**Cause:** `API_PROXY_TARGET` was not set when starting the frontend, so API requests go directly to the wrong address.

**Fix:** Always start the frontend with all three variables set (see Step 8).

---

### PowerShell says "running scripts is disabled on this system"

**Cause:** PowerShell execution policy is blocking scripts.

**Fix:** Run this once in PowerShell as Administrator:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then close and reopen PowerShell and try again.

---

### `pnpm: command not found` after installing

**Cause:** npm global bin directory is not in your PATH.

**Fix:**

```powershell
# Find where npm puts global packages
npm config get prefix

# Add that path + \node_modules\.bin to your user PATH in System Settings
# Or just run it through node directly:
node_modules\.bin\pnpm install
```

Easiest fix: restart PowerShell after installing pnpm.

---

## Quick-Start Cheat Sheet

Copy these commands into a Notepad file and keep them handy.

### First-time setup (run once)

```powershell
# 1. Install packages
pnpm install

# 2. Install Python packages
python -m pip install -r artifacts\api-server\requirements.txt

# 3. Build shared library
cd lib\api-client-react
npx tsc -p tsconfig.json
cd ..\..

# 4. Create artifacts\api-server\.env with your JWT_SECRET and GROQ_API_KEY
```

### Every time you want to run the app

**Terminal 1 — Backend:**

```powershell
cd artifacts\api-server
python -m flask --app app run --port 8080
```

**Terminal 2 — Frontend:**

```powershell
cd artifacts\exam-system
$env:PORT="5000"; $env:BASE_PATH="/"; $env:API_PROXY_TARGET="http://127.0.0.1:8080"; pnpm run dev
```

Open **http://localhost:5000** → log in with `admin@example.com` / `admin123`

---

## Project Structure

```
project-root\
├── artifacts\
│   ├── exam-system\        ← React + Vite frontend  (port 5000)
│   │   └── src\
│   │       ├── pages\      ← Page components (Dashboard, Exams, etc.)
│   │       ├── hooks\      ← Auth, toast, and other hooks
│   │       └── components\ ← Reusable UI components
│   └── api-server\
│       ├── app.py          ← Flask backend  (port 8080)
│       ├── requirements.txt
│       ├── .env            ← Your secrets (create this in Step 5)
│       └── data\           ← SQLite database (auto-created on first run)
├── lib\
│   └── api-client-react\   ← Shared TypeScript types and API hooks
├── pnpm-workspace.yaml     ← Monorepo config (edit in Step 3)
└── LOCAL_SETUP.md          ← This file
```
