# Start2Code

A coding classroom for children: **Scratch** for the younger ones, **Python + pygame**
for the more advanced. Work is saved to each child's account, can be downloaded, and
teachers get a dashboard showing how the class is doing.

---

## Getting it running

### 1. Install and start

```bash
npm install
npm run dev
```

### 2. Connect Supabase

Create `.env.local` in this folder:

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon key>
```

### 3. Create the database

Open the Supabase dashboard → **SQL Editor** → paste the whole of
[`supabase/schema.sql`](supabase/schema.sql) → **Run**.

It is safe to run more than once. It creates the tables, the row level security
policies, the `projects` storage bucket, and a trigger that gives every new user a
profile automatically.

### 4. Make yourself an admin

Sign up through the app, then run this once in the SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Admins can promote other people from the **Admin** tab, so this is only needed once.

> During development you may want to turn off **Confirm email** in
> Authentication → Providers → Email, so accounts work immediately.

---

## How it fits together

```
src/
  pages/         Login, Dashboard, the two workspaces, teacher and admin views
  components/    Lesson panel, console, shared UI (toasts, modal, tables)
  curriculum/    The lessons themselves — plain data, easy to edit
  lib/           Supabase client, auth context, all database calls, downloads
public/
  scratch.html + scratch-host.js    the Scratch editor and its bridge
  runner.html   + py-runtime.py     the Python runner and its harness
supabase/schema.sql                 tables, policies, triggers
```

### Scratch

`public/scratch-gui.js` is a prebuilt UMD bundle of the Scratch editor. It cannot be
imported into Vite as a module (it expects webpack and provides its own CSS and
assets), so it is hosted in its own page and embedded as an iframe.

The bridge in `scratch-host.js` grabs the VM through the editor's `onVmInit` prop and
speaks `postMessage` with the React app:

| Message | Direction | Meaning |
| --- | --- | --- |
| `ready` | host → app | the VM exists, projects can be loaded |
| `dirty` | host → app | the child changed something |
| `load-sb3` | app → host | open this project |
| `export-sb3` / `sb3` | app ↔ host | give me the current project as a `.sb3` |

Saved projects are real `.sb3` files in Supabase Storage, so a download opens in
scratch.mit.edu and a file from home opens here.

**If you ever rebuild the bundle**, keep it as a UMD build with `react` and
`react-dom` as externals — `scratch.html` aliases `window.react` / `window['react-dom']`
before loading it, because that is the name the bundle looks for.

### Python

`runner.html` runs the child's code with PyScript in a sandboxed iframe and reports
back to the app, which draws the console.

The code is **not** injected as a script tag. PyScript reports an uncaught Python
exception by throwing to `console.error`, where neither `stderr` nor `window.onerror`
can catch it — errors would silently vanish. Instead `py-runtime.py` compiles and
runs the source itself, so it can:

- send `print` output and `input()` to the console in the parent window,
- report **the child's own line numbers** (the source is compiled as `your_code.py`),
- replace tracebacks with an explanation a child can act on:

```
── Something went wrong ──
Line 4: NameError
    print(total)

Python has never seen 'total' before. Check the spelling, and make sure you
created it before using it.
```

Lessons 1–6 run in console mode, which starts in about a second. From lesson 7 the
same runner loads pygame and draws to the stage. The mode is chosen automatically
from whether the code imports pygame.

There is no way to interrupt Pyodide mid-program, so **Run** and **Stop** work by
remounting the iframe — a guaranteed clean slate every time.

> The browser build of pygame has no system fonts. Use `pygame.font.Font(None, 48)`,
> not `SysFont("Arial", 48)` — the whole curriculum already does.

---

## Roles

| Role | Can do |
| --- | --- |
| **student** | own projects and progress, join a class with a code |
| **teacher** | everything above, plus create classes and see their own students' work |
| **admin** | everything, plus change anyone's role |

Access is enforced in the database, not in the UI. A student cannot read another
child's project even by calling the API directly, and the role column is protected by
its own trigger so nobody can promote themselves.

---

## Saving and downloading

Nothing is ever only in the browser:

- **Python** autosaves a few seconds after typing stops, and on ⌘/Ctrl+S.
- **Scratch** saves on demand, every two minutes while there are changes, and warns
  before closing the tab.
- **Download** gives a real `.py` or `.sb3` file.
- **Export progress** on the dashboard downloads a child's whole record as JSON.
- Teachers can export a class as **CSV** for a report.

---

## Editing the lessons

Lessons are plain objects in `src/curriculum/`. To add a Python lesson, append to
`pythonLessons`:

```js
{
  id: 'py-11-sound',        // must be unique and stable — progress is keyed on it
  title: 'Adding sound',
  blurb: 'Make your game noisy.',
  minutes: 20,
  mode: 'game',             // 'game' or 'console'
  concepts: ['mixer'],
  steps: ['Run it and listen.', 'Change the note.'],
  starter: `import pygame\n...`
}
```

It appears on the dashboard, in the lesson picker and in the teacher's progress
matrix straight away. Never reuse an id for different content — existing progress
rows point at it.

---

## Deploying to Hostinger

Hostinger's shared hosting copies a branch straight into `public_html` and never
runs a build. So `main` holds the source, and
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds it and pushes
the finished site to a **`deploy`** branch — which is the branch Hostinger watches.
You keep pushing to `main` as normal.

One-time setup:

1. **GitHub → Settings → Secrets and variables → Actions**, add two secrets:
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Vite bakes them into the built
   JavaScript, so the build cannot reach Supabase without them.
2. **hPanel → Website → Git**: change the deployed branch from `main` to `deploy`.
   (The `deploy` branch only exists after the workflow has run once.)
3. **Supabase → Authentication → URL Configuration**: set the Site URL to your live
   domain and add it to the redirect list, or confirmation emails will send students
   to `localhost`.

Check after the first deploy that `.htaccess` is present in `public_html`. Without it
every URL except the home page returns 404 on refresh.

To publish without git — build locally and upload the **contents** of `dist/`
(including the hidden `.htaccess`) into `public_html`:

```bash
npm run deploy
```

---

## Known limits

- PyScript is loaded from `pyscript.net/latest`. Pin a version before a school term
  starts if you want to be certain nothing shifts underneath you.
- The Scratch editor still needs the internet for its sprite and backdrop libraries
  (`assets.scratch.mit.edu`).
- `scratch-gui` is **not** a dependency any more. Nothing imports it, and installing
  it costs 98 MB on every CI run. The prebuilt bundle in `public/scratch-gui.js` is
  what actually ships. If you ever need to regenerate it, install the package
  temporarily (`npm i -D scratch-gui`), build a UMD bundle with `react` and
  `react-dom` as externals, drop the result in `public/`, then uninstall it again.
