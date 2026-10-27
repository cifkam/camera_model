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
  // Foma's tables are widely reported to overstate the failure by 1-3
  // stops beyond a few seconds (Photrio, FADU and 5x4 forum threads), so they carry reliability 'low'
  // and the user-measured alternatives are listed next to them: Ian Grant's bracketed Fomapan 200 roll
  // (about +1/2 stop at 1 s, +1 stop at 10 s, which he reports for Fomapan 100 as well), Alan Rockwood's
  // camera-as-densitometer fit tc = tm + 0.4 tm^1.7 ('gainer' model: tc = tm + a tm^b), and a 2013
  // large-format forum series on Fomapan 100 (no failure to 4 s, +1 stop at 30-60 s, +2 stops at 2 min).
  // For Fomapan 400 no measurement could be found: only the users' practice of applying HP5+ factors at
  // a lower EI, listed as 'heuristic' (likewise FP4+ factors for Fomapan 100).
  // reliability: 'manufacturer' (data sheet), 'test' (a user's measurement), 'heuristic' (common
  // practice, not measured), 'low' (data sheet contradicted by tests); advice: when to use it.
  const ilford = (name, p) => ({ name: 'Ilford ' + name, maker: 'Ilford', model: 'power', p, threshold: 1,
                                 source: 'Harman reciprocity sheet (2023)', url: 'https://www.ilfordphoto.com/wp/wp-content/uploads/2024/05/Reciprocity-Failure-Compensation-v2.pdf', verified: true,
                                 reliability: 'manufacturer', advice: 'General use.' });
  const FOMA_LOW = 'Upper bound: tests to about 2 min find 1\u20133 stops less failure; a few very long pinhole exposures do match it. If used, pull development 10\u201320 %.';
  const PHOTRIO_FOMA = 'https://www.photrio.com/forum/threads/fomapan-reciprocity-failure.37712/';
  const GFF_FOMA100 = 'https://forum.grossformatfotografie.de/forum/thread/10431-fomapan-100-schwarzschild/';
  const PHOTRIO_FOMA100 = 'https://www.photrio.com/forum/threads/fomapan-100-reciprocity-excessive.215495/';
  const FADU_FOMA = 'https://www.film-and-darkroom-user.org.uk/forum/showthread.php?t=12739';
  const FILMS = [
    ilford('Pan F+', 1.33), ilford('FP4+', 1.26), ilford('HP5+', 1.31), ilford('Delta 100', 1.26), ilford('Delta 400', 1.41),
    ilford('Delta 3200', 1.33), ilford('SFX 200', 1.43), ilford('XP2 Super', 1.31), ilford('Ortho Plus', 1.25),
    { ...ilford('Kentmere 100', 1.26), name: 'Kentmere 100', maker: 'Kentmere' }, { ...ilford('Kentmere 400', 1.30), name: 'Kentmere 400', maker: 'Kentmere' },
    { name: 'Kodak T-Max 100', maker: 'Kodak', model: 'table', noneBelow: 0.1, points: [[1, 2 ** (1 / 3)], [10, 15], [100, 200]],
      source: 'Kodak F-4016 (2016)', url: 'https://business.kodakmoments.com/sites/default/files/files/resources/f4016_TMax_100.pdf', verified: true,
      reliability: 'manufacturer', advice: 'General use; three data-sheet points, interpolated.' },
    { name: 'Kodak T-Max 400', maker: 'Kodak', model: 'table', noneBelow: 1, points: [[10, 10 * 2 ** (1 / 3)], [100, 300]],
      source: 'Kodak F-4043', url: 'https://business.kodakmoments.com/sites/default/files/files/products/f4043_tmax_400.pdf', verified: true,
      reliability: 'manufacturer', advice: 'General use; two data-sheet points, interpolated.' },
    { name: 'Kodak Tri-X 400', maker: 'Kodak', model: 'table', noneBelow: 0.1, points: [[1, 2], [10, 50], [100, 1200]],
      source: 'Kodak F-4017', url: 'https://business.kodakmoments.com/sites/default/files/files/resources/f4017_TriX.pdf', verified: true,
      reliability: 'manufacturer', advice: 'General use; Kodak also says to cut development 10 % per stop of correction.' },
    { name: 'Fomapan 100 (Foma table)', maker: 'Foma', model: 'table', noneBelow: 0.5, points: [[1, 2], [10, 80], [100, 1600]],
      source: 'Foma data sheet', url: 'https://www.foma.cz/en/fomapan-100', verified: true, reliability: 'low', advice: FOMA_LOW },
    { name: 'Fomapan 100 (Ian Grant test)', maker: 'Foma', model: 'table', noneBelow: 0.5, points: [[1, Math.SQRT2], [10, 20]],
      source: 'Photrio / 5x4 forums: low-light tests at half box speed', url: PHOTRIO_FOMA, verified: true,
      reliability: 'test', advice: 'About +\u00bd stop at 1 s, +1 stop at 10 s, reported from memory across posts; a start for 1\u201330 s at EI 50.' },
    { name: 'Fomapan 100 (large-format forum test)', maker: 'Foma', model: 'table', noneBelow: 4, points: [[30, 60], [120, 480]],
      source: 'Grossformatfotografie forum (2013): 9x12 / 8x10 test series', url: GFF_FOMA100, verified: true,
      reliability: 'test', advice: 'Nothing to 4 s, +1 stop around 30\u201360 s, +2 stops at 2 min matched a short reference exposure; readings\u2019 units not stated. Use for 4 s\u20132 min.' },
    { name: 'Fomapan 100 (as FP4+, users\u2019 practice)', maker: 'Foma', model: 'power', p: 1.26, threshold: 1,
      source: 'Photrio: Fomapan 100 reciprocity excessive', url: PHOTRIO_FOMA100, verified: true,
      reliability: 'heuristic', advice: 'Users report the Ilford FP4+ factor at EI 50\u201364 works to a minute or two; not measured. Bracket.' },
    { name: 'Fomapan 200 (Foma table)', maker: 'Foma', model: 'table', noneBelow: 0.5, points: [[1, 3], [10, 90], [100, 1800]],
      source: 'Foma data sheet', url: 'https://www.foma.cz/en/fomapan-200', verified: true, reliability: 'low', advice: FOMA_LOW },
    { name: 'Fomapan 200 (Ian Grant test)', maker: 'Foma', model: 'table', noneBelow: 0.5, points: [[1, Math.SQRT2], [10, 20]],
      source: 'FADU forum: bracketed roll, 1\u201310 s, low daylight', url: FADU_FOMA, verified: true,
      reliability: 'test', advice: 'Measured to 10 s in daylight at EI 100: a good start for 1\u201330 s. Beyond that it is extrapolated.' },
    { name: 'Fomapan 200 (Rockwood fit)', maker: 'Foma', model: 'gainer', a: 0.4, b: 1.7, noneBelow: 0.5,
      source: 'Photrio: camera-as-densitometer test, HC-110 H', url: 'https://www.photrio.com/forum/threads/fomapan-200-film-development-test-results-also-reciprocity.185255/', verified: true,
      reliability: 'test', advice: 'Fit to one user\u2019s densitometer readings; use for 1 s to a few minutes.' },
    { name: 'Fomapan 400 (Foma table)', maker: 'Foma', model: 'table', noneBelow: 0.5, points: [[1, 1.5], [10, 60], [100, 800]],
      source: 'Foma data sheet', url: 'https://www.foma.cz/en/fomapan-400', verified: true, reliability: 'low', advice: FOMA_LOW },
    { name: 'Fomapan 400 (as HP5+, users\u2019 practice)', maker: 'Foma', model: 'power', p: 1.31, threshold: 1,
      source: '5x4.co.uk: Fomapan 200 reciprocity question', url: 'https://www.5x4.co.uk/threads/fomapan-200-reciprocity-question.2835/', verified: true,
      reliability: 'heuristic', advice: 'No measured test of Fomapan 400 was found. Users apply HP5+ factors at EI 250 and found table-based app times 1\u20132 stops too long past 3 s. Bracket.' },
    { name: 'Fujifilm Neopan 100 Acros II', maker: 'Fujifilm', model: 'step', noneBelow: 120, factor: Math.SQRT2, upTo: 1000,
      source: 'Fujifilm data sheet', url: 'https://asset.fujifilm.com/www/us/files/2020-08/ed6acf9a3aeefed477d0f169df7c8457/films_neopan100acros2_120_01.pdf', verified: true,
      reliability: 'manufacturer', advice: 'General use up to 1000 s.' },
  ];
  const filmByName = name => FILMS.find(f => f.name === name);
  // returns { tc, stops, status } with status 'none' (no correction), 'ok', 'extrapolated' or 'nodata'
  function reciprocity(film, tm) {
    const done = (tc, status) => ({ tc, stops: Number.isFinite(tc) ? Math.log2(tc / tm) : NaN, status });
    if (film.model === 'power') return tm <= film.threshold ? done(tm, 'none') : done(Math.pow(tm, film.p), 'ok');
    if (film.model === 'step') return tm < film.noneBelow ? done(tm, 'none') : tm <= film.upTo ? done(tm * film.factor, 'ok') : done(NaN, 'nodata');
    if (film.model === 'none') return tm <= film.upTo ? done(tm, 'none') : done(NaN, 'nodata');
    if (film.model === 'gainer') return tm < (film.noneBelow || 0) ? done(tm, 'none') : done(tm + film.a * Math.pow(tm, film.b), 'ok');   // Gainer's form tc = tm + a tm^b
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

  // --- development time vs temperature ---
  // Ilford's "Film development time/temperature compensation chart" (April 2002; 18–27 °C, 4:00–25:00
  // at 20 °C, entries rounded to 15 s) fitted in log(time) as a quadratic in dT = T − 20 °C by least
  // squares over its 292 entries: mean error 6 s, largest 22 s. Ilford's own example, 8:00 at 20 °C →
  // 5:30 at 24 °C, comes out as 5:29. Outside 18–27 °C the curve is extrapolated.
  // https://www.ilfordphoto.com/wp/wp-content/uploads/2017/03/Temperature-compensation-chart.pdf
  const DEV_TEMP = { a: -0.10295, b: 0.002066, range: [18, 27] };
  // time multiplier relative to 20 °C; 'percent': each degree warmer takes `percent` % off the time
  const devTempFactor = (dT, model = 'ilford', percent = 10) =>
    model === 'percent' ? Math.pow(1 - percent / 100, dT) : Math.exp(DEV_TEMP.a * dT + DEV_TEMP.b * dT * dT);
  // time at temperature `to` (°C) given `time` at `from` (°C): { time, factor, status: 'ok' | 'extrapolated' }.
  // continuous (rotary) agitation takes 15 % off, the rule the Massive Dev Chart's converter applies.
  function devTime(time, from, to, { model = 'ilford', percent = 10, continuous = false } = {}) {
    const factor = devTempFactor(to - 20, model, percent) / devTempFactor(from - 20, model, percent) * (continuous ? 0.85 : 1);
    const inRange = T => model !== 'ilford' || (T >= DEV_TEMP.range[0] - 1e-9 && T <= DEV_TEMP.range[1] + 1e-9);
    return { time: time * factor, factor, status: inRange(from) && inRange(to) ? 'ok' : 'extrapolated' };
  }

  // Scheimpflug: lens tilt (rad) that puts the hinge line at distance J below the lens
  const tiltForHinge = (f, J) => Math.asin(f / J);
  const hingeDistance = (f, tiltRad) => f / Math.sin(tiltRad);

  const Optics = { FORMATS, IMAGE_CIRCLE, APERTURES, diagonal, cocFromPrint, hyperfocal, dof, extensionFor,
                   subjectFor, bellows, angleOfView, focusSpread, tiltForHinge, hingeDistance,
                   measure, cropFactor, equivalentFocal, equivalentAperture, anglesOfView, sceneCoverage,
                   FILMS, filmByName, reciprocity, DEV_TEMP, devTempFactor, devTime };
  root.Optics = Optics;
  if (typeof module !== 'undefined' && module.exports) module.exports = Optics;
})(typeof globalThis !== 'undefined' ? globalThis : this);
