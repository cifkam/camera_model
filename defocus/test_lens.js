// Checks for lens.js. Run: node defocus/test_lens.js
const L = require('./lens.js');
let fails = 0;
const check = (name, got, expected, tol = 1e-9) => {
  const ok = got === expected || Math.abs(got - expected) <= tol * Math.max(1, Math.abs(expected));
  if (!ok) fails++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : ` (got ${got}, expected ${expected})`));
};

// thin lens: 50 mm focused at 2 m
const f = 50, N = 2, s = 2000, vs = L.imageDistance(f, s);
check('image distance 50 mm at 2 m', vs, 50 * 2000 / 1950);
check('focused at infinity the sensor is at f', L.imageDistance(f, 1e15), f, 1e-9);
check('no real image nearer than f', L.imageDistance(f, 40), Infinity, 0);
check('focus distance inverts the image distance', L.focusDistance(f, vs), s);
check('aperture of 50 mm f/2', L.aperture(f, N), 25);

// blur: the focused depth is sharp, others are not
check('a point at the focus distance is sharp', L.blurDiameter(f, N, vs, s), 0, 1e-12);
const zFar = 8000, vFar = L.imageDistance(f, zFar);
check('blur of a far point = A (v_s − v_z) / v_z', L.blurDiameter(f, N, vs, zFar), 25 * (vs - vFar) / vFar);
// the same by similar triangles in object space: c = A f |z − s| / (z (s − f))
check('blur by the object-space formula', L.blurDiameter(f, N, vs, zFar), 25 * f * (zFar - s) / (zFar * (s - f)));
check('blur at infinity = A (v_s − f) / f', L.blurDiameter(f, N, vs, 1e15), 25 * (vs - f) / f, 1e-9);
check('stopping down two stops halves the blur', L.blurDiameter(f, 2 * N, vs, zFar) / L.blurDiameter(f, N, vs, zFar), 0.5);
// the cone: the full aperture at the lens, nothing at the sharp image
check('cone at the lens is the aperture', L.coneDiameter(f, N, zFar, 0), 25);
check('cone at the sharp image is a point', L.coneDiameter(f, N, zFar, vFar), 0, 1e-12);
check('cone past the sharp image grows again', L.coneDiameter(f, N, zFar, 2 * vFar), 25);

// depth of field: the blur at the limits is exactly the acceptable c
const c = 0.03, dof = L.depthOfField(f, N, c, s);
check('hyperfocal 50 mm f/2 c = 0.03', dof.H, 2500 / 0.06 + 50);
check('blur at the near limit is c', L.blurDiameter(f, N, vs, dof.near), c, 1e-9);
check('blur at the far limit is c', L.blurDiameter(f, N, vs, dof.far), c, 1e-9);
const atH = L.depthOfField(f, N, c, dof.H);
check('focused at H the far limit is infinity', atH.far, Infinity, 0);
check('focused at H the near limit is about H/2', atH.near, dof.H / 2, 0.01);

console.log(fails ? `${fails} FAILED` : 'all passed');
process.exitCode = fails ? 1 : 0;
