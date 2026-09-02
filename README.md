# SafetyLog

A mobile-first Progressive Web App (PWA) for Nigerian SMEs to digitize HSE
(Health, Safety & Environment) compliance management — built for factory
floors with unreliable internet, on the Android phones (Tecno, Infinix,
itel) most workers actually carry.

## Tech Stack

- **Frontend:** Plain HTML, CSS, and JavaScript (no framework, no build
  step) — kept intentionally simple so it's easy to read, deploy, and
  debug without a JavaScript toolchain.
- **Backend:** [Firebase](https://firebase.google.com) — Firestore
  (database) + Firebase Storage (uploaded files) + Firebase Hosting
  (deployment).
- **Offline support:** PWA install (Add to Home Screen) + a service
  worker for the app shell + Firestore's built-in offline persistence
  for data. See the "Offline behavior" note below — file uploads are
  the one thing that still needs live internet.

## Current Features (Phase 1, in progress)

### ✅ Document Register
- Upload a document (SOP, policy, form, etc.) with a title and category.
- Documents list, sorted by most recently updated.
- **Version control:** uploading a new file under the same title +
  category creates a new version and keeps the old one in a Version
  History panel — nothing is silently overwritten or lost.
- **Read & Acknowledge tracking:** staff (picked from a dropdown — no
  login yet) can mark a document as read, tied to the specific version
  they acknowledged. If a document is updated, old acknowledgments stay
  correctly tied to the old version, so you can see who still needs to
  re-acknowledge the new one.

### 🔜 Toolbox Talk Log (next, still Phase 1)
Not built yet.

## Roadmap

- **Phase 2:** Incident / near-miss reporting (photo + description +
  timestamp/location, generates a PDF report).
- **Phase 3:** Permit-to-work digital forms (hot work, confined space,
  lifting) with signature capture, plus a CAPA tracker (issue → assigned
  to → due date → closed, with overdue alerts).
- **Phase 4:** Dashboard (open incidents, overdue CAPAs, permits
  expiring this week).

## Setup / Run Instructions

You do **not** need Node.js, npm, or any build tools to run this app —
it's plain static files. You do need a Firebase project.

### 1. Create your Firebase project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
   and create a new project.
2. Click the **`</>`** (web) icon to register a web app inside it. Copy
   the config object it shows you.
3. Paste that config into `public/js/firebase-config.js`, replacing the
   `REPLACE_WITH_YOUR_...` placeholders.
4. In the Firebase Console:
   - **Build → Firestore Database → Create database** (any region close
     to Nigeria, e.g. `europe-west1`, is fine — start in production
     mode, since we supply our own rules file).
   - **Build → Storage → Get started.**
5. Upload the security rules:
   - Firestore Database → **Rules** tab → paste in the contents of
     `firestore.rules` → Publish.
   - Storage → **Rules** tab → paste in the contents of `storage.rules`
     → Publish.
   - **⚠️ Read the security warnings inside both rules files before you
     do this** — Phase 1 has no login, so these rules currently allow
     anyone with the app link to read and write everything. Fine for a
     closed pilot, not fine for a public launch.
6. In `.firebaserc`, replace `REPLACE_WITH_YOUR_PROJECT_ID` with your
   actual Firebase project ID (found in Project Settings).

### 2. Run it locally (to test before deploying)
The simplest option with no installs: open `public/index.html` directly
in a browser. This works for basic testing, but **service workers and
some Firebase features don't behave correctly when opened as a local
`file://` path** — for a proper test, serve it over `http://localhost`
instead:

- If you have Python installed: `cd public && python3 -m http.server 8000`,
  then visit `http://localhost:8000`.
- Or install the [Firebase CLI](https://firebase.google.com/docs/cli)
  (`npm install -g firebase-tools`) and run `firebase serve` from the
  project root.

### 3. Deploy it for real
Using the Firebase CLI:
```
npm install -g firebase-tools
firebase login
firebase deploy
```
This publishes the `public/` folder to a live `https://your-project.web.app`
URL that installs as a PWA on any phone.

### 4. App icons (not yet included)
`public/manifest.json` references `icons/icon-192.png` and
`icons/icon-512.png`, which don't exist yet in this repository — the app
will still work and install without them, but will use a generic
browser icon on the home screen instead of a SafetyLog icon. Add two PNG
files (192×192 and 512×512) to `public/icons/` when you have a logo
ready.

## Known Limitations (Phase 1)

- **No login/authentication.** Staff are selected from a dropdown, not
  verified. Anyone can select anyone's name. Fine for an internal pilot
  with people you trust; not an audit-grade control yet — see the
  security notes in `firestore.rules` and `staff-list.js`.
- **File uploads require live internet.** Firestore data (document
  titles, acknowledgments, etc.) queues up and syncs automatically when
  offline, but the actual file bytes for a new upload do not — the app
  will show a clear error if you try to upload with no signal, rather
  than failing silently.
- **Security rules are wide open.** See the warnings inside
  `firestore.rules` and `storage.rules` for what to do before a wider
  rollout.

## Repository Structure

```
safetylog-app/
├── firebase.json              # Hosting + rules configuration
├── .firebaserc                # Your Firebase project ID goes here
├── firestore.rules            # Database access rules (⚠️ read before deploying)
├── storage.rules              # File storage access rules (⚠️ read before deploying)
├── firestore.indexes.json     # Query index definitions
├── public/                    # Everything deployed to the live site
│   ├── index.html             # Home page
│   ├── manifest.json          # PWA install config
│   ├── service-worker.js      # Offline caching
│   ├── css/                   # Stylesheets
│   ├── js/
│   │   ├── firebase-config.js # Firebase connection (put your keys here)
│   │   ├── shared/            # Helpers used by multiple features
│   │   └── modules/           # One file per feature (documents.js, etc.)
│   └── pages/                 # One HTML page per feature
└── docs/
    └── decisions.md           # Log of technical decisions made along the way
```
