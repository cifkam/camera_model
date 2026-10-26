# Photo tools

Interactive optics for photographers, as static web pages (no build step). Published with
GitHub Pages; the root `index.html` links to the individual tools.

- [`3D/`](3D/) – 3D model of a (view) camera: standards with tilt, swing, rise and shift, the plane of
  sharp focus, depth of field, field of view, lens coverage and the Scheimpflug geometry.
  See [`3D/README.md`](3D/README.md).
- [`2D/`](2D/) – the side-view version: lens and film tilt in the vertical plane, the hinge and Scheimpflug points,
  the depth-of-field wedge; the focus point and the hinge can be dragged (a visual Scheimpflug calculator).
- [`tools/`](tools/) – calculators and tables (depth of field with draggable charts, hyperfocal and
  DoF tables); the formulas are in `tools/optics.js`. See [`tools/README.md`](tools/README.md).

## Checks

- `uv run python check_optics.py` – numpy cross-check of the thin-lens / Scheimpflug / depth-of-field
  algebra used by the 3D page (the uv project in the root exists for this).
- `node tools/test_optics.js` – checks the calculator formulas against textbook values.

## Publishing

`.github/workflows/pages.yml` publishes only the pages themselves (`index.html`, `3D/index.html`, `2D/index.html`,
`tools/index.html` and `tools/optics.js`) to GitHub Pages on every push to `main`.
