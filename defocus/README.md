# Defocus and blur circles

A scene of simple objects photographed through a thin lens, showing how each point of it blurs: the light from a
point fills a cone from the aperture to the point's sharp image, and the sensor cuts that cone in a circle, the
blur circle (circle of confusion). Points at other depths than the focus come to focus in front of or behind the
sensor, so their circles grow with the distance from the focus and with the aperture. Self-contained: open
`index.html` directly or from any static web server (three.js comes from a CDN).

## What is on the page

- **3D view**: the objects, the camera's field of view, the plane in focus (green) and the near and far limits of
  the depth of field, the planes behind the lens where those limits come to focus (the sharp zone around the
  sensor, 2 N c v/f deep; both sets can be hidden in the View folder), the lens with its aperture A = f/N, and
  the sensor behind it at the image distance v, carrying the picture (inverted, as a real sensor gets it). For the
  selected vertex its whole light cone is drawn: the rays from the rim of the aperture through its sharp image, a
  few circles across the cone and three either side of the sensor (fainter past it, where the sensor stops the
  light), and in orange the circle the sensor cuts, the blur circle. Drag the orange dot to move the sensor, or the
  green one to move the plane in focus; either refocuses the lens. Drag the blue dot at the lens to move the camera
  across the ground (with Shift, up and down), keeping the direction it looks in. Optionally the objects appear
  behind the lens too, turned upside down, each point where it comes to focus (at v_z on its chief ray; the thin
  lens keeps straight lines straight): the image space, squeezed into a millimetre or so in depth. The camera's
  inside is millimetres next to a scene in metres, so it is drawn enlarged (×20 by default).
- **Image view**: the picture with every line as wide as its blur circle (and fainter, as its light spreads), each
  vertex as its blur circle (a solid dot when within the acceptable blur), and the checkerboard's squares blurred.
- **Presets**: a long lens on 8×10″ from afar (shallow depth of field, the objects' sharp images spread some 34 mm
  apart behind the lens) against a 24 mm on full frame up close (deep depth of field, the images within half a
  millimetre), the standard 50 mm f/1.4, and a 4×5″ view camera with the lens tilted to bring the ground into focus.
- **View camera**: the "camera" switch turns on a view camera's standards (their controls, below the lens's, stay
  hidden for the normal camera, where the movements count as zero): the lens (front) and the sensor (rear) each
  rise, fall and shift across, and tilt and swing.
- **Maths**: the thin lens (v from 1/f = 1/s + 1/v, the focal length in pixels fx = v / pixel size, and the focus
  breathing that follows), the depth of field (hyperfocal distance, near and far limits), and the blur of the
  selected vertex worked out step by step.

## Model

- Thin lens at the camera centre; all lens lengths in millimetres, the scene in metres (Z up, OpenCV camera frame:
  x right, y down, z forward).
- A point at depth z (along the axis) is sharp at v_z = f z / (z − f). On a sensor at v its blur circle has the
  diameter c = A |v − v_z| / v_z, centred where the chief ray (through the lens centre) meets the sensor.
- The circle of confusion c (acceptable blur) is set directly; picking a format or a preset sets it to the
  format's diagonal / 1500 (0.029 mm on full frame, 0.1 mm on 4×5″). Depth of field for it: H = f² / (N c) + f,
  near = s (H − f) / (H + s − 2f), far = s (H − f) / (H − s) (infinite once s ≥ H).
- Focusing moves the sensor, so the pixel scale is v, not f: the picture grows slightly when focused closer.
- View camera: the camera frame of the projection is the sensor's own, centred on the lens centre L, so the picture
  is the pinhole projection K [R | t] from L with R the sensor's orientation and the principal point where the
  perpendicular from L meets the sensor. Rise and shift of either standard move that point; tilting or swinging
  the back changes the picture (the image plane turns: converging verticals straighten); turning the lens does not,
  as the chief ray through L goes straight on. The focus distance s is along the lens axis, and the sensor slides
  along the body's rail until it passes through its image, D (square to the sensor) behind L. With lens and sensor
  no longer parallel focus turns: the plane in focus is the sensor's image through the lens (Scheimpflug) and turns
  about the hinge line, J = f / sin θ from the lens (θ between lens and sensor). The blur is the cone from the
  aperture, square to the lens axis, cut by the sensor at a slant: an ellipse, traced exactly. The near and far
  limits are the images of planes parallel to the sensor through the axial limits' images; they too pass through
  the hinge line (Merklinger's rule, the usual approximation).

## Files

- `index.html` – the page (UI, 3D scene, image view).
- `lens.js` – the thin-lens and blur maths (classic script, also loadable under node).
- `camera.js` – pose, projection and the scene's primitives; a copy of the one in the pinhole page.
- `test_lens.js` – checks: `node defocus/test_lens.js`.
