# View camera focus visualiser

Interactive 3D view of a large-format camera (rear standard = film, front standard = lens)
and the plane of sharp focus that results from focusing, tilt, swing, rise/fall and shift.

## Run

Open `index.html` in a browser (double-click, or `firefox index.html`). It is a single file;
Three.js and the lil-gui control panel are loaded from the jsDelivr CDN, so the first load
needs network access. No build step.

Controls: left-drag orbits, right-drag pans, wheel zooms. The panel on the right has the
camera controls and a few presets. The readout bottom-left shows the on-axis focus distance,
the angle of the plane of sharp focus, and the hinge distance J.

## What is drawn

- rear standard with ground glass (white outline = image area), front standard with lens,
  bellows, rail and tripod
- green: plane of sharp focus (orange when the image distance is below f, i.e. "beyond infinity");
  the bright quadrilateral with a white outline is the part of it that the film gate actually
  sees (the conjugate image of the film rectangle); the whole plane, the near/far limit planes
  and the Scheimpflug/hinge lines are off by default and can be switched on in the Display
  folder, the extended film and lens planes are on by default
- lavender: field of view, rays from the four film-gate corners through the lens centre; this
  is where the film format and focal length matter, and rear tilt/swing shows up as keystoning
  of the sharp area. The sharp area is the plane clipped by the frustum, so when part of the
  frame looks past the plane (it "leaves through infinity") the area runs off to the scene
  extent instead of disappearing; the in-focus volume is likewise the frustum clipped by the
  near and far half-spaces
- grey / red ring on the film plane: the lens's coverage (image circle at infinity, set in the
  Lens folder, projected as a cone from the lens centre). Corner rays and the ring turn red when
  a frame corner falls outside it, i.e. the movements would vignette
- faint white / blue: film plane and lens plane extended, so you can see them meet
- magenta: Scheimpflug line (film plane ∩ lens plane)
- yellow: hinge line (plane of sharp focus ∩ front focal plane)
- light blue: lens axis and the on-axis focus point
- cyan: depth of field. The translucent slab inside the field of view is the volume that is
  both framed and acceptably sharp (near quad to far quad along the corner rays); the faint
  large polygons are the near and far limit planes, which meet the plane of sharp focus at the
  hinge line (Merklinger's wedge)

## Depth of field

Blur of an object point = aperture diameter f/N times |1 − s₀|, where s₀ is the position of
the film along the chief ray relative to the image point (s₀ = 1 means in focus). Requiring
blur ≤ circle of confusion c gives |1 − s₀| ≤ k with k = c·N/f. That holds exactly on two
copies of the film plane scaled by 1/(1 ± k) about the lens centre; their images through the
lens are the near and far limit planes. Along a single ray from the lens centre s₀ is affine in
1/t, so each ray's in-focus stretch is a closed-form interval, which is what the slab uses
(far limit at infinity is cut at the scene extent and the readout says so).

The circle of confusion is derived from the print by default: tolerable blur on the print =
viewing distance / eye resolution (default 1/1500 rad, about 2.3 arcmin), divided by the
enlargement from the film's long edge to the print's long edge. Switch "circle of confusion"
to manual to type a film CoC directly.

## Optics

The thin lens is treated as a projective map in lens coordinates,
`(x, y, z, 1) -> (f x, f y, f z, z + f)`, and the film plane is pushed through it
(planes transform with the inverse transpose). The image of the film plane is the plane of
sharp focus; the Scheimpflug and hinge rules fall out of this automatically.

`check_optics.py` cross-checks that algebra with numpy (brute-force point mapping, Scheimpflug
rule, hinge rule with J = f / sin α, and the untilted thin-lens case):

```
uv run python check_optics.py
```

## Conventions

- Camera dimensions in mm, scene in metres. z is the optical axis towards the subject, y is up.
- Tilt rotates about the standard's horizontal axis, positive = top of the standard forward
  (for the front standard that is "tilt down"). Swing rotates about the vertical axis.
- Tilt pivot `axis` rotates about the standard's centre, `base` about its bottom edge.
- Standard separation is the rail distance between the two standards' nominal centres. The lens
  (front standard) stays fixed in space and focusing slides the rear standard, so changing the
  separation never moves the field of view's apex.
