import { simulateViento } from './math.js';
import { database } from './db.js';

const $ = id => document.getElementById(id);
const ids = ['m', 'c', 'k', 'F', 'x0', 'v0-vin', 'tol-vin', 'h-vin'];
let last = null;
const fmt = n => Number.isFinite(n) ? (Math.abs(n) > 1e5 || Math.abs(n) < .001 && n !== 0 ? n.toExponential(2) : n.toFixed(3)) : '—';

const presets = {
  normal: {
    values: [1000, 500, 20000, 1000, 0, 0, .000001, .01],
    desc: 'Fuerza y amortiguamiento nominales.'
  },
  estres: {
    values: [1000, 200, 20000, 2000, 0, 0, .000001, .01],
    desc: 'Mayor fuerza externa o menor amortiguamiento.'
  },
  mal: {
    values: [1000, 10, 20000, 1000, 0, 0, .000001, .01],
    desc: 'Amortiguamiento muy bajo; respuesta muy sensible.'
  }
};

function absError(approx, exact) {
  return Math.abs(approx - exact);
}

function relError(approx, exact) {
  if (!Number.isFinite(exact) || Math.abs(exact) < 1e-300) return null;
  return absError(approx, exact) / Math.abs(exact);
}

function pctError(approx, exact) {
  const e = relError(approx, exact);
  return e === null ? null : e * 100;
}

function inputsVin() {
  return {
    m: Number($(ids[0]).value.trim() === '' ? NaN : $(ids[0]).value),
    c: Number($(ids[1]).value.trim() === '' ? NaN : $(ids[1]).value),
    k: Number($(ids[2]).value.trim() === '' ? NaN : $(ids[2]).value),
    F: Number($(ids[3]).value.trim() === '' ? NaN : $(ids[3]).value),
    x0: Number($(ids[4]).value.trim() === '' ? NaN : $(ids[4]).value),
    v0: Number($(ids[5]).value.trim() === '' ? NaN : $(ids[5]).value),
    tolerance: Number($(ids[6]).value.trim() === '' ? NaN : $(ids[6]).value),
    h: Number($(ids[7]).value.trim() === '' ? NaN : $(ids[7]).value),
    scenario: $('scenario-vin').value
  };
}

function drawChartVin(res) {
  const svg = $('chart-vin');
  const { t, x, v } = res.grafica;
  const width = 600;
  const height = 220;
  const pad = 40;

  const tMax = Math.max(...t);
  const xMax = Math.max(...x.map(Math.abs), 1);
  const vMax = Math.max(...v.map(Math.abs), 1);
  const yMax = Math.max(xMax, vMax);

  const scaleX = (ti) => pad + (ti / tMax) * (width - 2 * pad);
  const scaleY = (val) => height / 2 - (val / yMax) * (height / 2 - pad);

  let ptsX = t.map((ti, i) => `${scaleX(ti)},${scaleY(x[i])}`).join(' ');
  let ptsV = t.map((ti, i) => `${scaleX(ti)},${scaleY(v[i])}`).join(' ');
  const xCruce = scaleY(0);

  svg.innerHTML = `
    <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="#333" stroke-width="1"/>
    <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" stroke="#333" stroke-width="1"/>
    <polyline fill="none" stroke="#2e7d32" stroke-width="2" points="${ptsX}"/>
    <polyline fill="none" stroke="#c62828" stroke-width="2" points="${ptsV}"/>
    <line x1="${pad}" y1="${xCruce}" x2="${width - pad}" y2="${xCruce}" stroke="#993" stroke-dasharray="4 4"/>
    <text x="${pad}" y="${height - 6}" fill="#333" font-size="11">0</text>
    <text x="${width - 40}" y="${height - 6}" fill="#333" font-size="11">${fmt(tMax)} s</text>
    <text x="${pad + 5}" y="${pad - 5}" fill="#333" font-size="11">valor</text>
  `;
}

function fmtError(v) {
  return v === null ? '—' : fmt(v);
}

function drawChart2Vin(res) {
  const svg = $('chart2-vin');
  const { t, x, xRK2 } = res.grafica;
  const width = 600;
  const height = 220;
  const pad = 40;

  const tMax = Math.max(...t);
  const diff = t.map((ti, i) => Math.abs(x[i] - (xRK2[i] || 0)));
  const maxDiff = Math.max(...diff, 1e-10);

  const scaleX = (ti) => pad + (ti / tMax) * (width - 2 * pad);
  const scaleY = (val) => height - pad - (val / maxDiff) * (height - 2 * pad);

  const pts = t.map((ti, i) => `${scaleX(ti)},${scaleY(diff[i])}`).join(' ');

  svg.innerHTML = `
    <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="#333" stroke-width="1"/>
    <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" stroke="#333" stroke-width="1"/>
    <polyline fill="none" stroke="#c62828" stroke-width="2" points="${pts}"/>
    <text x="${pad}" y="${height - 6}" fill="#333" font-size="11">0</text>
    <text x="${width - 40}" y="${height - 6}" fill="#333" font-size="11">${fmt(tMax)} s</text>
    <text x="${pad + 5}" y="${pad - 5}" fill="#333" font-size="11">|x_RK4 − x_RK2|</text>
    <text x="${scaleX(tMax / 2)}" y="${height - 2}" fill="#333" font-size="11" text-anchor="middle">tiempo (s)</text>
  `;
}

function renderResultados(res) {
  const { ref, resultados } = res;

  $('x-max').textContent = fmt(ref.xMax);
  $('t-end').textContent = fmt(ref.tEnd);
  $('x-ref').textContent = fmt(ref.xMax);
  $('output-status-vin').textContent = 'Simulación actualizada · revisa la gráfica y la comparación de métodos.';

  const metodos = resultados.filter(r => r.magnitud === 'amplitud');
  const integraciones = resultados.filter(r => r.magnitud && r.magnitud.startsWith('integral'));

  $('method-results-vin').innerHTML = metodos.map(r => `<tr><td>${r.name}</td><td>${r.converged ? 'Convergió' : 'No convergió / precisión insuficiente'}</td><td>${fmt(r.value)}</td><td>${r.magnitud}</td><td>${fmtError(r.residuo)}</td><td>${fmtError(r.errorAbs)}</td><td>${fmtError(r.errorRel)}</td><td>${fmtError(r.errorPct)}</td></tr>`).join('');

  $('integ-results-vin').innerHTML = integraciones.map(r => `<tr><td>${r.name}</td><td>${fmt(r.value)}</td><td>${r.magnitud}</td><td>${fmtError(r.residuo)}</td><td>${fmtError(r.errorAbs)}</td><td>${fmtError(r.errorRel)}</td><td>${fmtError(r.errorPct)}</td></tr>`).join('');

  $('conclusion-vin').innerHTML = `
    <h3>Conclusión numérica</h3>
    <p>RK4 y RK2 integran la EDO con pequeña desviación frente a la referencia de paso fino. Los métodos de integración acumulan |x(t)| y x(t)² con precisión razonable.</p>
    <h3>Conclusión del problema</h3>
    <p>Con m=${fmt(res.entradas.m)} kg, c=${fmt(res.entradas.c)} N·s/m, k=${fmt(res.entradas.k)} N/m y F=${fmt(res.entradas.F)} N, la amplitud máxima estimada es ≈${fmt(ref.xMax)} m. Un amortiguamiento muy bajo (mal condicionado) hace la respuesta muy sensible; esto es sensibilidad matemática, no riesgo físico por sí solo.</p>
  `;

  drawChartVin(res);
  drawChart2Vin(res);
  renderIteracionVin(res);
  renderEscenariosVin(res);
  renderSensitivityVin(res);
  $('explanation-vin').textContent = `Con estas entradas, el modelo estima una amplitud máxima de ≈${fmt(ref.xMax)} m. Es una proyección educativa, no un diagnóstico operativo.`;
}

function renderSensitivityVin(res) {
  const { entradas } = res;
  const epsilon = 0.0001;
  const cPert = entradas.c + epsilon;

  const rOrig = simulateViento({ m: entradas.m, c: entradas.c, k: entradas.k, F: entradas.F, x0: entradas.x0, v0: entradas.v0, tolerance: entradas.tolerance, h: entradas.h, scenario: entradas.scenario });
  const rPert = simulateViento({ m: entradas.m, c: cPert, k: entradas.k, F: entradas.F, x0: entradas.x0, v0: entradas.v0, tolerance: entradas.tolerance, h: entradas.h, scenario: entradas.scenario });

  const cambioAmp = rPert.ref.xMax - rOrig.ref.xMax;
  const cambioInt = rPert.resultados.find(x => x.name === 'Trapecio ∫|x|')?.value - rOrig.resultados.find(x => x.name === 'Trapecio ∫|x|')?.value;

  $('sensitivity-vin').innerHTML = `
    <tr>
      <td>Amortiguamiento c</td>
      <td>${fmt(entradas.c)}</td>
      <td>${fmt(cPert)}</td>
      <td>${fmt(cambioAmp)}</td>
      <td>${fmt(cambioInt)}</td>
    </tr>
  `;
}

function renderIteracionVin(res) {
  const filas = res.resultados.map(r => {
    const detalle = r.history ? r.history.map(h => `
      <tr>
        <td>${h.iteration}</td>
        ${h.x ? h.x.map(value => `<td>${fmt(value)}</td>`).join('') : ''}
        <td>${fmt(h.residual)}</td>
        <td>${fmt(h.error)}</td>
      </tr>
    `).join('') : '';

    if (detalle) {
      return `<details><summary>${r.name} · ${r.history.length} iteraciones registradas ${r.converged ? '· convergió' : '· no convergió'}</summary><div class="table-wrap"><table><thead><tr><th>ITERACIÓN</th><th>x</th><th>v</th><th>RESIDUO</th><th>ERROR ABS.</th></tr></thead><tbody>${detalle}</tbody></table></div></details>`;
    }

    return `<details><summary>${r.name} · Resultado directo (sin iteraciones intermedias) ${r.converged ? '· convergió' : '· no convergió'}</summary><div class="table-wrap"><table><thead><tr><th>MÉTODO</th><th>VALOR</th><th>MAGNITUD</th><th>ERROR ABS.</th><th>ERROR REL.</th><th>ERROR %</th></tr></thead><tbody><tr><td>${r.name}</td><td>${fmt(r.value)}</td><td>${r.magnitud}</td><td>${fmtError(r.errorAbs)}</td><td>${fmtError(r.errorRel)}</td><td>${fmtError(r.errorPct)}</td></tr></tbody></table></div></details>`;
  }).join('');

  $('iteration-results-vin').innerHTML = filas;
}

function renderEscenariosVin(res) {
  const scenarioNames = { normal: 'Normal', estres: 'Estrés', mal: 'Mal condicionado' };
  const filas = Object.entries(presets).map(([s, p]) => {
    const v = {
      m: p.values[0], c: p.values[1], k: p.values[2], F: p.values[3],
      x0: p.values[4], v0: p.values[5], tolerance: p.values[6], h: p.values[7], scenario: s
    };
    const r = simulateViento(v);
    const rk4 = r.resultados.find(x => x.name === 'RK4 (ampl. máx.)');
    return `
      <tr>
        <td>${scenarioNames[s]}</td>
        <td>RK4 (amplitud)</td>
        <td>${fmt(rk4 ? rk4.value : 0)}</td>
        <td>amplitud</td>
        <td>${fmtError(rk4 ? rk4.errorAbs : 0)}</td>
        <td>${fmtError(rk4 ? rk4.errorRel : 0)}</td>
        <td>${fmtError(rk4 ? rk4.errorPct : 0)}</td>
      </tr>
    `;
  }).join('');
  $('scenario-results-vin').innerHTML = filas;
}

function runVin() {
  try {
    const v = inputsVin();
    if (!v.m || !v.c || !v.k || v.tolerance < 1e-10 || v.tolerance > 0.1 || v.h <= 0) {
      throw new Error('Introduce valores válidos: m > 0, c > 0, k > 0, tolerancia entre 10⁻¹⁰ y 0,1, h > 0.');
    }
    $('error-vin').textContent = '';
    const res = simulateViento(v);
    last = { entradas: v, resultados: res };
    renderResultados(res);
    return true;
  } catch (e) {
    last = null;
    $('error-vin').textContent = e.message;
    $('output-status-vin').textContent = 'No se pudo calcular. Corrige las entradas.';
    ['x-max', 't-end', 'x-ref'].forEach(id => $(id).textContent = '—');
    $('explanation-vin').textContent = '';
    $('chart-vin').replaceChildren();
    $('chart2-vin').replaceChildren();
    ['method-results-vin', 'integ-results-vin', 'iteration-results-vin', 'scenario-results-vin', 'sensitivity-vin', 'conclusion-vin'].forEach(id => $(id).replaceChildren());
    return false;
  }
}

$('scenario-vin').addEventListener('change', () => {
  const p = presets[$('scenario-vin').value];
  $(ids[0]).value = p.values[0];
  $(ids[1]).value = p.values[1];
  $(ids[2]).value = p.values[2];
  $(ids[3]).value = p.values[3];
  $(ids[4]).value = p.values[4];
  $(ids[5]).value = p.values[5];
  $(ids[6]).value = p.values[6];
  $(ids[7]).value = p.values[7];
  $('scenario-vin-desc').textContent = p.desc;
  runVin();
});

$('run-vin').addEventListener('click', () => {
  if (runVin()) {
    $('output-vin').focus({ preventScroll: true });
    $('output-vin').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

$('scenario-vin').dispatchEvent(new Event('change'));

// ---------- Auth, guardar y historial (reutilizado de app.js) ----------
const msg = t => $('account-message').textContent = t;
async function user() { let db = await database(); let { data, error } = await db.auth.getUser(); if (error) return null; return data.user }
async function auth(signup) { let email = $('email').value, password = $('password').value; if (!email || !password) { msg('Escribe tu correo y contraseña.'); return } let db = await database(); let { data, error } = signup ? await db.auth.signUp({ email, password }) : await db.auth.signInWithPassword({ email, password }); msg(error ? error.message : signup && !data.session ? 'Revisa tu correo para confirmar la cuenta antes de entrar.' : 'Sesión iniciada.'); $('password').value = ''; updateNavAuth(); }
// No hay inputs en el navbar, solo botones que hacen scroll
$('nav-signin').onclick = () => { document.getElementById('cuenta').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
$('nav-signup').onclick = () => { document.getElementById('cuenta').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
async function updateNavAuth() { let u = await user(); if (u) { $('nav-signout').style.display = ''; $('nav-signin').style.display = 'none'; $('nav-signup').style.display = 'none'; } else { $('nav-signout').style.display = 'none'; $('nav-signin').style.display = ''; $('nav-signup').style.display = ''; } }
$('nav-signout').onclick = async () => { try { let db = await database(); let { error } = await db.auth.signOut(); msg(error ? error.message : 'Sesión cerrada.'); $('history-list').replaceChildren(); updateNavAuth(); } catch (e) { msg(e.message) } };
$('signin').onclick = () => auth(false).catch(e => msg(e.message));
$('signup').onclick = () => auth(true).catch(e => msg(e.message));
$('signout').onclick = async () => { try { let db = await database(); let { error } = await db.auth.signOut(); msg(error ? error.message : 'Sesión cerrada.'); $('history-list').replaceChildren(); updateNavAuth(); } catch (e) { msg(e.message) } };
$('save').onclick = async () => { try { runVin(); if (!last) return; let u = await user(); if (!u) { msg('Inicia sesión para guardar.'); return } let db = await database(); let { error } = await db.from('simulaciones').insert({ user_id: u.id, caso: 'viento', escenario: last.entradas.scenario, entradas: last.entradas, resultados: last.resultados }); msg(error ? error.message : 'Simulación guardada.') } catch (e) { msg(e.message) } };
$('history').onclick = async () => { try { if (!await user()) { msg('Inicia sesión para consultar el historial.'); return } let db = await database(); let { data, error } = await db.from('simulaciones').select('id,caso,escenario,entradas,creado_en').eq('caso', 'viento').order('creado_en', { ascending: false }).limit(30); if (error) { msg(error.message); return } let list = $('history-list'); list.replaceChildren(); data.forEach(row => { let li = document.createElement('li'), button = document.createElement('button'); button.textContent = `${new Date(row.creado_en).toLocaleString('es-BO')} · ${row.escenario} · Abrir y repetir`; button.onclick = () => { $('scenario-vin').value = row.entradas.scenario; $('scenario-vin-desc').textContent = presets[row.entradas.scenario].desc; ids.forEach(id => $(id).value = row.entradas[id]); runVin(); msg('Simulación recuperada y repetida con el modelo actual.') }; li.append(button); list.append(li) }); msg(data.length ? `${data.length} simulaciones encontradas.` : 'Aún no hay simulaciones guardadas.') } catch (e) { msg(e.message) } };
updateNavAuth();
