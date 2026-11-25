import { mountCloudHistory } from './cloud-history.js';
import { renderDemo } from './demo-scenes.js';
import { PRESETS, experiment } from './experiments.js';
import { historyTable } from './render.js';
import { mountLocalHistory } from './local-history-ui.js';
import { simulateSensores } from './math.js';
import { database } from './db.js';

const $ = id => document.getElementById(id);
let last = null;
const fmt = n => Number.isFinite(n) ? (Math.abs(n) > 1e5 || Math.abs(n) < .001 && n !== 0 ? n.toExponential(2) : n.toFixed(3)) : '—';

const presets = PRESETS.sensores;

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

function inputsSen() {
  return {
    funcion: $('funcion-sen').value,
    nNodos: Number($('n-nodos').value.trim() === '' ? NaN : $('n-nodos').value),
    a: Number($('sen-a').value.trim() === '' ? NaN : $('sen-a').value),
    b: Number($('sen-b').value.trim() === '' ? NaN : $('sen-b').value),
    ruido: Number($('sen-ruido').value.trim() === '' ? NaN : $('sen-ruido').value),
    puntosOcultar: Number($('sen-ocultar').value.trim() === '' ? NaN : $('sen-ocultar').value),
    umbral: Number($('sen-umbral').value.trim() === '' ? NaN : $('sen-umbral').value),
    tolerance: Number($('tol-sen').value.trim() === '' ? NaN : $('tol-sen').value),
    scenario: $('scenario-sen').value
  };
}

function drawChartSen(res) {
  const svg = $('chart-sen');
  const { t, yRef, yLag, yNew, ySpl, nodos, valores } = res.grafica;
  const width = 600;
  const height = 220;
  const pad = 40;

  const tMax = Math.max(...t);
  const allY = [...yRef, ...yLag, ...yNew, ...ySpl];
  const yMin = Math.min(...allY);
  const yMax = Math.max(...allY);
  const yRange = yMax - yMin || 1;

  const scaleX = (ti) => pad + (ti / tMax) * (width - 2 * pad);
  const scaleY = (val) => height - pad - ((val - yMin) / yRange) * (height - 2 * pad);

  const line = (pts, stroke) => `<polyline fill="none" stroke="${stroke}" stroke-width="2" points="${pts}"/>`;

  let ptsRef = t.map((ti, i) => `${scaleX(ti)},${scaleY(yRef[i])}`).join(' ');
  let ptsLag = t.map((ti, i) => `${scaleX(ti)},${scaleY(yLag[i])}`).join(' ');
  let ptsNew = t.map((ti, i) => `${scaleX(ti)},${scaleY(yNew[i])}`).join(' ');
  let ptsSpl = t.map((ti, i) => `${scaleX(ti)},${scaleY(ySpl[i])}`).join(' ');

  let ptsNodos = nodos.map((x, i) => {
    const yi = valores[i];
    return `${scaleX(x)},${scaleY(yi)}`;
  }).join(' ');

  svg.innerHTML = `
    <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="#333" stroke-width="1"/>
    <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" stroke="#333" stroke-width="1"/>
    ${line(ptsRef, '#2e7d32')}
    ${line(ptsLag, '#c62828')}
    ${line(ptsNew, '#1565c0')}
    ${line(ptsSpl, '#7b1fa2')}
    <circle cx="${scaleX(nodos[0])}" cy="${scaleY(valores[0])}" r="3" fill="#333"/>
    <text x="${pad}" y="${height - 6}" fill="#333" font-size="11">0</text>
    <text x="${width - 40}" y="${height - 6}" fill="#333" font-size="11">${fmt(tMax)}</text>
    <text x="${pad + 5}" y="${pad - 5}" fill="#333" font-size="11">valor</text>
  `;
}

function fmtError(v) {
  return v === null ? '—' : fmt(v);
}

function drawChart2Sen(res) {
  const svg = $('chart2-sen');
  const width = 600;
  const height = 220;
  const pad = 50;
  const metodos = res.resultados;
  const maxErr = Math.max(...metodos.map(m => m.valor || 0), 1e-16);

  let bars = '';
  let labels = '';
  metodos.forEach((m, i) => {
    const x = pad + i * (width - 2 * pad) / metodos.length;
    const barH = maxErr > 0 ? (m.valor / maxErr) * (height - 2 * pad) : 0;
    bars += `<rect x="${x - 12}" y="${height - pad - barH}" width="24" height="${barH}" fill="#2e7d32"/>`;
    labels += `<text x="${x}" y="${height - pad + 18}" fill="#333" font-size="10" text-anchor="middle">${m.name}</text>`;
  });

  svg.innerHTML = `
    <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="#333" stroke-width="1"/>
    <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" stroke="#333" stroke-width="1"/>
    ${bars}
    ${labels}
    <text x="${width / 2}" y="${height - 2}" fill="#333" font-size="11" text-anchor="middle">Error de predicción (puntos ocultados)</text>
    <text x="${pad - 28}" y="${height / 2}" fill="#333" font-size="11" text-anchor="middle" transform="rotate(-90, ${pad - 28}, ${height / 2})">Error</text>
  `;
}

function renderResultados(res) {
  const { resultados, errorOcultos, errorConocidos, raiz } = res;

  $('err-lag').textContent = fmt(errorOcultos.lagrange);
  $('err-new').textContent = fmt(errorOcultos.newton);
  $('err-spl').textContent = fmt(errorOcultos.spline);
  $('output-status-sen').textContent = 'Simulación actualizada · revisa la gráfica y la comparación de métodos.';

  $('method-results-sen').innerHTML = resultados.map(r => `<tr><td>${r.name}</td><td>${r.converged ? 'Calculado / criterio satisfecho' : 'No convergió'}</td><td>${fmt(r.valor)}</td><td>${fmtError(r.errorRel)}</td><td>${fmtError(r.errorPct)}</td><td>${fmt(r.errorConocidos)}</td><td>${fmtError(r.residuo)}</td></tr>`).join('');

  if (raiz) {
    $('root-results-sen').innerHTML = `<tr><td>Bisección (Lagrange)</td><td>${fmt(raiz.biseccion?.root)}</td><td>${raiz.biseccion?.converged ? 'Sí' : 'No'}</td></tr>`;
  } else {
    $('root-results-sen').innerHTML = `<tr><td>—</td><td>—</td><td>—</td></tr>`;
  }

  const conclusions = experiment('sensores', res.scenario, res.entradas).conclusions;
  $('conclusion-sen').innerHTML = `<h3>Conclusión numérica</h3><p>${conclusions.numerical}</p><h3>Conclusión del problema</h3><p>${conclusions.problem}</p>`;
  renderDemo('sensores', res, res.entradas);
  drawChartSen(res);
  drawChart2Sen(res);
  renderIteracionSen(res);
  renderEscenariosSen(res);
  renderSensitivitySen(res);
  $('explanation-sen').textContent = `Con estas entradas, el modelo reconstruye la señal y oculta ${res.entradas.puntosOcultar} puntos para medir el error real de predicción. Es una proyección educativa, no un diagnóstico operativo.`;
}

function renderSensitivitySen(res) {
  const { entradas } = res;
  const epsilon = 0.0001;

  const rOrig = simulateSensores(entradas);
  const rPert = simulateSensores({ ...entradas, perturbation: epsilon });

  const cambioLag = rPert.errorOcultos.lagrange - rOrig.errorOcultos.lagrange;
  const cambioNew = rPert.errorOcultos.newton - rOrig.errorOcultos.newton;
  const cambioSpl = rPert.errorOcultos.spline - rOrig.errorOcultos.spline;

  $('sensitivity-sen').innerHTML = `
    <tr>
      <td>Lagrange</td>
      <td>${fmt(rOrig.errorOcultos.lagrange)}</td>
      <td>${fmt(rPert.errorOcultos.lagrange)}</td>
      <td>${fmt(cambioLag)}</td>
    </tr>
    <tr>
      <td>Newton (dif. divididas)</td>
      <td>${fmt(rOrig.errorOcultos.newton)}</td>
      <td>${fmt(rPert.errorOcultos.newton)}</td>
      <td>${fmt(cambioNew)}</td>
    </tr>
    <tr>
      <td>Spline cúbico</td>
      <td>${fmt(rOrig.errorOcultos.spline)}</td>
      <td>${fmt(rPert.errorOcultos.spline)}</td>
      <td>${fmt(cambioSpl)}</td>
    </tr>
  `;
}

function renderIteracionSen(res) { $('iteration-results-sen').innerHTML = historyTable(res.resultados); }

function renderEscenariosSen(res) {
  const scenarioNames = { normal: 'Normal', estres: 'Estrés', mal: 'Mal condicionado' };
  const filas = Object.entries(presets).map(([s, p]) => {
    const v = {
      funcion: p.values[0], nNodos: p.values[1], a: p.values[2], b: p.values[3],
      ruido: p.values[4], puntosOcultar: p.values[5], umbral: p.values[6], tolerance: p.values[7],
      scenario: s
    };
    const r = simulateSensores(v);
    const spl = r.resultados.find(x => x.name === 'Spline cúbico');
    return `
      <tr>
        <td>${scenarioNames[s]}</td>
        <td>Spline cúbico</td>
        <td>${fmt(spl ? spl.valor : 0)}</td>
        <td>error ocultos</td>
        <td>${fmtError(spl ? spl.errorConocidos : 0)}</td>
        <td>${fmtError(spl ? spl.errorOcultos : 0)}</td>
        <td>${fmtError(Math.abs((spl ? spl.errorOcultos : 0) - (spl ? spl.errorConocidos : 0)))}</td>
      </tr>
    `;
  }).join('');
  $('scenario-results-sen').innerHTML = filas;
}

function runSen() {
  try {
    const v = inputsSen();
    if (!v.nNodos || v.nNodos < 4 || v.b <= v.a || v.tolerance < 1e-10 || v.tolerance > 0.1) {
      throw new Error('Introduce valores válidos: nodos ≥ 3, b > a, tolerancia entre 10⁻¹⁰ y 0,1.');
    }
    $('error-sen').textContent = '';
    const res = simulateSensores(v);
    last = { entradas: v, resultados: res };
    renderResultados(res);
    return true;
  } catch (e) {
    last = null;
    $('error-sen').textContent = e.message;
    $('output-status-sen').textContent = 'No se pudo calcular. Corrige las entradas.';
    ['err-lag', 'err-new', 'err-spl'].forEach(id => $(id).textContent = '—');
    $('explanation-sen').textContent = '';
    $('chart-sen').replaceChildren();
    $('chart2-sen').replaceChildren();
    ['method-results-sen', 'root-results-sen', 'iteration-results-sen', 'scenario-results-sen', 'sensitivity-sen', 'conclusion-sen'].forEach(id => $(id).replaceChildren());
    return false;
  }
}

$('scenario-sen').addEventListener('change', () => {
  const p = presets[$('scenario-sen').value];
  $('funcion-sen').value = p.values[0];
  $('n-nodos').value = p.values[1];
  $('sen-a').value = p.values[2];
  $('sen-b').value = p.values[3];
  $('sen-ruido').value = p.values[4];
  $('sen-ocultar').value = p.values[5];
  $('sen-umbral').value = p.values[6];
  $('tol-sen').value = p.values[7];
  $('scenario-sen-desc').textContent = p.desc;
  runSen();
});

$('run-sen').addEventListener('click', () => {
  if (runSen()) {
    $('output-sen').focus({ preventScroll: true });
    $('output-sen').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

const requestedScenario=new URLSearchParams(globalThis.location?.search || '').get('scenario'); if (requestedScenario && presets[requestedScenario]) $('scenario-sen').value=requestedScenario; $('scenario-sen').dispatchEvent(new Event('change'));

// ---------- Auth, guardar y historial (reutilizado de app.js) ----------
const msg = t => $('account-message').textContent = t;
async function user() { let db = await database(); let { data, error } = await db.auth.getUser(); if (error) return null; return data.user }
async function auth(signup) { let email = $('email').value, password = $('password').value; if (!email || !password) { msg('Escribe tu correo y contraseña.'); return } let db = await database(); let { data, error } = signup ? await db.auth.signUp({ email, password }) : await db.auth.signInWithPassword({ email, password }); msg(error ? error.message : signup && !data.session ? 'Revisa tu correo para confirmar la cuenta antes de entrar.' : 'Sesión iniciada.'); $('password').value = ''; updateNavAuth().catch(() => {}); }
// No hay inputs en el navbar, solo botones que hacen scroll
$('nav-signin').onclick = () => { document.getElementById('cuenta').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
$('nav-signup').onclick = () => { document.getElementById('cuenta').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
async function updateNavAuth() { let u = await user(); if (u) { $('nav-signout').style.display = ''; $('nav-signin').style.display = 'none'; $('nav-signup').style.display = 'none'; } else { $('nav-signout').style.display = 'none'; $('nav-signin').style.display = ''; $('nav-signup').style.display = ''; } }
$('nav-signout').onclick = async () => { try { let db = await database(); let { error } = await db.auth.signOut(); msg(error ? error.message : 'Sesión cerrada.'); $('history-list').replaceChildren(); updateNavAuth().catch(() => {}); } catch (e) { msg(e.message) } };
$('signin').onclick = () => auth(false).catch(e => msg(e.message));
$('signup').onclick = () => auth(true).catch(e => msg(e.message));
$('signout').onclick = async () => { try { let db = await database(); let { error } = await db.auth.signOut(); msg(error ? error.message : 'Sesión cerrada.'); $('history-list').replaceChildren(); updateNavAuth().catch(() => {}); } catch (e) { msg(e.message) } };
updateNavAuth().catch(() => {});


mountLocalHistory('sensores', inputsSen, v => { $('scenario-sen').value=v.scenario; Object.entries({"funcion": "funcion-sen", "nNodos": "n-nodos", "a": "sen-a", "b": "sen-b", "ruido": "sen-ruido", "puntosOcultar": "sen-ocultar", "umbral": "sen-umbral", "tolerance": "tol-sen"}).forEach(([key,id])=>$(id).value=v[key]); $('scenario-sen-desc').textContent=presets[v.scenario].desc; runSen(); });

$('restore-sensores').onclick = () => { $('scenario-sen').value='normal'; $('scenario-sen').dispatchEvent(new Event('change')); };
mountCloudHistory('sensores', inputsSen, v => { $('scenario-sen').value=v.scenario; Object.entries({"funcion": "funcion-sen", "nNodos": "n-nodos", "a": "sen-a", "b": "sen-b", "ruido": "sen-ruido", "puntosOcultar": "sen-ocultar", "umbral": "sen-umbral", "tolerance": "tol-sen"}).forEach(([key,id])=>$(id).value=v[key]); $('scenario-sen-desc').textContent=presets[v.scenario].desc; runSen(); });
