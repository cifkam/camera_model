// Checks for camera.js. Run: node pinhole_model/test_camera.js
const C = require('./camera.js');
let fails = 0;
const check = (name, got, expected, tol = 1e-9) => {
  const ok = got === expected || Math.abs(got - expected) <= tol * Math.max(1, Math.abs(expected));
  if (!ok) fails++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : ` (got ${got}, expected ${expected})`));
};

// intrinsics: 50 mm on a 36 mm wide sensor imaged at 1920 px
const fx = C.fxFromFocal(50, 36, 1920);
check('fx = f W / sensor width', fx, 50 * 1920 / 36);
const K = C.intrinsics({ fx, fy: fx, cx: 960, cy: 540 });
check('horizontal FoV of 50 mm on 36 mm (39.6°)', C.fieldOfView(K, 1920, 1080).h, 39.5978, 1e-5);
check('vertical FoV of 50 mm on 20.25 mm', C.fieldOfView(K, 1920, 1080).v, 2 * Math.atan(10.125 / 50) * 180 / Math.PI);

// pose: camera at C looking at a target puts the target on the principal point
const Cw = [-4, -6, 2], target = [1, 2, 0.5];
const { yaw, pitch } = C.lookAt(Cw, target);
const R = C.rotationFromYawPitchRoll(yaw, pitch, 25);
const t = C.translationFromCentre(R, Cw);
const cam = C.makeCamera({ K, R, t });
const pt = C.projectPoint(target, cam);
check('lookAt target lands on cx', pt.uv[0], 960, 1e-9);
check('lookAt target lands on cy', pt.uv[1], 540, 1e-9);
check('R is orthonormal', C.dot(R[0], R[1]) + C.dot(R[1], R[2]) + C.dot(R[0], R[2]), 0, 1e-12);
check('camera centre maps to the camera origin', C.norm(C.add(C.mulv(R, Cw), t)), 0, 1e-12);
const R0 = C.rotationFromYawPitchRoll(0, 0, 0);
check('at rest the camera looks along +Y (z_c = Y)', C.mulv(R0, [0, 1, 0])[2], 1);
check('at rest image down is world down (y_c = -Z)', C.mulv(R0, [0, 0, -1])[1], 1);
check('yaw +90° looks along -X', C.mulv(C.rotationFromYawPitchRoll(90, 0, 0), [-1, 0, 0])[2], 1, 1e-12);
check('pitch +90° looks up', C.mulv(C.rotationFromYawPitchRoll(0, 90, 0), [0, 0, 1])[2], 1, 1e-12);

// P = K [R|t] agrees with the step-by-step projection
const X = [0.7, 1.3, 1.1], h = C.mulv(cam.P, [...X, 1]), p = C.projectPoint(X, cam);
check('P X: u', h[0] / h[2], p.uv[0]);
check('P X: v', h[1] / h[2], p.uv[1]);
check('P X: the scale is the depth Z_c', h[2], p.Xc[2]);

// distortion
const D0 = C.NO_DISTORTION, Db = { k1: -0.25, k2: 0, k3: 0, p1: 0, p2: 0 };
check('zero coefficients leave points alone', C.distort([0.3, -0.2], D0)[0], 0.3);
check('barrel pulls a corner inwards', C.distort([0.5, 0.4], Db)[0] < 0.5 ? 1 : 0, 1);
check('pincushion pushes it outwards', C.distort([0.5, 0.4], { ...Db, k1: 0.2 })[0] > 0.5 ? 1 : 0, 1);
const Dm = { k1: -0.21, k2: 0.08, k3: 0.012, p1: 0.004, p2: -0.003 };
for (const q of [[0.1, 0.05], [0.4, -0.3], [-0.6, 0.45], [0.8, 0.2]]) {
  const back = C.undistort(C.distort(q, Dm), Dm);
  check(`undistort(distort(${q})) x`, back[0], q[0], 1e-9);
  check(`undistort(distort(${q})) y`, back[1], q[1], 1e-9);
}
check('barrel k1 = -0.25 turns back at r = 1/sqrt(3·0.25)', C.maxRadius(Db), 1 / Math.sqrt(0.75), 1e-9);
check('pincushion never turns back', C.maxRadius({ ...Db, k1: 0.2 }), Infinity, 0);

// against cv2.projectPoints (opencv-python 4, rvec (0.1, -0.2, 0.05), t (0.3, -0.2, 5),
// dist k1 k2 p1 p2 k3 = -0.21 0.08 0.004 -0.003 0.012; OpenCV ignores the skew, so it is 0 here)
const Rcv = [[0.9788428062071254, -0.0595199734937639, -0.1957655063893064],
             [0.03960732051223486, 0.9937772959432721, -0.10410545725138103],
             [0.20074366963468865, 0.0941491307606165, 0.9751091837730888]];
const camCv = C.makeCamera({ K: C.intrinsics({ fx: 1280, fy: 1300, cx: 960, cy: 540 }), R: Rcv, t: [0.3, -0.2, 5], dist: Dm });
const cv = [[[0.5, -0.4, 1.0], [1089.9804256531565, 394.25184121953987]], [[-1.2, 0.7, 0.3], [717.6918225828963, 645.3743820643921]]];
for (const [Xw, uv] of cv) {
  const q = C.projectPoint(Xw, camCv).uv;
  check(`cv2.projectPoints ${Xw}: u`, q[0], uv[0], 1e-12);
  check(`cv2.projectPoints ${Xw}: v`, q[1], uv[1], 1e-12);
}

// clipping
const behind = C.add(Cw, C.scale(C.sub(Cw, target), 1));     // straight behind the camera
check('a segment wholly behind the camera draws nothing', C.projectSegment(behind, C.add(behind, [0, 0, 1]), cam).length, 0);
check('a segment through the camera plane is cut, not lost', C.projectSegment(behind, target, cam).length, 1);
const bent = C.projectSegment([-2, 3, 0], [3, 3, 0], { ...cam, ...C.makeCamera({ K, R, t, dist: Db }) });
check('with distortion a straight edge is sampled into a curve', bent[0].length > 2 ? 1 : 0, 1);
const camView = C.makeCamera({ K, R, t, view: [1920, 1080] });
check('without distortion a long edge with far-off ends is kept', C.projectSegment([-10, -10, 0], [10, 10, 0], camView).length, 1, 0);
check('with distortion its far-off samples are cut, the rest kept',
  C.projectSegment([-10, -10, 0], [10, 10, 0], C.makeCamera({ K, R, t, view: [1920, 1080], dist: { ...Db, k1: 0.2 } })).length > 0 ? 1 : 0, 1);
check('a polygon behind the camera is skipped', C.projectPolygon([behind, C.add(behind, [1, 0, 0]), C.add(behind, [1, 1, 0])], cam), null, 0);

// primitives
check('cube: 8 vertices, 12 edges', C.cube().vertices.length * 100 + C.cube().edges.length, 812, 0);
check('checkerboard 7×5: 48 corners, 35 squares', C.checkerboard().vertices.length * 100 + C.checkerboard().faces.length, 4835, 0);
check('sphere top pole at 2r', C.sphere(0.6).vertices.at(-1)[2], 1.2);
check('yaw 90° turns +X to +Y', C.placeVertices([[1, 0, 0]], [0, 0, 0], 90)[0][1], 1, 1e-12);

console.log(fails ? `${fails} FAILED` : 'all passed');
process.exitCode = fails ? 1 : 0;
