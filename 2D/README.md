# Camera model (side view)

The 3D camera model reduced to the vertical plane through the lens axis: a side view of the
camera with lens and film tilt, rise/fall, the plane of sharp focus, the depth-of-field wedge,
the field of view and the Scheimpflug and hinge points. It is the visual form of a tilt /
Scheimpflug calculator: drag the hinge to set the tilt, drag the focus point to focus, and read
the numbers in the legend.

## Run

Open `2D/index.html` in a browser. It is a single file; the lil-gui control panel is loaded from
the jsDelivr CDN (the same copy the 3D page uses), so the first load needs network access.
No build step, no WebGL: the drawing is SVG.

Controls: drag pans, the wheel zooms about the cursor (two fingers pinch on a phone). The two
round handles can be dragged: the light-blue focus point slides along the lens axis and sets the
focus distance; the yellow hinge point slides along the line through the lens centre parallel to
the film and sets the lens tilt (J = f / sin α). The panel on the right has the same folders as the
3D page minus swing and shift, plus an `orientation` switch (which film edge is seen in the side
view) and a button that tilts the lens so the hinge lands on the ground.

## What is drawn

- rear standard with the ground glass (white = image area), front standard with the lens, bellows,
  rail and tripod; the whole camera can be pitched about the lens centre
- green: plane of sharp focus (orange when the image distance is below f), the bright part is what
  the film gate sees; the extended line is off by default
- lavender: field of view, rays from the two film edges through the lens centre (red when the edge
  falls outside the lens coverage)
- cyan: the in-focus region inside the field of view, bounded by the near and far limit lines; the
  extended limit lines (dashed) are off by default. All three lines meet at the hinge point
- faint white / blue: film and lens lines extended; dotted yellow: the front focal line and the
  film-parallel line through the lens, whose intersection with the plane of sharp focus is the hinge
- magenta: Scheimpflug point (film ∩ lens); yellow: hinge point (plane of sharp focus ∩ front focal line)
- light blue: lens axis and focus point
- grey / red dashed: lens coverage cone behind the lens (image circle at infinity)

The legend lists the on-axis film distance, the angle of the plane of sharp focus, the sharp line
within the frame, the depth of field on the axis, the vertical extent of the sharp band at a few
distances, the Scheimpflug and hinge positions and the tilt that would put the hinge on the ground.

## Optics

Same algebra as the 3D page, one dimension down: the thin lens maps the film side to the object
side projectively, `(y, z, 1) -> (f y, f z, z + f)` in lens coordinates, and lines transform with
`(b, c, d) -> (b f, c f − d, d f)`. The plane of sharp focus is the image of the film line; the
images of the film line scaled by `1 / (1 ± k)` about the lens centre, `k = c N / f`, are the near
and far limit lines. The Scheimpflug and hinge rules follow.

`check_optics.py` in the repository root checks the 3D algebra; the 2D page's geometry was
cross-checked against it (hinge distance `f / sin α`, limit lines through the hinge, brute-force
point mapping, textbook depth of field for the untilted case).

## Conventions

- x forward (towards the subject), y up, metres; camera dimensions in mm.
- Tilt positive = top of the standard forward; the lens tilted forward puts the hinge below the lens.
- Tilt pivot `axis` rotates about the standard's centre, `base` about its bottom edge.
- Focusing moves the rear standard; the lens stays where it is. The focus distance slider is the
  on-axis distance from the lens.
