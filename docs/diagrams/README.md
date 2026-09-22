# BoardEase — System Design Diagrams

Diagrams for the CCE106/L documentation. Each diagram comes in **two formats**:

| Figure | draw.io (editable) | SVG (drop into your paper) |
|---|---|---|
| 01 System Architecture | `01-system-architecture.drawio` | `01-system-architecture.svg` |
| 02 Use Case Diagram | `02-use-case-diagram.drawio` | `02-use-case-diagram.svg` |
| 03 Context Flow Diagram | `03-context-flow-diagram.drawio` | `03-context-flow-diagram.svg` |
| 04 Data Flow Diagram (Level 1) | `04-data-flow-diagram-level1.drawio` | `04-data-flow-diagram-level1.svg` |
| 05 Entity Relationship Diagram | `05-entity-relationship-diagram.drawio` | `05-entity-relationship-diagram.svg` |
| 06 System Flowchart | `06-system-flowchart.drawio` | — export from draw.io |

## Which one do I use?

**Editing a diagram → use the `.drawio` file.**
Every box, label, and connector is a real object. Drag a box and its connectors follow automatically.

**Putting a diagram in the written paper → use the `.svg` file.**
Insert it straight into Word or Google Docs. It's vector, so it stays sharp at any size and when printed.

## Opening the .drawio files

1. Go to <https://app.diagrams.net> (no account needed), or install the draw.io desktop app
2. **Open Existing Diagram** → pick the `.drawio` file
3. Edit freely
4. To export an image: **File → Export as → PNG**, set Zoom to 200% for print quality

## Putting SVGs into your document

- **Word:** Insert → Pictures → This Device → pick the `.svg`
- **Google Docs:** Docs doesn't accept SVG directly — open the `.svg` in a browser, screenshot it, or export a PNG from draw.io instead
- **Printing:** the colors are fixed light-theme on purpose, so they print cleanly in black and white too

## Notes on the diagrams themselves

- **Figure 02** — the "Moderate Reviews" ellipse is drawn **dashed in amber** because it was specified in the proposal but is a recent addition. Update the legend if you rebuild it.
- **Figure 04** — every data flow is labelled. This is required: an unlabelled flow in a DFD is an error, not a style choice.
- **Figure 05** — uses crow's-foot notation (one = tick, many = fork). The note at the bottom explains that Firestore is NoSQL, so these aren't real enforced foreign keys. Expect a panelist to ask about this.

## If you change the system, update these

These diagrams describe the system as actually built, not just as proposed. If you add a feature or change the data model, edit the `.drawio` file and re-export the `.svg` so the two stay in sync.
