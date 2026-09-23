# BoardEase — Figma prototype

A Figma plugin that rebuilds all 16 BoardEase screens as **editable Figma
frames** with a **clickable prototype** wired between them.

It is generated from the app's real design tokens, so the Figma file and the
running app agree on every colour, size, gap and radius.

---

## Running it

You need the **Figma desktop app** — plugin development is not available in the
browser version. It is free.

1. Open Figma desktop, create or open a file
2. Menu → **Plugins → Development → New plugin…**
3. Choose **"Import plugin from manifest…"**
4. Pick `docs/figma/manifest.json` from this repo
5. Menu → **Plugins → Development → BoardEase UI Builder**

The 16 frames appear on the canvas, already linked. Press **▶** (top right) to
run the prototype and tap through it.

> Figma needs an internet connection the first time, so it can download
> Plus Jakarta Sans and Inter. Both are free Google fonts. If it cannot reach
> them the plugin stops and says so rather than producing a file in the wrong
> typeface.

---

## What you get

**16 frames** at 390 × 844 (iPhone 14), in the app's own order:

| | | |
|---|---|---|
| 01 Landing | 02 Login | 03 Register |
| 04 Home | 05 Search | 06 Filter |
| 07 Details | 08 Map | 09 Route Guide |
| 10 Compare | 11 Reviews | 12 Saved |
| 13 Alerts | 14 Profile | 15 Admin panel |
| 16 Add listing | | |

**Real, editable text layers** — not flattened images. Every label can be
changed in Figma.

**Auto-layout everywhere**, so boxes reflow when you edit them instead of
needing to be dragged back into place.

**A working prototype, wired to match the real app.** These flows were taken
from the actual `navigate()` calls in `src/screens/`, not written from memory:

```
Landing       → Register, Login
Login         → Home, Register
Register      → Home
Home          → Search, Saved, Alerts        + all 5 tabs
Search        → Filter, Details, Map         + all 5 tabs
Filter        → back to Search
Details       → Route Guide, Reviews, Compare
Map           → Details                      + all 5 tabs
Compare       → Details
Saved         → Details                      + all 5 tabs
Alerts        → Details
Profile       → Landing (log out)            + all 5 tabs
Admin         → Add listing
Add listing   → Admin
```

Links are attached to the **specific element** you would really tap — the
button, the listing card, the tab-bar slot — not to the whole frame. A frame
can only carry one click reaction, so wiring at frame level would have given
each screen exactly one destination.

Two flows are modelled that the code does not literally call: `Login → Home`
and `Register → Home`. Those screens never call `navigate('Home')` — Firebase
signs the user in and `AuthContext` swaps the whole navigator. But that is what
the user experiences, so the prototype shows it.

Start the run from **01 Landing ▶ START**.

---

## Checking it without opening Figma

```bash
node docs/figma/verify.js
```

This runs the plugin against a stub of the Figma API and reports how many
frames and links it produced. It exists because a prototype with a dead link
looks fine until someone taps it in front of a panel.

Current result: **16 frames, 48 links, none unresolved.**

---

## What it deliberately does not do

**No icons.** Icon positions are drawn as plain rounded shapes. The app uses
Ionicons; hand-drawing approximations of them in vector would look worse than
an honest placeholder, and you would only replace them anyway. Drop your own
icon set into those shapes.

**No photographs.** Photo areas are flat blocks. Swap in real images.

**Light mode only.** The app also has a dark theme; adding it would double the
frame count. The palette is at the top of `code.js` if you want to generate a
dark set — change the `C` object and run it again on a new page.

---

## Keeping it in step with the code

`code.js` mirrors [`src/theme.ts`](../../src/theme.ts). The `C`, `SP`, `R` and
`TYPE` objects at the top of the file are copies of the app's palette, spacing
scale, radius scale and type roles.

**If you change the theme in the app, change it here too.** This file is a
mirror, not a second source of truth — nothing checks that they agree.
