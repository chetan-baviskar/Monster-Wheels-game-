<<<<<<< HEAD
# Monster Wheels — The Ultimate Monster Truck Adventure

**Drive Wild. Crush Obstacles. Conquer Every Track.**

Monster Wheels is a 3D monster-truck driving game that wraps the existing
WebAssembly engine (loaded from `deckard.openprocessing.org`) in a polished,
responsive, mobile-friendly UI — plus a local Admin Control Panel. This phase
is **frontend-only**: no backend, no cloud database, no accounts, no tracking.
Everything you do is stored in your browser's `localStorage`.

---

## Quick start

No build step exists — this is a static site.

```bash
# Option A: any static server
npm start               # runs tools/serve.js → http://localhost:8080
# Option B: open directly
#   Double-click index.html (works from file:// too; http:// is recommended)

Game:  http://localhost:8080/index.html
Admin: http://localhost:8080/admin.html
```

Optional checks:

```bash
npm run check           # syntax-checks every JS file (node --check)
```

Requires Node 16+ only for the dev server / checker. The game itself is plain
HTML/CSS/JS + WASM and runs on any modern static host (GitHub Pages, Netlify,
a folder on disk, …).

---

## What's in the box

| Area | Details |
| --- | --- |
| **Engine** | Unchanged Emscripten/WebAssembly build, loaded remotely. All physics, models, levels, audio and camera logic remain the engine's. |
| **Branding** | "Monster Wheels" title, loading card, menus, favicon (`favicon.svg`), pause/settings overlays. |
| **Responsive UI** | 320px → 1920px+, safe-area insets, no horizontal scroll, landscape nudge on small phones. |
| **Touch controls** | Multi-touch on-screen Gas/Brake/Left/Right buttons (≥64px), pressed-state feedback, guaranteed key release. They inject synthetic `KeyboardEvent`s into the engine's own input path — no parallel physics. |
| **Performance** | Graphics quality Low/Medium/High caps the canvas device-pixel-ratio (`MW.dprCap`), resize handling, tab-visibility awareness. |
| **Menus** | Main menu, pause, Settings, How to Play, Profile, Achievements, Leaderboard, Levels, Garage — all local. |
| **Progress** | Real engine events (`poki_level_start`, `poki_gameplay_start/stop`) drive races started/completed, distinct levels, play time, and 7 achievements. Nothing unlocks without a real event. |
| **Leaderboard** | Local/demo only, ranked by a transparent formula (`completed×100 + levels×25 + minutes×5 + achievements×10`). Demo rows are labeled "Demo" and are not real people. |
| **Admin panel** | `admin.html` — dashboard, players, level/vehicle metadata, settings, announcements, achievements display, analytics, activity log, JSON export/import. Clearly labeled as an insecure local demo. |

---

## Project layout

```
index.html              Game page: engine markup + our UI script includes
admin.html              Admin Control Panel (separate route, local demo)
favicon.svg             Monster Wheels wheel logo
baloo2.woff             Display font
css/
  game.css              Game UI: menu, HUD, touch controls, modals, toasts
  admin.css             Admin panel layout + components
js/
  game/
    early.js            Loads BEFORE the engine: window.MW root, DPR cap,
                        stubs for engine imports that were never defined,
                        and the MW.onLevelStart/onGameplayStart/Stop hooks
    bridge.js           The ONLY module that talks to the engine
                        (guarded ccalls, input injection, fullscreen)
    main.js             Bootstrap + boot → menu → playing state machine
  utils/
    storage.js          Namespaced localStorage (the only localStorage user)
    validation.js       Shared validators + HTML escaping
    audio.js            Lightweight UI click/success sounds (WebAudio)
  services/
    settingsService.js  Local settings incl. graphics→DPR mapping
    playerService.js    Local profile (display name, created date)
    progressService.js  Real-event progress + play-time accounting
    achievementService.js  Achievement defs + strict unlocking
    leaderboardService.js  Local/demo ranking with transparent formula
    adminService.js     All admin demo data + activity log (localStorage)
  ui/
    menu.js             Main menu overlay + announcement banner
    hud.js              In-game HUD (stats chip, pause/restart/fullscreen)
    touchControls.js    On-screen driving buttons
    panels.js           Player-facing modal panels
    toast.js            Toasts + modal/confirm dialogs (focus-trapped)
    orientation.js      Landscape encouragement on small phones
  admin/
    adminApp.js         Hash-routed admin SPA
tools/
  serve.js              Zero-dependency static dev server
  check.js              Syntax checker for all JS
```

---

## How it integrates with the engine (important)

- **Input**: touch buttons create `KeyboardEvent`s with both `keyCode`
  (what GLFW reads) and `key` (what the browser bridge reads) and dispatch
  them on `window`. The engine cannot tell them apart from real keys.
- **Progress**: the engine's `poki_level_start / poki_gameplay_start /
  poki_gameplay_stop` calls are patched to call `MW.onLevelStart(li)`,
  `MW.onGameplayStart()`, `MW.onGameplayStop()` — a race only "counts as
  completed" when a gameplay session ends.
- **Resolution**: `resizeCanvas()` caps `devicePixelRatio` by
  `MW.dprCap` (High = 2, Medium = 1.5, Low = 1) before telling the engine
  via `update_screen_size`, so lower graphics = fewer pixels = smoother.
- **Stubs**: the original engine references a few JS functions that were
  never defined in the deckard build (`getUrlLevelIndex`,
  `downloadFileInBrowser`, `showShareFileModal`, `showStoreLinkModal`,
  `firebaseSignout`, `setDeepLinkLoadingFraction`, `dailyRewardPossible`).
  `early.js` provides inert local stubs so the engine never crashes on them.

---

## Admin panel (local demo)

Open **`admin.html`** (also linked from the game menu's 🛠️ Admin button).

- **No login, no security**: anyone with the file can open it. It is a
  development/demo tool, deliberately labeled as such.
- **Local only**: all data lives in `localStorage` under the `mw:` prefix.
  It does not sync across devices and does not affect any deployed game.
- **Metadata ≠ content**: level and vehicle tabs edit *display metadata*
  (names, descriptions, availability). They cannot create or modify the
  engine's 3D tracks or vehicles.
- **Achievements tab** edits display text only. Unlocking is driven strictly
  by real local gameplay events; the panel cannot grant achievements.
- **Data tools**: export/import everything as JSON, reset admin demo data,
  or erase all local game data.
- **Activity log**: every admin mutation is logged locally (last 300).

---

## Limitations (please read)

1. **The engine is remote.** The WASM/JS build loads from
   `deckard.openprocessing.org`, so the game needs an internet connection
   and depends on that host being available.
2. **No backend, by design (this phase).** Profiles, progress, settings,
   achievements and the leaderboard are per-browser/per-device
   `localStorage`. Clearing site data or switching browsers loses them.
3. **No online multiplayer or real accounts.** The leaderboard combines
   your real local stats with clearly-labeled demo rows.
4. **One bundled track/vehicle.** The admin panel reflects that honestly
   instead of inventing playable content.
5. **Not a production CMS.** The admin panel has no authentication; do not
   deploy it publicly with anything you care about (it only holds demo
   data, but still).

### Future backend seams (documented, not implemented)

- `js/utils/storage.js` — the single choke point for persistence; swapping
  `get/set` for Firestore reads/writes upgrades every service at once.
- Services (`playerService`, `progressService`, `leaderboardService`,
  `adminService`) keep backend-ready object shapes and document their swap
  points in file headers.
- `adminService` mutators map 1:1 to Firestore writes; `adminApp` would not
  need structural changes.
- Auth, if ever added, belongs in a separate service — the game never gates
  play behind a login.

---

## Browser support

Evergreen Chrome/Edge/Firefox/Safari (desktop + mobile). Uses Pointer Events,
`localStorage`, and standard CSS; no polyfills bundled.
=======
# Monster-Wheels-game-
>>>>>>> a7a9f0468156b2e8a2a15f8611a833afeacd0e38

