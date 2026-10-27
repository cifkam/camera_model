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

  // Reciprocity failure (Schwarzschild effect): the corrected exposure time tc for a metered time tm.
  // Models: 'power' tc = tm^p above a threshold (Ilford's method); 'table' points from a data sheet,
  // interpolated in log-log and extrapolated beyond the last point with its slope; 'step' a fixed
  // factor between two times; 'none' no correction up to a time and no data beyond it.
  // Sources: Harman "Film Reciprocity Failure Compensation" (Dec 2023) for the Ilford / Kentmere
  // factors (its example: HP5+ 10 s -> 20.4 s); Kodak F-4016 (T-Max 100), F-4043 (T-Max 400),
  // F-4017 (Tri-X) "Adjustments for Long and Short Exposures"; Foma data sheets ("Schwarzschild
  // effect", lengthening of exposure 1 s / 10 s / 100 s); Fujifilm Neopan 100 Acros II data sheet;
  // Kodak E-4050 (Portra 400) and E-4046 (Ektar 100): "no compensation from 1/10,000 s to 1 s, for
  // longer exposures make tests".
  const ilford = (name, p) => ({ name: 'Ilford ' + name, maker: 'Ilford', model: 'power', p, threshold: 1,
                                 source: 'Harman reciprocity sheet (2023)', url: 'https://www.ilfordphoto.com/wp/wp-content/uploads/2024/05/Reciprocity-Failure-Compensation-v2.pdf', verified: true });
  const FILMS = [
    ilford('Pan F+', 1.33), ilford('FP4+', 1.26), ilford('HP5+', 1.31), ilford('Delta 100', 1.26), ilford('Delta 400', 1.41),
    ilford('Delta 3200', 1.33), ilford('SFX 200', 1.43), ilford('XP2 Super', 1.31), ilford('Ortho Plus', 1.25),
    { ...ilford('Kentmere 100', 1.26), name: 'Kentmere 100', maker: 'Kentmere' }, { ...ilford('Kentmere 400', 1.30), name: 'Kentmere 400', maker: 'Kentmere' },
    { name: 'Kodak T-Max 100', maker: 'Kodak', model: 'table', noneBelow: 0.1, points: [[1, 2 ** (1 / 3)], [10, 15], [100, 200]],
      source: 'Kodak F-4016 (2016)', url: 'https://business.kodakmoments.com/sites/default/files/files/resources/f4016_TMax_100.pdf', verified: true },
    { name: 'Kodak T-Max 400', maker: 'Kodak', model: 'table', noneBelow: 1, points: [[10, 10 * 2 ** (1 / 3)], [100, 300]],
      source: 'Kodak F-4043', url: 'https://business.kodakmoments.com/sites/default/files/files/products/f4043_tmax_400.pdf', verified: true },
    { name: 'Kodak Tri-X 400', maker: 'Kodak', model: 'table', noneBelow: 0.1, points: [[1, 2], [10, 50], [100, 1200]],
      source: 'Kodak F-4017', url: 'https://business.kodakmoments.com/sites/default/files/files/resources/f4017_TriX.pdf', verified: true },
    { name: 'Fomapan 100', maker: 'Foma', model: 'table', noneBelow: 0.5, points: [[1, 2], [10, 80], [100, 1600]],
      source: 'Foma data sheet', url: 'https://www.foma.cz/en/fomapan-100', verified: true },
    { name: 'Fomapan 200', maker: 'Foma', model: 'table', noneBelow: 0.5, points: [[1, 3], [10, 90], [100, 1800]],
      source: 'Foma data sheet', url: 'https://www.foma.cz/en/fomapan-200', verified: true },
    { name: 'Fomapan 400', maker: 'Foma', model: 'table', noneBelow: 0.5, points: [[1, 1.5], [10, 60], [100, 800]],
      source: 'Foma data sheet', url: 'https://www.foma.cz/en/fomapan-400', verified: true },
    { name: 'Fujifilm Neopan 100 Acros II', maker: 'Fujifilm', model: 'step', noneBelow: 120, factor: Math.SQRT2, upTo: 1000,
      source: 'Fujifilm data sheet', url: 'https://asset.fujifilm.com/www/us/files/2020-08/ed6acf9a3aeefed477d0f169df7c8457/films_neopan100acros2_120_01.pdf', verified: true },
    { name: 'Kodak Portra 400', maker: 'Kodak', model: 'none', upTo: 1, source: 'Kodak E-4050 ("make tests" beyond 1 s)', url: 'https://business.kodakmoments.com/sites/default/files/files/products/e4050_portra_400.pdf', verified: true },
    { name: 'Kodak Ektar 100', maker: 'Kodak', model: 'none', upTo: 1, source: 'Kodak E-4046 ("make tests" beyond 1 s)', url: 'https://business.kodakmoments.com/sites/default/files/files/products/e4046_ektar_100.pdf', verified: true },
  ];
  const filmByName = name => FILMS.find(f => f.name === name);
  // returns { tc, stops, status } with status 'none' (no correction), 'ok', 'extrapolated' or 'nodata'
  function reciprocity(film, tm) {
    const done = (tc, status) => ({ tc, stops: Number.isFinite(tc) ? Math.log2(tc / tm) : NaN, status });
    if (film.model === 'power') return tm <= film.threshold ? done(tm, 'none') : done(Math.pow(tm, film.p), 'ok');
    if (film.model === 'step') return tm < film.noneBelow ? done(tm, 'none') : tm <= film.upTo ? done(tm * film.factor, 'ok') : done(NaN, 'nodata');
    if (film.model === 'none') return tm <= film.upTo ? done(tm, 'none') : done(NaN, 'nodata');
    // table: log-log interpolation from the last "no correction" time through the data points
    if (tm <= film.noneBelow) return done(tm, 'none');
    const pts = [[film.noneBelow, film.noneBelow], ...film.points];
    let i = pts.findIndex(p => p[0] >= tm);
    const extrapolated = i < 0;
    if (extrapolated) i = pts.length - 1;
    const [t0, c0] = pts[i - 1], [t1, c1] = pts[i];
    const u = (Math.log(tm) - Math.log(t0)) / (Math.log(t1) - Math.log(t0));
    return done(Math.exp(Math.log(c0) + u * (Math.log(c1) - Math.log(c0))), extrapolated ? 'extrapolated' : 'ok');
  }

  // Scheimpflug: lens tilt (rad) that puts the hinge line at distance J below the lens
  const tiltForHinge = (f, J) => Math.asin(f / J);
  const hingeDistance = (f, tiltRad) => f / Math.sin(tiltRad);

  const Optics = { FORMATS, IMAGE_CIRCLE, APERTURES, diagonal, cocFromPrint, hyperfocal, dof, extensionFor,
                   subjectFor, bellows, angleOfView, focusSpread, tiltForHinge, hingeDistance,
                   measure, cropFactor, equivalentFocal, equivalentAperture, anglesOfView, sceneCoverage,
                   FILMS, filmByName, reciprocity };
  root.Optics = Optics;
  if (typeof module !== 'undefined' && module.exports) module.exports = Optics;
})(typeof globalThis !== 'undefined' ? globalThis : this);
