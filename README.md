# Photo tools

Interactive optics for photographers, as static web pages (no build step). Published with
GitHub Pages; the root `index.html` links to the individual tools.

- [`3D/`](3D/) – 3D model of a (view) camera: standards with tilt, swing, rise and shift, the plane of
  sharp focus, depth of field, field of view, lens coverage and the Scheimpflug geometry.
  See [`3D/README.md`](3D/README.md).
More tools (calculators and tables) will live in their own directories next to it.

## Checks

- `uv run python check_optics.py` – numpy cross-check of the thin-lens / Scheimpflug / depth-of-field
  algebra used by the 3D page (the uv project in the root exists for this).

## Publishing

`.github/workflows/pages.yml` publishes only the pages themselves (`index.html` and `3D/index.html`,
plus the tool pages as they are added) to GitHub Pages on every push to `main`.
