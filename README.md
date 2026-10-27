# Photo tools

Interactive optics for photographers, as static web pages (no build step). Published with
GitHub Pages; the root `index.html` links to the individual tools.

- [`3d/`](3d/) – 3D model of a (view) camera: standards with tilt, swing, rise and shift, the plane of
  sharp focus, depth of field, field of view, lens coverage and the Scheimpflug geometry.
  See [`3d/README.md`](3d/README.md).
- [`2d/`](2d/) – the side-view version: lens and film tilt in the vertical plane, the hinge and Scheimpflug points,
  the depth-of-field wedge; the focus point and the hinge can be dragged (a visual Scheimpflug calculator).
- [`calculators/`](calculators/) – calculators and tables (depth of field with draggable charts, hyperfocal and
  DoF tables); the formulas are in `calculators/optics.js`. See [`calculators/README.md`](calculators/README.md).

## Checks

- `uv run python check_optics.py` – numpy cross-check of the thin-lens / Scheimpflug / depth-of-field
  algebra used by the 3D page (the uv project in the root exists for this).
- `node calculators/test_optics.js` – checks the calculator formulas against textbook values.

## Publishing

`.github/workflows/pages.yml` publishes only the pages themselves (`index.html`, `3d/index.html`, `2d/index.html`,
`calculators/index.html` and `calculators/optics.js`) to GitHub Pages on every push to `main`, plus
`favicon.ico`, `404.html` and uppercase alias folders (`2D/`, `3D/`) that redirect to the real directories, since Pages
paths are case-sensitive.
