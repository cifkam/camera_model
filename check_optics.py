"""Independent numeric cross-check of the optics used in 3D/index.html (and calculators/optics.js).

The page computes the plane of sharp focus (PoSF) by pushing the film plane
through the thin-lens projective map  (x, y, z, 1) -> (f x, f y, f z, z + f)
in lens coordinates. This script checks that result against:

  1. brute force: individual film points mapped with the thin-lens equation
     land on the predicted plane,
  2. the Scheimpflug rule: film plane, lens plane and PoSF share a line,
  3. the hinge rule: PoSF, the front focal plane and the plane through the
     lens centre parallel to the film share a line, at distance J = f / sin(alpha),
  4. the untilted case reduces to 1/s + 1/s' = 1/f.

Run:  uv run python check_optics.py
"""
import numpy as np

rng = np.random.default_rng(0)


def rot_x(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def rot_y(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def plane_of_sharp_focus(Cl, Rl, Cr, Rr, f):
    """Plane (n, d) with n.p + d = 0, in world coords. Same algebra as 3D/index.html."""
    u, v, n = Rl[:, 0], Rl[:, 1], Rl[:, 2]
    nr = Rr[:, 2]
    rel = Cr - Cl
    a, b, c = nr @ u, nr @ v, nr @ n
    d = -(a * (rel @ u) + b * (rel @ v) + c * (rel @ n))
    a2, b2, c2, d2 = a * f, b * f, c * f - d, d * f
    nw = a2 * u + b2 * v + c2 * n
    return nw, d2 - nw @ Cl


def conjugate_point(P, Cl, Rl, f):
    """Thin-lens image of a film-side point P (world coords): undeviated through the centre."""
    n = Rl[:, 2]
    d_i = -(P - Cl) @ n                     # image distance along the axis (positive behind lens)
    d_o = f * d_i / (d_i - f)
    return Cl - (d_o / d_i) * (P - Cl)


def plane_line(n1, d1, n2, d2):
    direc = np.cross(n1, n2)
    L2 = direc @ direc
    h1, h2 = -d1, -d2
    p = (h1 * np.cross(n2, direc) + h2 * np.cross(direc, n1)) / L2
    return p, direc / np.sqrt(L2)


def dist_point_line(q, p, direc):
    return np.linalg.norm(np.cross(q - p, direc))


def check(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    return cond


ok = True
for trial in range(200):
    f = rng.uniform(0.05, 0.4)
    ext = rng.uniform(f * 1.05, f * 2.5)
    Cr = np.array([0.0, 1.2, 0.0]) + rng.normal(0, 0.03, 3)
    Cl = np.array([0.0, 1.2, ext]) + rng.normal(0, 0.03, 3)
    Rr = rot_y(np.radians(rng.uniform(-30, 30))) @ rot_x(np.radians(rng.uniform(-30, 30)))
    Rl = rot_y(np.radians(rng.uniform(-30, 30))) @ rot_x(np.radians(rng.uniform(-30, 30)))

    n_posf, d_posf = plane_of_sharp_focus(Cl, Rl, Cr, Rr, f)
    scale = np.linalg.norm(n_posf)
    n_posf, d_posf = n_posf / scale, d_posf / scale

    # 1. brute force: random film points -> conjugate points lie on the PoSF
    for _ in range(5):
        P = Cr + Rr[:, 0] * rng.uniform(-0.06, 0.06) + Rr[:, 1] * rng.uniform(-0.05, 0.05)
        Q = conjugate_point(P, Cl, Rl, f)
        resid = abs(n_posf @ Q + d_posf) / max(1.0, np.linalg.norm(Q))
        ok &= resid < 1e-9

    # 2. Scheimpflug: film ∩ lens line lies on the PoSF
    nr, nl = Rr[:, 2], Rl[:, 2]
    p, direc = plane_line(nr, -nr @ Cr, nl, -nl @ Cl)
    for t in (-3, 0, 3):
        ok &= abs(n_posf @ (p + t * direc) + d_posf) < 1e-9

    # 3. hinge rule
    n_ff, d_ff = nl, -(nl @ (Cl + f * nl))           # front focal plane
    hp, hd = plane_line(n_posf, d_posf, n_ff, d_ff)
    for t in (-3, 0, 3):                              # on the parallel-to-film plane through the lens centre
        ok &= abs(nr @ (hp + t * hd - Cl)) < 1e-9
    alpha = np.arccos(abs(nl @ nr))
    J = dist_point_line(Cl, hp, hd)
    ok &= abs(J - f / np.sin(alpha)) < 1e-9 * max(1, J)

check(ok, "200 random tilt/swing/shift configurations: brute force, Scheimpflug and hinge rules")

# 4. untilted camera: classic thin-lens conjugates
f, s = 0.150, 0.160
Cr, Cl, I = np.zeros(3), np.array([0, 0, s]), np.eye(3)
n, d = plane_of_sharp_focus(Cl, I, Cr, I, f)
z_focus = -d / n[2] - s * 0 if abs(n[2]) > 0 else np.inf
ok2 = check(abs(z_focus - (s + f * s / (s - f))) < 1e-12 and abs(n[0]) < 1e-12 and abs(n[1]) < 1e-12,
            f"untilted f=150 mm, extension 160 mm -> focus {z_focus - s:.3f} m in front of lens (expected 2.400)")


# --- depth of field -----------------------------------------------------------
def focus_interval(film_n, film_d, f, k, r):
    """In-focus [t_near, t_far] along unit ray r from the lens centre (lens coords). Same as 3D/index.html."""
    nr = film_n @ r
    alpha, beta = film_d * r[2] / (f * nr), -film_d / nr
    w0, w1 = sorted([(1 - k - alpha) / beta, (1 + k - alpha) / beta])
    w0 = max(w0, 0.0)
    if w1 <= 0 or w0 > w1:
        return None
    return 1 / w1, (1 / w0 if w0 > 0 else np.inf)


# 5. untilted: matches the textbook thin-lens DoF formulas with H = f^2/(N c) + f
f, N, c = 0.150, 22.0, 0.1e-3
k = c * N / f
H = f * f / (N * c) + f
ok3 = True
for u in (0.5, 1.0, 2.4, 5.0, 8.0):          # focus distance from the lens
    v = f * u / (u - f)                       # film distance
    film_n, film_d = np.array([0, 0, 1.0]), v  # film plane z = -v  ->  z + v = 0
    near, far = focus_interval(film_n, film_d, f, k, np.array([0, 0, 1.0]))
    near_ref = u * (H - f) / (H + u - 2 * f)
    far_ref = u * (H - f) / (H - u) if u < H else np.inf
    ok3 &= abs(near - near_ref) < 1e-9 and (np.isinf(far) and np.isinf(far_ref) or abs(far - far_ref) < 1e-9)
check(ok3, f"untilted DoF at f/{N:g}, c = {c*1e3:g} mm matches textbook near/far (H = {H:.2f} m)")

# 6. tilted: per-ray near/far points lie on the limit planes, and both limit planes pass
#    through the hinge line (Merklinger's wedge)
ok4 = True
for trial in range(100):
    f = rng.uniform(0.09, 0.3)
    Rl = rot_y(np.radians(rng.uniform(-20, 20))) @ rot_x(np.radians(rng.uniform(-20, 20)))
    Rr = rot_y(np.radians(rng.uniform(-20, 20))) @ rot_x(np.radians(rng.uniform(-20, 20)))
    Cl = np.array([0.0, 1.2, rng.uniform(1.1, 1.6) * f])
    Cr = np.array([0.0, 1.2, 0.0])
    k = rng.uniform(0.002, 0.08)

    # film plane in lens coordinates
    nr_w = Rr[:, 2]
    film_n = Rl.T @ nr_w
    film_d = -(film_n @ (Rl.T @ (Cr - Cl)))

    def image_plane(d_l):
        a, b, cc = film_n
        nw = Rl @ np.array([a * f, b * f, cc * f - d_l])
        return nw, d_l * f - nw @ Cl

    n_posf, d_posf = image_plane(film_d)
    n_near, d_near = image_plane(film_d / (1 - k))
    n_far, d_far = image_plane(film_d / (1 + k))

    for _ in range(5):
        r = Rl.T @ (Cl - (Cr + Rr[:, 0] * rng.uniform(-0.06, 0.06) + Rr[:, 1] * rng.uniform(-0.05, 0.05)))
        r /= np.linalg.norm(r)
        iv = focus_interval(film_n, film_d, f, k, r)
        if iv is None:
            continue
        for t, (n_, d_) in ((iv[0], (n_near, d_near)), (iv[1], (n_far, d_far))):
            if np.isfinite(t):
                q = Cl + t * (Rl @ r)
                ok4 &= abs(n_ @ q + d_) < 1e-9 * max(1, np.linalg.norm(n_) * np.linalg.norm(q))

    nl = Rl[:, 2]
    hp, hd = plane_line(n_posf, d_posf, nl, -(nl @ (Cl + f * nl)))   # hinge line
    for t in (-2, 0, 2):
        q = hp + t * hd
        ok4 &= abs(n_near @ q + d_near) < 1e-9 * np.linalg.norm(n_near) * max(1, np.linalg.norm(q))
        ok4 &= abs(n_far @ q + d_far) < 1e-9 * np.linalg.norm(n_far) * max(1, np.linalg.norm(q))
check(ok4, "100 tilted configurations: per-ray DoF ends lie on the limit planes, limit planes pass through the hinge line")

raise SystemExit(0 if ok and ok2 and ok3 and ok4 else 1)
