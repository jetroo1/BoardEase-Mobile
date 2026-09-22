# BoardEase — CCE106/L Documentation

Everything the panel asks for, kept apart from the source code so it can be
opened, printed, or submitted without digging through `src/`.

```
docs/
├── diagrams/     the six required system diagrams (.drawio, editable)
├── ui-mockups/   screen mockups (.svg vector, .png raster, prototype.html)
└── report/       the written material for the defense
```

## report/

| File | What it answers |
|---|---|
| [01-features-vs-proposal.md](report/01-features-vs-proposal.md) | "Did you build what you said you would?" — every proposal objective traced to the file that implements it, including the two gaps. |
| [02-screens.md](report/02-screens.md) | "Show us your screens." — all 16 screens, what each does, and how they connect. |
| [03-demo-script.md](report/03-demo-script.md) | The click-by-click walkthrough for defense day, in order, with what to say. |
| [04-setup.md](report/04-setup.md) | How to run it on a phone, and what to do when it won't start. |

## diagrams/

Six `.drawio` files, editable at <https://app.diagrams.net> with no account.

> **Before submission:** `diagrams/README.md` tells you to use `.svg` versions
> in the written paper, but no `.svg` files have been exported yet. Open each
> `.drawio` and do **File → Export as → SVG** (or PNG at 200% zoom for print).

## ui-mockups/

Six screens as `.svg` (vector, stays sharp in Word) and `.png`, plus
`prototype.html` which opens in a browser.

These predate the current build — treat them as the design intent, not as
screenshots of the running app. For live screens, run the app and capture it,
or generate editable frames with the Figma plugin (see the main README).

## The proposal itself

`BoardEase_TitleProposal.docx` lives on the team's Desktop, not in this repo.
Copy it into `docs/proposal/` before submitting so the whole package travels
together.
