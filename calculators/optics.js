// Photographic optics helpers (thin-lens model). Distances in mm unless stated.
// Works as a classic browser script (window.Optics) and as a Node module (require('./optics.js')).
(function (root) {
  'use strict';

  // image area w × h in mm, largest first (roll-film sizes are nominal cm, sheet-film sizes are inches)
  const FORMATS = {
    '8x10"': [245, 195], '5x7"': [170, 120], '4x5"': [120, 95],
    '6x9 roll': [84, 56], '6x7 roll': [69.5, 56], '6x6 roll': [56, 56], '6x4.5 roll': [56, 41.5], '35 mm': [36, 24],
    'APS-C': [23.5, 15.6], 'phone 1/1.56"': [8.2, 6.2],
  };
  // typical image circle (mm at infinity) of a lens made for the format
  const IMAGE_CIRCLE = { '8x10"': 420, '5x7"': 300, '4x5"': 220, '6x9 roll': 125, '6x7 roll': 100, '6x6 roll': 90,
                         '6x4.5 roll': 80, '35 mm': 45, 'APS-C': 30, 'phone 1/1.56"': 11 };
  const APERTURES = [1, 1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22, 32, 45, 64, 90];

  const diagonal = fmt => Math.hypot(...FORMATS[fmt]);

  // Circle of confusion on film from the print: tolerable blur on the print (viewing distance / eye
  // resolution, eyeRes in 1/rad e.g. 1500) divided by the enlargement from the film's long edge.
  function cocFromPrint(fmt, printLongCm, viewDistCm, eyeRes) {
    const enlargement = printLongCm * 10 / FORMATS[fmt][0];
    const printBlur = viewDistCm * 10 / eyeRes;
    return { coc: printBlur / enlargement, enlargement, printBlur };
  }

  // hyperfocal distance measured from the lens
  const hyperfocal = (f, N, c) => f * f / (N * c) + f;

  // Depth of field for a subject at distance s from the lens (thin lens, blur = N-independent
  // aperture cone cut by the film: blur <= c). Returns distances from the lens; far may be Infinity.
  function dof(f, N, c, s) {
    const H = hyperfocal(f, N, c);
    if (!(s > f)) return { H, near: NaN, far: NaN, total: NaN, mag: NaN, front: NaN, behind: NaN };
    const near = s * (H - f) / (H + s - 2 * f);
    const far = s < H ? s * (H - f) / (H - s) : Infinity;
    return { H, near, far, total: far - near, mag: f / (s - f), front: s - near, behind: far - s };
  }

  // image distance (lens to film) that focuses a subject at distance s
  const extensionFor = (f, s) => f * s / (s - f);
  // subject distance focused by an image distance v
  const subjectFor = (f, v) => f * v / (v - f);

  // magnification -> exposure factor for bellows extension
  const bellows = m => ({ factor: (1 + m) ** 2, stops: 2 * Math.log2(1 + m) });

  // angle of view (rad) of a gate edge of length `size` at image distance v
  const angleOfView = (size, v) => 2 * Math.atan(size / (2 * v));

  // Focus spread (view cameras): rail travel `delta` between near and far focus. Set the standard
  // halfway; the aperture that covers it geometrically is delta / (2c). Hansma's rule balances
  // defocus against diffraction: N = sqrt(375 * delta) with delta in mm.
  const focusSpread = (delta, c) => ({ geometric: delta / (2 * c), hansma: Math.sqrt(375 * delta) });

  // Formats and equivalence. `ref` is the dimension compared: 'diagonal' (the usual crop factor),
  // 'width' (long edge) or 'height' (short edge), since aspect ratios differ between formats.
  const measure = (fmt, ref = 'diagonal') => ref === 'width' ? FORMATS[fmt][0] : ref === 'height' ? FORMATS[fmt][1] : diagonal(fmt);
  // crop factor of a format relative to a base format (35 mm by default): > 1 for smaller formats
  const cropFactor = (fmt, ref = 'diagonal', base = '35 mm') => measure(base, ref) / measure(fmt, ref);
  // focal length on format `to` with the same angle of view (in the reference dimension) as f on `from`
  const equivalentFocal = (f, from, to, ref = 'diagonal') => f * measure(to, ref) / measure(from, ref);
  // f-number on `to` giving the same depth of field and the same blur as N on `from`, for the same
  // framing and the same print size (the entrance pupil f/N stays the same)
  const equivalentAperture = (N, from, to, ref = 'diagonal') => N * measure(to, ref) / measure(from, ref);
  // angles of view (rad) of focal length f on a format, lens focused at infinity
  const anglesOfView = (fmt, f) => ({ h: angleOfView(FORMATS[fmt][0], f), v: angleOfView(FORMATS[fmt][1], f), d: angleOfView(diagonal(fmt), f) });
  // scene width and height (mm) covered by the gate at subject distance s (mm): object size =
  // image size × (s − f) / f, from the thin-lens magnification
  const sceneCoverage = (fmt, f, s) => ({ width: FORMATS[fmt][0] * (s - f) / f, height: FORMATS[fmt][1] * (s - f) / f });

  // Scheimpflug: lens tilt (rad) that puts the hinge line at distance J below the lens
  const tiltForHinge = (f, J) => Math.asin(f / J);
  const hingeDistance = (f, tiltRad) => f / Math.sin(tiltRad);

  const Optics = { FORMATS, IMAGE_CIRCLE, APERTURES, diagonal, cocFromPrint, hyperfocal, dof, extensionFor,
                   subjectFor, bellows, angleOfView, focusSpread, tiltForHinge, hingeDistance,
                   measure, cropFactor, equivalentFocal, equivalentAperture, anglesOfView, sceneCoverage };
  root.Optics = Optics;
  if (typeof module !== 'undefined' && module.exports) module.exports = Optics;
})(typeof globalThis !== 'undefined' ? globalThis : this);
