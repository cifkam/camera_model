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

// reciprocity failure
const rc = (name, tm) => O.reciprocity(O.filmByName(name), tm);
check('HP5+ 10 s -> 20.4 s (Ilford example)', rc('Ilford HP5+', 10).tc, 20.4, 2e-3);
check('HP5+ 1 s: no correction', rc('Ilford HP5+', 1).tc, 1);
check('Tri-X 10 s -> 50 s', rc('Kodak Tri-X 400', 10).tc, 50);
check('Tri-X 100 s -> 1200 s', rc('Kodak Tri-X 400', 100).tc, 1200);
check('Tri-X 30 s: log-log between (10, 50) and (100, 1200)', rc('Kodak Tri-X 400', 30).tc, Math.exp(Math.log(50) + (Math.log(30) - Math.log(10)) / Math.log(10) * Math.log(1200 / 50)));
check('Tri-X 1000 s is extrapolated', rc('Kodak Tri-X 400', 1000).status === 'extrapolated' ? 1 : 0, 1);
check('T-Max 100 100 s -> 200 s', rc('Kodak T-Max 100', 100).tc, 200);
check('Fomapan 100 (Foma table) 1 s -> 2 s', rc('Fomapan 100 (Foma table)', 1).tc, 2);
check('Fomapan 200 (Ian Grant) 10 s -> 20 s (+1 stop)', rc('Fomapan 200 (Ian Grant test)', 10).tc, 20);
check('Fomapan 200 (Rockwood) 10 s -> 10 + 0.4*10^1.7', rc('Fomapan 200 (Rockwood fit)', 10).tc, 10 + 0.4 * Math.pow(10, 1.7));
check('Fomapan 100 (LF forum) 30 s -> +1 stop', rc('Fomapan 100 (large-format forum test)', 30).stops, 1);
check('Fomapan 100 (LF forum) 120 s -> +2 stops', rc('Fomapan 100 (large-format forum test)', 120).stops, 2);
check('Fomapan 100 (LF forum) 2 s: none', rc('Fomapan 100 (large-format forum test)', 2).tc, 2);
check('every film has reliability and advice', O.FILMS.every(f => f.reliability && f.advice) ? 1 : 0, 1);
check('Acros II 60 s: no correction', rc('Fujifilm Neopan 100 Acros II', 60).tc, 60);
check('Acros II 200 s: +1/2 stop', rc('Fujifilm Neopan 100 Acros II', 200).tc, 200 * Math.SQRT2);
check('Acros II 2000 s: no data', rc('Fujifilm Neopan 100 Acros II', 2000).status === 'nodata' ? 1 : 0, 1);
check('custom p = 1 is the identity', O.reciprocity({ model: 'power', p: 1, threshold: 1 }, 30).tc, 30);
check('stops of a 4x correction', O.reciprocity({ model: 'power', p: 2, threshold: 1 }, 4).stops, 2);

// development time vs temperature (Ilford chart fit)
check('Ilford example: 8:00 at 20 C -> 5:30 at 24 C', O.devTime(8, 20, 24).time, 5.5, 0.05);
check('chart row 10:00 at 20 C -> 12:30 at 18 C', O.devTime(10, 20, 18).time, 12.5, 0.15);
check('chart row 20:00 at 20 C -> 10:45 at 27 C', O.devTime(20, 20, 27).time, 10.75, 0.15);
check('chart row 20:00 at 20 C -> 16:15 at 22 C', O.devTime(20, 20, 22).time, 16.25, 0.2);
check('same temperature: unchanged', O.devTime(7.5, 20, 20).time, 7.5);
check('there and back', O.devTime(O.devTime(8, 20, 24).time, 24, 20).time, 8);
check('a base other than 20 C reads the same chart row', O.devTime(O.devTime(8, 20, 24).time, 24, 18).time, O.devTime(8, 20, 18).time, 1e-9);
check('inside 18-27 C is ok', O.devTime(8, 20, 24).status === 'ok' ? 1 : 0, 1);
check('16 C is extrapolated', O.devTime(8, 20, 16).status === 'extrapolated' ? 1 : 0, 1);
check('fixed 10 % per degree: 10 min -> 9 min one degree warmer', O.devTime(10, 20, 21, { model: 'percent', percent: 10 }).time, 9);
check('fixed rule has no range limit', O.devTime(10, 20, 30, { model: 'percent' }).status === 'ok' ? 1 : 0, 1);
check('continuous agitation takes 15 % off', O.devTime(8, 20, 20, { continuous: true }).time, 6.8);

console.log(fails ? `${fails} failure(s)` : 'all checks passed');
process.exit(fails ? 1 : 0);
