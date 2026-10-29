# Defocus and blur circles

A scene of simple objects photographed through a thin lens, showing how each point of it blurs: the light from a
point fills a cone from the aperture to the point's sharp image, and the sensor cuts that cone in a circle, the
blur circle (circle of confusion). Points at other depths than the focus come to focus in front of or behind the
sensor, so their circles grow with the distance from the focus and with the aperture. Self-contained: open
`index.html` directly or from any static web server (three.js comes from a CDN).

## What is on the page

- **3D view**: the objects, the camera's field of view, the plane in focus (green) and the near and far limits of
  the depth of field, the planes behind the lens where those limits come to focus (the sharp zone around the
  sensor, 2 N c v/f deep; both sets can be hidden in the 3D view folder), the lens with its aperture A = f/N, and
  the sensor behind it at the image distance v, carrying the picture (inverted, as a real sensor gets it). For the
  selected vertex its whole light cone is drawn: the rays from the rim of the aperture through its sharp image, a
  few circles across the cone and three either side of the sensor (fainter past it, where the sensor stops the
  light), and in orange the circle the sensor cuts, the blur circle. Drag the orange dot to move the sensor, or the
  green one to move the plane in focus; either refocuses the lens. Drag the blue dot at the lens to move the camera
  across the ground (with Shift, up and down), keeping the direction it looks in. "Look at the sensor up close"
  flies there. Optionally the objects appear behind the lens too, turned upside down, each point where it comes to
  focus (at v_z on its chief ray; the thin lens keeps straight lines straight): the image space, squeezed into a
  millimetre or so in depth. The camera's inside is millimetres next to a scene in metres, so it is drawn enlarged
  (×20 by default).
- **Image view**: the picture with every line as wide as its blur circle (and fainter, as its light spreads), each
  vertex as its blur circle (a solid dot when within the acceptable blur), and the checkerboard's squares blurred.
- **Presets**: a long lens on 8×10″ from afar (shallow depth of field, the objects' sharp images spread some 34 mm
  apart behind the lens) against a 24 mm on full frame up close (deep depth of field, the images within half a
  millimetre), and the standard 50 mm f/1.4.
- **Maths**: the thin lens (v from 1/f = 1/s + 1/v, the focal length in pixels fx = v / pixel size, and the focus
  breathing that follows), the depth of field (hyperfocal distance, near and far limits), and the blur of the
  selected vertex worked out step by step.

## Model

- Thin lens at the camera centre; all lens lengths in millimetres, the scene in metres (Z up, OpenCV camera frame:
  x right, y down, z forward).
- A point at depth z (along the axis) is sharp at v_z = f z / (z − f). On a sensor at v its blur circle has the
  diameter c = A |v − v_z| / v_z, centred where the chief ray (through the lens centre) meets the sensor.
- Depth of field for an acceptable blur c (by default the sensor diagonal / 1500): H = f² / (N c) + f,
  near = s (H − f) / (H + s − 2f), far = s (H − f) / (H − s) (infinite once s ≥ H).
- Focusing moves the sensor, so the pixel scale is v, not f: the picture grows slightly when focused closer.

## Files

- `index.html` – the page (UI, 3D scene, image view).
- `lens.js` – the thin-lens and blur maths (classic script, also loadable under node).
- `camera.js` – pose, projection and the scene's primitives; a copy of the one in the pinhole page.
- `test_lens.js` – checks: `node defocus/test_lens.js`.
