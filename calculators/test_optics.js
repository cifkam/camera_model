// Checks for optics.js against textbook values. Run: node calculators/test_optics.js
const O = require('./optics.js');
let fails = 0;
const check = (name, got, expected, tol = 1e-9) => {
  const ok = got === expected || Math.abs(got - expected) <= tol * Math.max(1, Math.abs(expected));
  if (!ok) fails++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : ` (got ${got}, expected ${expected})`));
};

// hyperfocal and DoF: 150 mm at f/22 with c = 0.1 mm, subject at 2.4 m (values cross-checked earlier in numpy)
const f = 150, N = 22, c = 0.1, H = O.hyperfocal(f, N, c);
check('hyperfocal 150 mm f/22 c=0.1 mm', H, 150 * 150 / (22 * 0.1) + 150);
const r = O.dof(f, N, c, 2400);
check('near limit at 2.4 m', r.near, 2400 * (H - f) / (H + 2400 - 2 * f));
check('far limit at 2.4 m', r.far, 2400 * (H - f) / (H - 2400));
check('far limit at H is infinity', O.dof(f, N, c, H).far, Infinity, 0);
check('near limit at H is H/2 (approximately)', O.dof(f, N, c, H).near, H / 2, 0.02);

// circle of confusion from the print: 40 cm print of 4x5 (120 mm) viewed from 50 cm, 1/1500 rad
const ci = O.cocFromPrint('4x5"', 40, 50, 1500);
check('enlargement', ci.enlargement, 400 / 120);
check('print blur', ci.printBlur, 500 / 1500);
check('coc on film', ci.coc, (500 / 1500) / (400 / 120));

// extension and bellows factor
check('extension for 3 m with 150 mm', O.extensionFor(150, 3000), 150 * 3000 / 2850);
check('subject for that extension', O.subjectFor(150, O.extensionFor(150, 3000)), 3000);
check('bellows factor at 1:1', O.bellows(1).factor, 4);
check('bellows stops at 1:1', O.bellows(1).stops, 2);

// angle of view: 120 mm gate at 150 mm
check('angle of view', O.angleOfView(120, 150) * 180 / Math.PI, 2 * Math.atan(60 / 150) * 180 / Math.PI);

// focus spread and tilt
check('focus spread, geometric', O.focusSpread(4, 0.1).geometric, 20);
check('focus spread, Hansma', O.focusSpread(4, 0.1).hansma, Math.sqrt(1500));
check('tilt for hinge at 1.2 m with 150 mm', O.tiltForHinge(150, 1200) * 180 / Math.PI, Math.asin(0.125) * 180 / Math.PI);
check('hinge distance round trip', O.hingeDistance(150, O.tiltForHinge(150, 1200)), 1200);

// formats and equivalence
check('crop factor of 35 mm is 1', O.cropFactor('35 mm'), 1);
check('crop factor APS-C (diagonal)', O.cropFactor('APS-C'), Math.hypot(36, 24) / Math.hypot(23.5, 15.6));
check('crop factor 4x5 by width', O.cropFactor('4x5"', 'width'), 36 / 120);
check('equivalent focal 50 mm, 35 mm -> 4x5 (diagonal)', O.equivalentFocal(50, '35 mm', '4x5"'), 50 * Math.hypot(120, 95) / Math.hypot(36, 24));
check('equivalent focal round trip', O.equivalentFocal(O.equivalentFocal(50, '35 mm', '4x5"', 'height'), '4x5"', '35 mm', 'height'), 50);
check('equivalent aperture scales like the focal length', O.equivalentAperture(11, '35 mm', '4x5"'), 11 * Math.hypot(120, 95) / Math.hypot(36, 24));
const aov = O.anglesOfView('35 mm', 50), deg = r => r * 180 / Math.PI;
check('50 mm on 35 mm: diagonal angle 46.8°', deg(aov.d), 46.79, 1e-3);
check('50 mm on 35 mm: horizontal angle 39.6°', deg(aov.h), 39.60, 1e-3);
check('50 mm on 35 mm: vertical angle 27.0°', deg(aov.v), 26.99, 1e-3);
check('scene width of 50 mm on 35 mm at 3 m', O.sceneCoverage('35 mm', 50, 3000).width, 36 * 2950 / 50);

console.log(fails ? `${fails} failure(s)` : 'all checks passed');
process.exit(fails ? 1 : 0);
