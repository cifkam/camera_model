# Photo tools

Calculators and tables for photographers, as a single static page: `calculators/index.html`. No build
step; open the file in a browser or publish it with the rest of the repository.

## Layout

- `index.html` — the page: shared camera panel (format, lens, aperture, circle of confusion),
  a navigation of tools, and one section per tool. Each tool is an object in `tools` with a
  `title`, a `render(root)` that builds its inputs and output containers once, and an `update()`
  that recomputes the outputs; `update()` runs on every input change. Charts are hand-drawn SVG;
  `makeDraggable(container, cb)` makes the chart in a container a drag control (press or drag
  anywhere over it); the listeners live on the container because every update redraws the SVG.
- `optics.js` — the formulas (thin-lens model, depth of field, hyperfocal distance, circle of
  confusion from the print, bellows factor, angle of view, focus spread, Scheimpflug tilt).
  A classic script so the page also works from `file://`; Node can `require` it.
- `test_optics.js` — `node calculators/test_optics.js` checks the formulas against textbook values.

## Tools so far

- Depth of field: near/far limits, hyperfocal distance, magnification; a sharp-range bar on a
  logarithmic distance axis and near/far-vs-focus curves for every aperture, both draggable.
- Hyperfocal table by focal length and aperture.
- DoF table (near – far by focus distance and aperture) for the current lens.
- Formats: crop factors, the equivalent focal length and aperture on another format (matched by
  diagonal, width or height), angles of view, scene coverage at the focus distance, the formats
  drawn to scale and a comparison table of all formats.

Distances are measured from the lens (thin-lens model); camera distance scales usually measure
from the film plane, which adds the image distance (about one focal length).

## Adding a tool

Add `tools.myTool = { title, render(root), update() }` in `index.html`. Shared settings live in
`S` (persisted in the browser's localStorage); `cocInfo().coc` gives the circle of confusion in mm.
Use `numField` / `selectField` / `checkField` for inputs bound to `S`, and `fields[key].set(v)`
to push a value back into an input (as the draggable charts do for the focus distance).
