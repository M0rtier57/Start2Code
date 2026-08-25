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

The bundle also loads a **web worker at runtime**:
`public/chunks/fetch-worker.<hash>.js`, which scratch-storage uses to download
sprite and backdrop assets. It is easy to miss when copying build output, and the
failure is silent and confusing — the asset libraries open and look perfectly
normal, but choosing a sprite or backdrop does nothing at all, because the load
promise never settles. The only clue is an occasional
`Uncaught SyntaxError: Unexpected token '<'` (the missing worker being answered
with index.html).

If you rebuild the bundle, copy that file too, and check the hash still matches
the one referenced inside `scratch-gui.js`:

```bash
grep -o 'chunks/fetch-worker[^"]*' public/scratch-gui.js
```

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

## Handing work in, and marking it

A child's projects are their own until they decide otherwise. **Nothing reaches
the teacher automatically** — the child presses **📤 Indienen** (hand in), either
from the dashboard card or from inside the editor.

The state is derived from two timestamps rather than a status column, so it can
never contradict itself (see [`src/lib/submission.js`](src/lib/submission.js)):

| State | Meaning |
| --- | --- |
| `draft` | never handed in — private to the child |
| `waiting` | handed in, and not marked since |
| `passed` | marked good — gold edge |
| `failed` | needs correcting — red edge, with feedback |

Handing corrected work in again simply moves `submitted_at` past the review's
timestamp, which puts it straight back at the top of the queue. Nothing has to
be reset, and the old verdict stays visible until it is replaced.

### The teacher marks it in the editor

**Classes → Na te kijken** lists only handed-in work, oldest first, with a count
on the tab. **Openen en beoordelen** opens the child's real project in the real
editor — a teacher has to be able to run the game and read the blocks before
judging it — with the marking panel in place of the lesson steps.

The marking panel shows:

- **the lesson steps**, with a green edge on the ones the child ticked and a
  count (`2/4`) — so a teacher can see what was attempted, not just the result;
- **a note box under every step**, for feedback about that specific instruction;
- **a general comment**, a pass/fail verdict and an optional score.

The child sees each note under the step it belongs to, in their own lesson panel,
where they are already looking — not collected at the bottom of a card.

Two things this needed:

- Ticked steps used to live only in `localStorage`, so a teacher could see
  "3 of 5 done" but never *which* three, and the ticks vanished if the child
  moved to another computer. They are now saved to `lesson_progress.steps_done`,
  with `localStorage` kept as an instant cache so the panel never renders empty.
- Notes are stored in `reviews.step_feedback`, keyed by step number. Reordering
  the steps of a lesson after it has been marked would therefore shift existing
  notes — worth knowing before rewriting a lesson mid-term.

While marking, the editor is read-only: autosave, the save button and the
"unsaved changes" warning are all switched off, and the title cannot be edited.
That is belt and braces — `projects_update` is owner-only, so the database would
refuse the write anyway.

## Marking work

A teacher opens a project from **Classes → Projects**, looks at it, and marks it:

- **🏆 Pass** — the project gets a **gold edge** on the child's dashboard.
- **✎ Needs work** — a **red edge**, plus feedback saying what to correct.

An optional score (0–100) can accompany either. Feedback is **required on a fail**:
"needs work" with no explanation gives a child nothing to act on.

There is one review per project, so re-marking corrected work replaces the old
verdict instead of stacking up — the child always sees the current answer. The
projects list can be filtered to **To review**, with a count, so a teacher can work
through a class without hunting.

Children can read the review of their own work but never write one; that is enforced
by the policies in `supabase/reviews.sql`, not by hiding buttons.

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

## Languages

Dutch is the main language; English is available from the picker in the header
(and on the login page, so a child who cannot read the interface can still change
it). The choice is remembered per device in `localStorage`.

- **Interface text** lives in [`src/i18n/nl.js`](src/i18n/nl.js) and
  [`en.js`](src/i18n/en.js). Add a key to both, then use `t('some.key')`.
  A missing key falls back to Dutch, then to the key itself — never to blank space.
- **Lesson text** is written per language in the curriculum files:
  `title: { nl: '…', en: '…' }`. Components resolve it with `pick(lesson.title)`.
- **Starter code** is shared between languages, with Dutch comments and Dutch
  variable names. Duplicating every program would double the curriculum files for
  little gain, and the code runs identically either way.

Two things follow the browser's own language rather than this setting: the Scratch
editor (it ships its own translations) and Monaco's context menus.

## Custom lessons

Lessons come from two places and are merged at runtime by
[`CurriculumContext`](src/lib/CurriculumContext.jsx):

1. **Built-in** — the objects in `src/curriculum/`, which ship in the code.
2. **Custom** — rows in the `lessons` table, written from inside the app.

Every lesson has one of three visibilities, chosen when writing it:

| Visibility | Seen by | Who can set it |
| --- | --- | --- |
| 🔒 **Only me** | nobody else — a draft | anyone |
| 👩‍🏫 **Classes** | students in the classes you pick — **as many as you like** | the teacher of those classes, and admins |
| 🌍 **Everyone** | every student and teacher | admins only |

Class membership lives in the `lesson_classes` join table, so one lesson can be
handed to several classes without being duplicated. Editing it updates every class
at once.

### Class lessons are kept separate

Children see two distinct things on their dashboard:

- **📌 From your teacher** — lessons set for their class, at the top, outlined.
- **The tracks below** — the shared curriculum: the built-in lessons plus anything
  an admin published to everyone. Identical for every child on the platform.

They never mix. "Next lesson" also stays inside whichever group the child is
working through, so finishing a class lesson does not wander off into the
general curriculum.

New lessons start **private**, so nothing reaches children until it is deliberately
shared. **Make private** pulls a shared lesson back out of sight without deleting it.

A private lesson still shows in its *author's* own lesson list, so it can be opened
and tried out before sharing.

Teachers use **Classes → Lessons**; admins use **Admin → Lessons**.

### Starting point

Both tracks can give children something to open into rather than a blank page:

- **Python** — starting source code, typed into the editor in the lesson form.
- **Scratch** — a starting `.sb3`. Build it in the Scratch editor, press
  **⬇ Download .sb3**, then upload it in the lesson form. It is stored in the
  public-read `lesson-assets` bucket, which only teachers and admins can write to.

A saved project always wins over the starter, so a child who comes back to a lesson
gets their own work, never the template again.

### Editing a built-in lesson

An admin can press **Customise** on any built-in lesson. That saves a database row
using the *same* `lesson_key`, and the merge prefers the database version — so the
edit takes effect everywhere without a deploy, and existing student progress still
matches because the lesson keeps its identity. Deleting the custom version restores
the original.

`lesson_key` is what `lesson_progress` rows point at, so never reuse a key for
different content.

## Editing the built-in lessons in code

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

Hostinger builds this project itself — it detects Vite, runs `npm run build` on
Node 22 and serves `dist/`. So deploying is just:

```bash
git push
```

Settings in hPanel → Website → Git:

| Setting | Value |
| --- | --- |
| Branch | `main` (the source — **not** a branch of built output) |
| Root directory | `./` |
| Framework | Vite (detected) |
| Build / output | Default (`npm run build` → `dist`) |

### Why the Supabase keys are committed

Hostinger does not expose environment variables to the **build** step — only at
runtime. A Vite app is compiled before it is ever served, so a runtime-only variable
arrives far too late and the site ships with no database, showing a blank page or the
setup screen. Connecting Supabase through Hostinger's own integration does not change
this.

So the connection details live in [`src/lib/config.js`](src/lib/config.js) and are
committed. That is safe: the anon key is a **public** identifier that already ships
inside the compiled JavaScript of any deployed build, where any visitor can read it.
Row level security is what protects the data — see `supabase/schema.sql`. The
`service_role` key is the secret one and must never go near this repository.

Environment variables still win when present, so nothing stops you pointing a build
at a different project:

```bash
VITE_SUPABASE_URL=… VITE_SUPABASE_ANON_KEY=… npm run build
```

### The one remaining setting

**Supabase → Authentication → URL Configuration**: set Site URL to your live domain
and add it to the redirect list, or confirmation emails send students to `localhost`.

`public/.htaccess` is copied into `dist/` by every build and handles SPA routing, so
refreshing a deep link like `/python/<id>` works instead of 404ing.

To build and upload by hand instead (File Manager / FTP), run `npm run deploy` and
copy the **contents** of `dist/` — including the hidden `.htaccess` — into
`public_html`.

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
