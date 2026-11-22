const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0), norm = a => Math.hypot(...a);
const mv = (A, x) => A.map(row => dot(row, x));

export function direct(A, b) {
    let a = A.map((row, i) => [...row, b[i]]), n = b.length;
    for (let k = 0; k < n; k++) {
        let p = k;
        for (let i = k + 1; i < n; i++)
            if (Math.abs(a[i][k]) > Math.abs(a[p][k])) p = i;
        if (Math.abs(a[p][k]) < 1e-20)
            throw Error('El sistema es singular.');[a[k], a[p]] = [a[p], a[k]];
        for (let i = k + 1; i < n; i++) {
            let f = a[i][k] / a[k][k];
            for (let j = k; j <= n; j++)a[i][j] -= f * a[k][j]
        }
    } let x = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let v = a[i][n];
        for (let j = i + 1; j < n; j++)v -= a[i][j] * x[j]; x[i] = v / a[i][i]
    } return x
}
function condition(A) {
    let a = A.map(r => r.slice()), n = a.length;
    for (let k = 0; k < 100; k++) {
        let p = 0, q = 1;
        for (let i = 0; i < n; i++)for (let j = i + 1; j < n; j++)
            if (Math.abs(a[i][j]) > Math.abs(a[p][q])) [p, q] = [i, j];
        if (Math.abs(a[p][q]) < 1e-15) break; let theta = .5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]), c = Math.cos(theta), s = Math.sin(theta), app = a[p][p], aqq = a[q][q], apq = a[p][q];
        for (let i = 0; i < n; i++)if (i !== p && i !== q) { let x = a[i][p], y = a[i][q]; a[i][p] = a[p][i] = c * x - s * y; a[i][q] = a[q][i] = s * x + c * y } a[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq; a[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq; a[p][q] = a[q][p] = 0
    } let eig = a.map((r, i) => r[i]);
    return Math.max(...eig) / Math.min(...eig)
}

export function simulate({ y0, y1, y2, bias, threshold, tolerance, scenario }) { let times = scenario === 'mal' ? [0, .02, .04] : [0, 1, 2], observations = [y0, y1, y2, bias]; if (!observations.concat([threshold, tolerance]).every(Number.isFinite) || tolerance < 1e-10 || tolerance > .1) throw Error('Introduce números válidos y una tolerancia entre 10⁻¹⁰ y 0,1.'); let C = times.map(t => [1, t, t * t, 1]); C.push([0, 0, 0, 1]); let A = Array.from({ length: 4 }, (_, i) => Array.from({ length: 4 }, (_, j) => C.reduce((s, r) => s + r[i] * r[j], 0))), b = Array.from({ length: 4 }, (_, i) => C.reduce((s, r, k) => s + r[i] * observations[k], 0)), ref = direct(C, observations), results = []; function record(name, x, it, history = []) { let residual = norm(mv(A, x).map((v, i) => v - b[i])), error = norm(x.map((v, i) => v - ref[i])); results.push({ name, x, it, residual, error, relativeError: norm(ref) === 0 ? null : error / norm(ref), history, converged: Number.isFinite(residual) && residual <= tolerance }) } record('LU (pivoteo)', direct(A, b), 0); for (const name of ['Jacobi', 'Gauss-Seidel']) { let x = [0, 0, 0, 0], it = 0, history = []; for (; it < 1000; it++) { let old = x.slice(); for (let i = 0; i < 4; i++) { let sum = 0; for (let j = 0; j < 4; j++)if (j !== i) sum += A[i][j] * (name === 'Jacobi' ? old[j] : x[j]); x[i] = (b[i] - sum) / A[i][i] } if (!x.every(Number.isFinite)) { it++; break } let residual = norm(mv(A, x).map((v, i) => v - b[i])), error = norm(x.map((v, i) => v - ref[i])); if (!Number.isFinite(residual) || !Number.isFinite(error)) { it++; break } history.push({ iteration: it + 1, x: x.slice(), residual, error }); if (residual <= tolerance) { it++; break } } record(name, x, it, history) } let x = [0, 0, 0, 0], r = b.slice(), p = r.slice(), rr = dot(r, r), it = 0, history = []; while (it < 1000 && Math.sqrt(rr) > tolerance) { let Ap = mv(A, p), den = dot(p, Ap); if (!Number.isFinite(den) || den <= 0) break; let step = rr / den; x = x.map((v, i) => v + step * p[i]); r = r.map((v, i) => v - step * Ap[i]); let next = dot(r, r); p = r.map((v, i) => v + (next / rr) * p[i]); rr = next; it++; history.push({ iteration: it, x: x.slice(), residual: norm(mv(A, x).map((v, i) => v - b[i])), error: norm(x.map((v, i) => v - ref[i])) }) } record('Gradiente conjugado', x, it, history); let [d, a, beta] = ref, delta = threshold - d, crossing = null; if (delta <= 0) crossing = 0; else if (beta > 0 && a >= 0) crossing = 2 * delta / (a + Math.sqrt(a * a + 4 * beta * delta)); else if (beta === 0 && a > 0) crossing = delta / a; return { ref, results, condition: condition(A), crossing, times, A, b } }

// ═════════════════════════════════════════════════════════════════════════════
// SIMTELE-RISK — Funciones numéricas Semana 2 (agregadas a math.js)
// ═════════════════════════════════════════════════════════════════════════════

// ---------- Errores ----------
export function absError(approx, exact) {
  return Math.abs(approx - exact);
}
export function relError(approx, exact) {
  if (!Number.isFinite(exact) || Math.abs(exact) < 1e-300) return null;
  return absError(approx, exact) / Math.abs(exact);
}
export function pctError(approx, exact) {
  const e = relError(approx, exact);
  return e === null ? null : e * 100;
}
export function residualNorm(A, x, b) {
  const n = b.length;
  const r = new Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) sum += A[i][j] * x[j];
    r[i] = sum - b[i];
  }
  return norm(r);
}
export function sensitivity(xOriginal, xPerturbed) {
  return norm(xPerturbed.map((v, i) => v - xOriginal[i]));
}
export function isFiniteResult(v) {
  return Number.isFinite(v);
}

// ---------- Raíces ----------
export function bisection(f, a, b, { tol = 1e-6, maxIter = 1000 } = {}) {
  let fa = f(a);
  let fb = f(b);
  if (!Number.isFinite(fa) || !Number.isFinite(fb)) {
    return { root: null, iterations: 0, converged: false, reason: 'f no definida en los extremos', history: [] };
  }
  if (fa === 0) return { root: a, iterations: 0, converged: true, history: [{ iteration: 0, a, b, c: a, fc: fa }] };
  if (fb === 0) return { root: b, iterations: 0, converged: true, history: [{ iteration: 0, a, b, c: b, fc: fb }] };
  if (fa * fb > 0) {
    return { root: null, iterations: 0, converged: false, reason: 'No hay cambio de signo en [a, b]', history: [] };
  }
  let c = a;
  const history = [];
  for (let i = 1; i <= maxIter; i++) {
    c = (a + b) / 2;
    const fc = f(c);
    if (!Number.isFinite(fc)) {
      history.push({ iteration: i, a, b, c, fc });
      return { root: c, iterations: i, converged: false, reason: 'f no definida en punto medio', history };
    }
    history.push({ iteration: i, a, b, c, fc });
    if (fc === 0 || Math.abs(b - a) / 2 < tol) {
      return { root: c, iterations: i, converged: true, history };
    }
    if (fa * fc < 0) { b = c; fb = fc; } else { a = c; fa = fc; }
  }
  return { root: c, iterations: maxIter, converged: false, history };
}
export function newton(f, fPrime, x0, { tol = 1e-6, maxIter = 1000 } = {}) {
  let x = x0;
  const history = [];
  for (let i = 1; i <= maxIter; i++) {
    const fx = f(x);
    const fpx = fPrime(x);
    if (!Number.isFinite(fx) || !Number.isFinite(fpx)) {
      history.push({ iteration: i, x, fx, fpx });
      return { root: x, iterations: i, converged: false, reason: 'f o f′ no definidas', history };
    }
    if (Math.abs(fpx) < 1e-200) {
      history.push({ iteration: i, x, fx, fpx });
      return { root: x, iterations: i, converged: false, reason: 'Derivada cercana a cero', history };
    }
    const xNew = x - fx / fpx;
    if (!Number.isFinite(xNew)) {
      history.push({ iteration: i, x, fx, fpx });
      return { root: x, iterations: i, converged: false, reason: 'Desbordamiento numérico', history };
    }
    history.push({ iteration: i, x, fx, fpx });
    if (Math.abs(xNew - x) < tol) {
      return { root: xNew, iterations: i, converged: true, history };
    }
    x = xNew;
  }
  return { root: x, iterations: maxIter, converged: false, history };
}
export function secant(f, x0, x1, { tol = 1e-6, maxIter = 1000 } = {}) {
  let xPrev = x0;
  let xCurr = x1;
  const history = [];
  for (let i = 1; i <= maxIter; i++) {
    const fPrev = f(xPrev);
    const fCurr = f(xCurr);
    if (!Number.isFinite(fPrev) || !Number.isFinite(fCurr)) {
      history.push({ iteration: i, xPrev, xCurr, fPrev, fCurr });
      return { root: xCurr, iterations: i, converged: false, reason: 'f no definida en puntos de partida', history };
    }
    const denom = fCurr - fPrev;
    if (Math.abs(denom) < 1e-200) {
      history.push({ iteration: i, xPrev, xCurr, fPrev, fCurr });
      return { root: xCurr, iterations: i, converged: false, reason: 'Diferencia de f cercana a cero', history };
    }
    const xNew = xCurr - (fCurr * (xCurr - xPrev)) / denom;
    if (!Number.isFinite(xNew)) {
      history.push({ iteration: i, xPrev, xCurr, fPrev, fCurr });
      return { root: xCurr, iterations: i, converged: false, reason: 'Desbordamiento numérico', history };
    }
    history.push({ iteration: i, xPrev, xCurr, fPrev, fCurr });
    if (Math.abs(xNew - xCurr) < tol) {
      return { root: xNew, iterations: i, converged: true, history };
    }
    xPrev = xCurr;
    xCurr = xNew;
  }
  return { root: xCurr, iterations: maxIter, converged: false, history };
}

// ---------- Interpolación ----------
export function lagrange(nodes, values, x) {
  const n = nodes.length;
  let result = 0;
  for (let i = 0; i < n; i++) {
    let term = values[i];
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      term *= (x - nodes[j]) / (nodes[i] - nodes[j]);
    }
    result += term;
  }
  return result;
}
export function newtonDividedDiff(nodes, values, x) {
  const n = nodes.length;
  const dd = [];
  for (let i = 0; i < n; i++) dd[i] = [values[i]];
  for (let j = 1; j < n; j++) {
    for (let i = 0; i < n - j; i++) {
      dd[i][j] = (dd[i + 1][j - 1] - dd[i][j - 1]) / (nodes[i + j] - nodes[i]);
    }
  }
  const coeffs = dd.map((row) => row[row.length - 1]);
  let result = coeffs[0];
  let prod = 1;
  for (let k = 1; k < n; k++) {
    prod *= x - nodes[k - 1];
    result += coeffs[k] * prod;
  }
  return result;
}
function cubicSplineCoefficients(nodes, values) {
  const n = nodes.length;
  if (n < 2) throw new Error('Se necesitan al menos 2 nodos');
  const h = [];
  for (let i = 0; i < n - 1; i++) h[i] = nodes[i + 1] - nodes[i];
  const M = new Array(n).fill(0);
  const alpha = new Array(n).fill(0);
  const l = new Array(n).fill(1);
  const mu = new Array(n).fill(0);
  const z = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    alpha[i] = (3 / h[i]) * (values[i + 1] - values[i]) - (3 / h[i - 1]) * (values[i] - values[i - 1]);
  }
  for (let i = 1; i < n - 1; i++) {
    l[i] = 2 * (nodes[i + 1] - nodes[i - 1]) - h[i - 1] * mu[i - 1];
    if (Math.abs(l[i]) < 1e-200) throw new Error('Sistema de spline singular');
    mu[i] = h[i] / l[i];
    z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
  }
  l[n - 1] = 1;
  z[n - 1] = 0;
  M[n - 1] = 0;
  for (let i = n - 2; i >= 0; i--) {
    M[i] = z[i] - mu[i] * M[i + 1];
  }
  return M;
}
export function cubicSpline(nodes, values, x) {
  const n = nodes.length;
  const M = cubicSplineCoefficients(nodes, values);
  const h = [];
  for (let i = 0; i < n - 1; i++) h[i] = nodes[i + 1] - nodes[i];
  let klo = 0;
  let khi = n - 1;
  while (khi - klo > 1) {
    const k = Math.floor((klo + khi) / 2);
    if (nodes[k] > x) khi = k;
    else klo = k;
  }
  const hVal = h[klo];
  const A = (nodes[khi] - x) / hVal;
  const B = (x - nodes[klo]) / hVal;
  return (
    A * values[klo] +
    B * values[khi] +
    ((A * A * A - A) * M[klo] + (B * B * B - B) * M[khi]) * (hVal * hVal) / 6
  );
}

// ---------- Integración ----------
export function trapezoid(f, a, b, n = 1000) {
  if (n <= 0) throw new Error('n debe ser > 0');
  const h = (b - a) / n;
  let sum = (f(a) + f(b)) / 2;
  for (let i = 1; i < n; i++) sum += f(a + i * h);
  return h * sum;
}
export function simpson(f, a, b, n = 1000) {
  if (n <= 0) throw new Error('n debe ser > 0');
  const m = n % 2 === 0 ? n : n + 1;
  const h = (b - a) / m;
  let sum = f(a) + f(b);
  for (let i = 1; i < m; i++) {
    const x = a + i * h;
    sum += i % 2 === 0 ? 2 * f(x) : 4 * f(x);
  }
  return (h / 3) * sum;
}
export function romberg(f, a, b, maxDepth = 10, tol = 1e-10) {
  const R = [];
  for (let i = 0; i < maxDepth; i++) R[i] = [];
  R[0][0] = trapezoid(f, a, b, 1);
  for (let i = 1; i < maxDepth; i++) {
    const n = Math.pow(2, i);
    R[i][0] = trapezoid(f, a, b, n);
    for (let j = 1; j <= i; j++) {
      const k = Math.pow(4, j);
      R[i][j] = R[i][j - 1] + (R[i][j - 1] - R[i - 1][j - 1]) / (k - 1);
    }
    if (Math.abs(R[i][i] - R[i - 1][i - 1]) < tol) {
      return { value: R[i][i], depth: i + 1, converged: true, table: R };
    }
  }
  return { value: R[maxDepth - 1][maxDepth - 1], depth: maxDepth, converged: false, table: R };
}

// ---------- EDO ----------
export function rk2Step(f, t, y, h) {
  const k1 = f(t, y);
  const yMid = y.map((yi, i) => yi + (h / 2) * k1[i]);
  const k2 = f(t + h / 2, yMid);
  return y.map((yi, i) => yi + h * k2[i]);
}
export function rk2(f, t0, y0, tEnd, h) {
  const n = Math.ceil((tEnd - t0) / h);
  const t = [t0];
  const y = [y0.slice()];
  let ti = t0;
  let yi = y0.slice();
  for (let i = 1; i <= n; i++) {
    yi = rk2Step(f, ti, yi, h);
    ti = t0 + i * h;
    t.push(ti);
    y.push(yi.slice());
  }
  return { t, y };
}
export function rk4Step(f, t, y, h) {
  const k1 = f(t, y);
  const y2 = y.map((yi, i) => yi + (h / 2) * k1[i]);
  const k2 = f(t + h / 2, y2);
  const y3 = y.map((yi, i) => yi + (h / 2) * k2[i]);
  const k3 = f(t + h / 2, y3);
  const y4 = y.map((yi, i) => yi + h * k3[i]);
  const k4 = f(t + h, y4);
  return y.map((yi, i) => yi + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}
export function rk4(f, t0, y0, tEnd, h) {
  const n = Math.ceil((tEnd - t0) / h);
  const t = [t0];
  const y = [y0.slice()];
  let ti = t0;
  let yi = y0.slice();
  for (let i = 1; i <= n; i++) {
    yi = rk4Step(f, ti, yi, h);
    ti = t0 + i * h;
    t.push(ti);
    y.push(yi.slice());
  }
  return { t, y };
}

// ---------- Simulador: Detención de emergencia ----------
export function simulateDetencion({
  v0,
  tr,
  a,
  tolerance = 1e-6,
  h = 0.01,
  scenario = 'normal',
}) {
  const results = [];
  const tTotalRef = tr + v0 / a;
  const dTotalRef = v0 * tr + (v0 * v0) / (2 * a);
  const ref = { tTotal: tTotalRef, dTotal: dTotalRef };

  // EDO: y = [x, v]; f(t, y) = [v, -a]
  const f = (_t, [x, v]) => [v, -a];
  const y0 = [0, v0];
  const tEnd = tTotalRef + 5;
  const rk2sol = rk2(f, 0, y0, tEnd, h);
  const rk4sol = rk4(f, 0, y0, tEnd, h);

  // Interpolación lineal de v(t) desde RK4 para búsqueda de raíces e integración
  const ts = rk4sol.t;
  const vs = rk4sol.y.map((yi) => yi[1]);
  function vOfT(t) {
    let i0 = 0;
    while (i0 < ts.length - 1 && ts[i0 + 1] <= t) i0++;
    if (i0 >= ts.length - 1) i0 = ts.length - 2;
    const t0 = ts[i0];
    const t1 = ts[i0 + 1];
    const v0n = vs[i0];
    const v1n = vs[i0 + 1];
    const alpha = (t - t0) / (t1 - t0);
    return v0n + alpha * (v1n - v0n);
  }

  const rootBis = bisection(vOfT, 0, tEnd, { tol: tolerance });
  const rootNewt = newton(vOfT, (_t) => -a, tTotalRef, { tol: tolerance });
  const rootSec = secant(vOfT, 0, tTotalRef, { tol: tolerance });

  const tCruce = rootBis.converged ? rootBis.root : tTotalRef;
  const trap = trapezoid(vOfT, 0, tCruce, Math.ceil(tCruce / h));
  const simp = simpson(vOfT, 0, tCruce, Math.ceil(tCruce / h));
  const romb = romberg(vOfT, 0, tCruce, 12, tolerance);

  const pushMethod = (name, value, converged, extra = {}) => {
    results.push({
      name,
      converged,
      value,
      errorAbs: absError(value, dTotalRef),
      errorRel: relError(value, dTotalRef),
      errorPct: pctError(value, dTotalRef),
      residuo: extra.residuo !== undefined ? extra.residuo : absError(value, dTotalRef),
      history: extra.history || [],
      ...extra,
    });
  };

  pushMethod('RK2 (distancia)', rk2sol.y[rk2sol.y.length - 1][0], true, {
    tiempo: rk2sol.t[rk2sol.t.length - 1],
  });
  pushMethod('RK4 (distancia)', rk4sol.y[rk4sol.y.length - 1][0], true, {
    tiempo: rk4sol.t[rk4sol.t.length - 1],
  });
  pushMethod('Trapecio (distancia)', trap, true, { tiempo: tCruce });
  pushMethod('Simpson 1/3 (distancia)', simp, true, { tiempo: tCruce });
  pushMethod('Romberg (distancia)', romb.value, romb.converged, {
    tiempo: tCruce,
    profundidad: romb.depth,
  });
  pushMethod('Bisección (tiempo)', rootBis.root, rootBis.converged, {
    iteraciones: rootBis.iterations,
    magnitud: 'tiempo',
    history: rootBis.history || [],
    residuo: Math.abs(vOfT(rootBis.root)),
  });
  pushMethod('Newton (tiempo)', rootNewt.root, rootNewt.converged, {
    iteraciones: rootNewt.iterations,
    magnitud: 'tiempo',
    history: rootNewt.history || [],
    residuo: Math.abs(vOfT(rootNewt.root)),
  });
  pushMethod('Secante (tiempo)', rootSec.root, rootSec.converged, {
    iteraciones: rootSec.iterations,
    magnitud: 'tiempo',
    history: rootSec.history || [],
    residuo: Math.abs(vOfT(rootSec.root)),
  });

  return {
    scenario,
    entradas: { v0, tr, a, tolerance, h },
    ref,
    resultados: results,
    cruce: {
      biseccion: rootBis,
      newton: rootNewt,
      secante: rootSec,
    },
    grafica: {
      t: rk4sol.t,
      x: rk4sol.y.map((yi) => yi[0]),
      v: rk4sol.y.map((yi) => yi[1]),
      tCruce,
      dTotal: dTotalRef,
    },
  };
}

// ---------- Simulador: Oscilaciones por viento ----------
export function simulateViento({
  m,
  c,
  k,
  F,
  x0,
  v0,
  tolerance = 1e-6,
  h = 0.01,
  scenario = 'normal',
}) {
  const results = [];

  // EDO: y = [x, v]; f(t, y) = [v, (F(t) - c*v - k*x)/m]
  const f = (_t, [x, v]) => [v, (F - c * v - k * x) / m];
  const y0 = [x0, v0];
  const tEnd = 30;
  const rk2sol = rk2(f, 0, y0, tEnd, h);
  const rk4sol = rk4(f, 0, y0, tEnd, h);

  // Referencia numérica: RK4 con paso muy pequeño (solución de referencia)
  const rk4fine = rk4(f, 0, y0, tEnd, h / 10);
  const xRef = rk4fine.y.map((yi) => yi[0]);
  const vRef = rk4fine.y.map((yi) => yi[1]);
  const tRef = rk4fine.t;

  // Amplitud máxima (valor absoluto de desplazamiento)
  const absX = (arr) => arr.map(Math.abs);
  const xMaxRK2 = Math.max(...absX(rk2sol.y.map((yi) => yi[0])));
  const xMaxRK4 = Math.max(...absX(rk4sol.y.map((yi) => yi[0])));
  const xMaxRef = Math.max(...absX(xRef));

  // Integración de |x(t)| y x(t)^2 sobre [0, tEnd]
  const xsRK4 = rk4sol.y.map((yi) => yi[0]);
  const tsRK4 = rk4sol.t;
  function absXOfT(t) {
    let i0 = 0;
    while (i0 < tsRK4.length - 1 && tsRK4[i0 + 1] <= t) i0++;
    if (i0 >= tsRK4.length - 1) i0 = tsRK4.length - 2;
    const t0 = tsRK4[i0];
    const t1 = tsRK4[i0 + 1];
    const x0n = xsRK4[i0];
    const x1n = xsRK4[i0 + 1];
    const alpha = (t - t0) / (t1 - t0);
    return Math.abs(x0n + alpha * (x1n - x0n));
  }
  function x2OfT(t) {
    let i0 = 0;
    while (i0 < tsRK4.length - 1 && tsRK4[i0 + 1] <= t) i0++;
    if (i0 >= tsRK4.length - 1) i0 = tsRK4.length - 2;
    const t0 = tsRK4[i0];
    const t1 = tsRK4[i0 + 1];
    const x0n = xsRK4[i0];
    const x1n = xsRK4[i0 + 1];
    const alpha = (t - t0) / (t1 - t0);
    const x = x0n + alpha * (x1n - x0n);
    return x * x;
  }

  const trapAbs = trapezoid(absXOfT, 0, tEnd, Math.ceil(tEnd / h));
  const simpAbs = simpson(absXOfT, 0, tEnd, Math.ceil(tEnd / h));
  const rombAbs = romberg(absXOfT, 0, tEnd, 12, tolerance);
  const trapX2 = trapezoid(x2OfT, 0, tEnd, Math.ceil(tEnd / h));
  const simpX2 = simpson(x2OfT, 0, tEnd, Math.ceil(tEnd / h));
  const rombX2 = romberg(x2OfT, 0, tEnd, 12, tolerance);

  const pushMethod = (name, value, converged, extra = {}) => {
    results.push({
      name,
      converged,
      value,
      errorAbs: absError(value, xMaxRef),
      errorRel: relError(value, xMaxRef),
      errorPct: pctError(value, xMaxRef),
      residuo: extra.residuo !== undefined ? extra.residuo : absError(value, xMaxRef),
      history: extra.history || [],
      ...extra,
    });
  };

  pushMethod('RK2 (ampl. máx.)', xMaxRK2, true, { magnitud: 'amplitud', residuo: absError(xMaxRK2, xMaxRef) });
  pushMethod('RK4 (ampl. máx.)', xMaxRK4, true, { magnitud: 'amplitud', residuo: absError(xMaxRK4, xMaxRef) });
  pushMethod('Trapecio ∫|x|', trapAbs, true, { magnitud: 'integral |x|', residuo: absError(trapAbs, rombAbs.value) });
  pushMethod('Simpson ∫|x|', simpAbs, true, { magnitud: 'integral |x|', residuo: absError(simpAbs, rombAbs.value) });
  pushMethod('Romberg ∫|x|', rombAbs.value, rombAbs.converged, {
    magnitud: 'integral |x|',
    profundidad: rombAbs.depth,
    residuo: absError(rombAbs.value, simpAbs),
  });
  pushMethod('Trapecio ∫x²', trapX2, true, { magnitud: 'integral x²', residuo: absError(trapX2, rombX2.value) });
  pushMethod('Simpson ∫x²', simpX2, true, { magnitud: 'integral x²', residuo: absError(simpX2, rombX2.value) });
  pushMethod('Romberg ∫x²', rombX2.value, rombX2.converged, {
    magnitud: 'integral x²',
    profundidad: rombX2.depth,
    residuo: absError(rombX2.value, simpX2),
  });

  // Sensibilidad: parámetros mal condicionados (c muy pequeño o k muy pequeño)
  // se refleja en la amplitud y en la integración

  return {
    scenario,
    entradas: { m, c, k, F, x0, v0, tolerance, h },
    ref: { xMax: xMaxRef, tEnd },
    resultados: results,
    grafica: {
      t: rk4sol.t,
      x: rk4sol.y.map((yi) => yi[0]),
      v: rk4sol.y.map((yi) => yi[1]),
      xRK2: rk2sol.y.map((yi) => yi[0]),
      xRef,
      vRef,
    },
  };
}

// ---------- Simulador: Reconstrucción de señales de sensores ----------
export function simulateSensores({
  funcion = 'sin',
  nNodos = 7,
  a = 0,
  b = 2 * Math.PI,
  ruido = 0,
  puntosOcultar = 2,
  umbral = 0.5,
  tolerance = 1e-6,
  scenario = 'normal',
}) {
  const results = [];

  // Función de referencia analítica
  const fRef = funcion === 'sin' ? (t) => Math.sin(t) : (t) => Math.exp(-t);

  // Generar nodos según escenario
  let nodos;
  if (scenario === 'mal') {
    // Nodos agrupados en bordes (fenómeno de Runge) → mal condicionado
    nodos = [];
    for (let i = 0; i < nNodos; i++) {
      const theta = (i / (nNodos - 1)) * Math.PI;
      nodos.push(a + (b - a) * (1 - Math.cos(theta)) / 2);
    }
  } else {
    // Nodos regulares (equiespaciados)
    nodos = [];
    for (let i = 0; i < nNodos; i++) {
      nodos.push(a + (b - a) * i / (nNodos - 1));
    }
  }

  // Valores conocidos con posible ruido de medición (determinista)
  const valores = nodos.map((x, i) => fRef(x) + (Math.sin(i * 7.3 + 1.1) * 2 - 1) * ruido);

  // Puntos de evaluación más densos que los nodos
  const nEval = 60;
  const puntosEval = [];
  for (let i = 0; i <= nEval; i++) {
    puntosEval.push(a + (b - a) * i / nEval);
  }

  // Seleccionar puntos ocultados (determinista, reproducible)
  // Se ocultan puntos equiespaciados para que el escenario sea reproducible
  const indicesOcultos = new Set();
  const step = Math.max(1, Math.floor((nEval + 1) / (puntosOcultar + 1)));
  for (let i = 1; i <= puntosOcultar; i++) {
    const idx = Math.min(i * step, nEval);
    indicesOcultos.add(idx);
  }

  // Funciones interpoladoras
  const interpLag = (x) => lagrange(nodos, valores, x);
  const interpNew = (x) => newtonDividedDiff(nodos, valores, x);
  const interpSpl = (x) => cubicSpline(nodos, valores, x);

  // Calcular en todos los puntos de evaluación
  const yLag = puntosEval.map(interpLag);
  const yNew = puntosEval.map(interpNew);
  const ySpl = puntosEval.map(interpSpl);
  const yRef = puntosEval.map(fRef);

  // Errores: en puntos NO ocultados (reconstrucción) y en puntos ocultados (predicción real)
  let errLagCon = 0, errNewCon = 0, errSplCon = 0;
  let errLagOc = 0, errNewOc = 0, errSplOc = 0;
  let nCon = 0, nOc = 0;

  for (let i = 0; i < puntosEval.length; i++) {
    const ref = yRef[i];
    if (indicesOcultos.has(i)) {
      errLagOc += absError(yLag[i], ref);
      errNewOc += absError(yNew[i], ref);
      errSplOc += absError(ySpl[i], ref);
      nOc++;
    } else {
      errLagCon += absError(yLag[i], ref);
      errNewCon += absError(yNew[i], ref);
      errSplCon += absError(ySpl[i], ref);
      nCon++;
    }
  }

  const mediaOc = (s) => s / Math.max(nOc, 1);
  const mediaCon = (s) => s / Math.max(nCon, 1);

  // Resultados principales: error de predicción en puntos ocultados
  results.push({
    name: 'Lagrange',
    converged: true,
    valor: mediaOc(errLagOc),
    magnitud: 'error predicción (puntos ocultados)',
    errorConocidos: mediaCon(errLagCon),
    errorOcultos: mediaOc(errLagOc),
    errorRel: relError(mediaOc(errLagOc), mediaCon(errLagCon)),
    errorPct: pctError(mediaOc(errLagOc), mediaCon(errLagCon)),
    residuo: mediaCon(errLagCon),
    history: [],
  });
  results.push({
    name: 'Newton (dif. divididas)',
    converged: true,
    valor: mediaOc(errNewOc),
    magnitud: 'error predicción (puntos ocultados)',
    errorConocidos: mediaCon(errNewCon),
    errorOcultos: mediaOc(errNewOc),
    errorRel: relError(mediaOc(errNewOc), mediaCon(errNewCon)),
    errorPct: pctError(mediaOc(errNewOc), mediaCon(errNewCon)),
    residuo: mediaCon(errNewCon),
    history: [],
  });
  results.push({
    name: 'Spline cúbico',
    converged: true,
    valor: mediaOc(errSplOc),
    magnitud: 'error predicción (puntos ocultados)',
    errorConocidos: mediaCon(errSplCon),
    errorOcultos: mediaOc(errSplOc),
    errorRel: relError(mediaOc(errSplOc), mediaCon(errSplCon)),
    errorPct: pctError(mediaOc(errSplOc), mediaCon(errSplCon)),
    residuo: mediaCon(errSplCon),
    history: [],
  });

  // Búsqueda de raíz: interpolar(x) = umbral → interpolar(x) − umbral = 0
  let raiz = null;
  if (umbral !== null && Number.isFinite(umbral)) {
    const fLag = (x) => lagrange(nodos, valores, x) - umbral;
    const fNew = (x) => newtonDividedDiff(nodos, valores, x) - umbral;
    const fSpl = (x) => cubicSpline(nodos, valores, x) - umbral;

    // Buscar cambio de signo por muestreo
    let raizEncontrada = null;
    const muestras = 100;
    for (let i = 0; i < muestras - 1 && !raizEncontrada; i++) {
      const x0 = a + (b - a) * i / muestras;
      const x1 = a + (b - a) * (i + 1) / muestras;
      if (fLag(x0) * fLag(x1) <= 0) {
        raizEncontrada = bisection(fLag, x0, x1, { tol: tolerance });
        break;
      }
    }
    raiz = {
      biseccion: raizEncontrada,
      umbral,
    };
  }

  return {
    scenario,
    entradas: { funcion, nNodos, a, b, ruido, puntosOcultar, umbral, tolerance },
    ref: { funcion, a, b, nNodos },
    nodos,
    valores,
    puntosEval,
    resultados: results,
    errorOcultos: {
      lagrange: mediaOc(errLagOc),
      newton: mediaOc(errNewOc),
      spline: mediaOc(errSplOc),
    },
    errorConocidos: {
      lagrange: mediaCon(errLagCon),
      newton: mediaCon(errNewCon),
      spline: mediaCon(errSplCon),
    },
    raiz,
    grafica: {
      t: puntosEval,
      yRef,
      yLag,
      yNew,
      ySpl,
      nodos,
      valores,
    },
  };
}
