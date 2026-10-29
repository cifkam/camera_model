# Pinhole camera model

An interactive pinhole camera as computer vision models it: a 3D scene, the camera in it, and the image the camera
records, with the intrinsics K, the pose [R | t], the projection matrix P = K [R | t] and the OpenCV lens distortion
shown live as you change them. Self-contained: open `index.html` directly or from any static web server (three.js
and lil-gui come from the jsdelivr CDN).

## What is on the page

- **3D view**: the objects (a calibration checkerboard, cube, pyramid, sphere, cylinder, the world axes and a ground
  grid), the camera with its own x / y / z axes, the frustum, and the image plane carrying the very picture shown
  on the right, at the focal length f from the centre of projection. A real f of millimetres would be invisible
  next to objects metres away, so the camera (f and the sensor together) is drawn enlarged, ×40 by default;
  scaling both leaves the picture unchanged. A negative scale puts the plane behind the centre, where the real,
  inverted image falls, instead of the upright *virtual* image in front. Drag the orange dot at the plane's centre
  along the optical axis to change the scale. The selected vertex sends its ray through the centre C to the image plane.
- **Image view**: the W × H picture in pixel coordinates (u right, v down) with the principal point (drag it) and,
  faintly, whatever projects just outside the frame. With distortion it also shows the pinhole image dashed, the
  shift of the selected point, and optionally how a regular pixel grid bends.
- **Maths panel**: K, [R | t] and P with live numbers; the field of view (with and without distortion) and the
  35 mm equivalent focal length; and the projection of the selected vertex worked out step by step.

Tap or click a vertex in either view to follow it. Settings are kept in `localStorage`.

## Conventions

- World: right-handed, Z up, metres. Camera (OpenCV): x right, y down, z forward along the optical axis.
- Pose: yaw about the world Z axis (+ turns left), pitch (+ looks up), roll about the optical axis; at zero the
  camera looks along +Y. `X_c = R X_w + t` with `t = −R C`; the rows of R are the camera axes in world coordinates.
- Normalised coordinates `x = X_c / Z_c`, `y = Y_c / Z_c` (the image plane at Z_c = 1).
- Distortion (OpenCV radial + tangential, `k1 k2 p1 p2 k3`), with `r² = x² + y²`:

      x_d = x (1 + k1 r² + k2 r⁴ + k3 r⁶) + 2 p1 x y + p2 (r² + 2 x²)
      y_d = y (1 + k1 r² + k2 r⁴ + k3 r⁶) + p1 (r² + 2 y²) + 2 p2 x y

  Where strong barrel coefficients make `r (1 + k1 r² + …)` turn back, the model would fold the scene back into the
  picture; nothing beyond that radius is drawn.
- Pixels: `[u v 1]ᵀ = K [x_d y_d 1]ᵀ` with `K = [[fx, s, cx], [0, fy, cy], [0, 0, 1]]` and
  `fx = f · W / sensor width`. The pixel coordinates run from (0, 0) at the top-left corner of the image to (W, H);
  OpenCV puts the centre of the first pixel at (0, 0), half a pixel off.

## Files

- `index.html` – the page (UI, 3D scene, image view).
- `camera.js` – the maths (pose, intrinsics, distortion and its inverse, projection with clipping, field of view, the
  primitives). No DOM, no three.js; a classic script, so the page also runs from file://: the global `Cam` in the
  browser, `require('./camera.js')` under node.
- `test_camera.js` – checks, including against `cv2.projectPoints`: `node test_camera.js`.
