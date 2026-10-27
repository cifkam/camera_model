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

Each tab can be linked to directly by its id: `calculators/#dof`, `#hyperfocal`, `#table`,
`#formats`, `#reciprocity`, `#timetemp`. The address follows the selected tab.

- Depth of field: near/far limits, hyperfocal distance, magnification; a sharp-range bar on a
  logarithmic distance axis and near/far-vs-focus curves for every aperture, both draggable.
- Hyperfocal table by focal length and aperture.
- DoF table (near – far by focus distance and aperture) for the current lens.
- Formats: crop factors, the equivalent focal length and aperture on another format (matched by
  diagonal, width or height), angles of view, scene coverage at the focus distance, the formats
  drawn to scale and a comparison table of all formats.
- Reciprocity: corrected exposure time for long exposures (Schwarzschild effect) from the metered
  time, for Ilford/Kentmere (power law, Harman's 2023 factors), Kodak T-Max 100/400 and Tri-X,
  Fomapan 100/200/400 (data-sheet tables, interpolated in log–log), Fuji Acros II or custom
  parameters; log–log chart with a comparison film, tables
  at standard times and of all films with a reliability rating and a short recommendation. Foma's
  own tables are rated low (user tests find 1–3 stops less failure), so the user-measured
  alternatives sit next to them. Sources are linked from the page and listed in `optics.js`.
- Time/temp: a known development time at one temperature converted to another (Ilford's
  time/temperature compensation chart, fitted as a quadratic in log time so any time and
  temperature work; or a fixed % per °C rule), with the Massive Dev Chart's −15 % for continuous
  agitation, °C or °F, one chart chosen by a dropdown (the classic nomograph by default: log
  time across, temperature up, lines of constant development at the printed charts' slope of a
  doubling every 7.1 °C, with the chosen rule and the new temperature drawn on it; or a
  time-vs-temperature curve with the same draggable points) and an interactive version of Ilford's
  table.

Distances are measured from the lens (thin-lens model); camera distance scales usually measure
from the film plane, which adds the image distance (about one focal length).

## Adding a tool

Add `tools.myTool = { title, render(root), update() }` in `index.html`. Shared settings live in
`S` (persisted in the browser's localStorage); `cocInfo().coc` gives the circle of confusion in mm.
Use `numField` / `selectField` / `checkField` for inputs bound to `S`, and `fields[key].set(v)`
to push a value back into an input (as the draggable charts do for the focus distance).
