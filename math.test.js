import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from './math.js';

test('calibración independiente y proyección de referencia', () => {
    const r = simulate({ y0: 13, y1: 15.5, y2: 19, bias: 3, threshold: 60, tolerance: 1e-6, scenario: 'normal' });
    [10, 2, .5, 3].forEach((v, i) => assert.ok(Math.abs(r.ref[i] - v) < 1e-9));
    assert.ok(Math.abs(r.crossing - (Math.sqrt(104) - 2)) < 1e-9);
    for (const name of ['LU (pivoteo)', 'Gauss-Seidel', 'Gradiente conjugado']) {
        let m = r.results.find(x => x.name === name);
        assert.ok(m.converged, `${name}: ${m.residual}`)
    }
});

test('mediciones próximas empeoran el condicionamiento', () => {
    const v = { y0: 13, y1: 15.5, y2: 19, bias: 3, threshold: 60, tolerance: 1e-6, scenario: 'normal' };
    assert.ok(simulate({ ...v, scenario: 'mal' }).condition > simulate(v).condition * 1000)
});

test('umbral alcanzado y datos inválidos', () => {
    let v = { y0: 13, y1: 15.5, y2: 19, bias: 3, threshold: 9, tolerance: 1e-6, scenario: 'normal' };
    assert.equal(simulate(v).crossing, 0); assert.throws(() => simulate({ ...v, tolerance: 0 }))
});

test('historial de iteraciones corresponde al resultado', () => {
    const r = simulate({ y0: 13, y1: 15.5, y2: 19, bias: 3, threshold: 60, tolerance: 1e-6, scenario: 'normal' });
    for (const name of ['Gauss-Seidel', 'Gradiente conjugado']) {
        const m = r.results.find(x => x.name === name); assert.equal(m.history.length, m.it); assert.deepEqual(m.history.at(-1).x, m.x);
        assert.ok(Math.abs(m.history.at(-1).residual - m.residual) < 1e-12)
    } assert.equal(r.results[0].history.length, 0)
});
