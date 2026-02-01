# Deploying Continuum to Railway

Continuum is a static frontend (Vite + React). Railway will build it and serve the `dist` folder. All configuration (Bridge URL, OpenWebUI URL, API keys) is done **in the app** after deploy—nothing required in Railway env vars for basic run.

---

## 1. Create a new project on Railway

1. Go to [railway.app](https://railway.app) and sign in.
2. **New Project** → **Deploy from GitHub repo**.
3. Connect GitHub and select your **continuum** repo (or the repo that contains the Continuum app).
4. If the app lives in a **subfolder** of the repo, set **Root Directory** to that folder (e.g. `continuum`). If the repo root is the app, leave Root Directory blank.

---

## 2. Build & start (no extra config needed)

Railway will use `package.json` scripts if you don’t override them.

| Setting        | Value              | Notes |
|----------------|--------------------|--------|
| **Build Command**  | `npm run build`   | Default. Produces `dist/`. |
| **Start Command**  | `npm run start`   | Serves `dist/` on `$PORT`. |
| **Watch Paths**    | (optional)        | Leave default unless you use a monorepo. |

If your project doesn’t have a **Start Command** set, Railway may try to run `npm start`. This repo defines:

- `"start": "serve dist -s -l ${PORT:-3000}"`

So **you don’t need to set** Build or Start in the Railway UI unless you want to override them.

- **Build command:** `npm run build`  
- **Start command:** `npm run start`  

Railway sets `PORT` automatically; the app listens on that port.

---

## 3. Environment variables

**Required for deployment:** none. The app runs without any env vars.

**Optional:**

| Variable          | When to use | Notes |
|-------------------|-------------|--------|
| `GEMINI_API_KEY`  | Optional    | Baked at **build** time. Only needed if you want the Gemini fallback available before any user config. Users can also leave it unset and rely on OpenWebUI. |

Everything else (GAM-Memvid Bridge URL, OpenWebUI URL, API keys) is configured **inside the app** in **Settings** after you open the deployed URL. No Railway env vars needed for that.

---

## 4. Data directory / persistence

**Continuum itself does not use a server-side data directory or volume.**

- When **Bridge URL** is set, schedules and settings (OWA config, Gemini key) are stored on the **GAM-Memvid** server (Option B) under `DATA_DIR/continuum/`. Mount a volume at **DATA_DIR** on the **GAM-Memvid** Railway service so they persist.
- Bridge URL and Bridge API key stay in the **browser** (localStorage) so the app knows where to connect.
- Journal (reflections) live in the **bridge server’s** vault when using the bridge.

So: leave any “data directory” or “volume” **empty for Continuum**. Use a volume on **GAM-Memvid** at DATA_DIR for continuum persistence.

---

## 5. After first deploy

1. Open the Railway-generated URL (e.g. `https://your-continuum.up.railway.app`).
2. Go to **Settings**:
   - **GAM-Memvid Bridge** – Bridge URL (e.g. your GAM-Memvid server). Set **Bridge API key** to the same secret you set as `CONTINUUM_BRIDGE_API_KEY` on GAM-Memvid (generate with `openssl rand -hex 32`). Schedules and settings will then persist on the bridge (volume on GAM-Memvid at DATA_DIR).
   - **OpenWebUI** – Instance URL (e.g. your OpenWebUI on Railway) and API key.
3. Save. The chat list should load from OpenWebUI (no localhost CORS). Schedules and settings are stored on the bridge when Bridge URL is set.
4. Create schedules and use the Dashboard as needed.

---

## 6. Quick reference

| Item              | Value |
|-------------------|--------|
| Build command     | `npm run build` |
| Start command     | `npm run start` |
| Required env vars | None |
| Optional env vars | `GEMINI_API_KEY` (build-time, optional) |
| Data dir / volume | Not used |
| Root directory    | Set only if app is in a subfolder of the repo |
