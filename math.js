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


export * from './numerics.js';
