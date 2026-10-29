// Thin lens and defocus: pure maths, no DOM, so it runs under node too. A classic script like camera.js: in the
// browser it defines the global Lens, under node it is require('./lens.js').
//
// All lengths in millimetres. The lens sits at the camera centre, its axis along the camera's z.
//   1/f = 1/z + 1/v                     a point at depth z (in front) is sharp at the image distance v behind
//   A = f / N                           the aperture diameter at f-number N
//   c = A |v_s − v_z| / v_z             the blur circle on a sensor at v_s of a point imaged sharp at v_z
// The light from the point fills a cone from the aperture to its sharp image (and on past it); every plane
// across the axis cuts that cone in a circle, centred on the chief ray (the ray through the lens centre).

(function (root) {
  'use strict';

  // where a point at depth z comes to focus; Infinity at z = f, and no real image nearer than that
  const imageDistance = (f, z) => z > f ? f * z / (z - f) : Infinity;
  // the depth that comes to focus on a sensor at v (the inverse); Infinity once v ≤ f
  const focusDistance = (f, v) => v > f ? f * v / (v - f) : Infinity;
  const aperture = (f, N) => f / N;

  // the diameter of the cone of light from a point at depth z, at a distance d behind the lens
  function coneDiameter(f, N, z, d) {
    const vz = imageDistance(f, z);
    return aperture(f, N) * Math.abs(1 - d / vz);
  }
  // the blur circle on a sensor at v_s: the cone's cross-section there
  const blurDiameter = (f, N, vs, z) => coneDiameter(f, N, z, vs);

  // depth of field for an acceptable blur c, focused at s
  function hyperfocal(f, N, c) { return f * f / (N * c) + f; }
  function depthOfField(f, N, c, s) {
    const H = hyperfocal(f, N, c);
    return { H, near: s * (H - f) / (H + s - 2 * f), far: s < H ? s * (H - f) / (H - s) : Infinity };
  }

  const Lens = { imageDistance, focusDistance, aperture, coneDiameter, blurDiameter, hyperfocal, depthOfField };
  root.Lens = Lens;
  if (typeof module !== 'undefined' && module.exports) module.exports = Lens;
})(typeof globalThis !== 'undefined' ? globalThis : this);
