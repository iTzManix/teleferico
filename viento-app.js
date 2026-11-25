import { mountCloudHistory } from './cloud-history.js';
import { bindSimulationInputs } from './live-inputs.js';
import { clearDemo, renderDemo } from './demo-scenes.js';
import { PRESETS, experiment } from './experiments.js';
import { historyTable, lineChart } from './render.js';
import { mountLocalHistory } from './local-history-ui.js';
import { simulateViento } from './math.js';
import { database } from './db.js';

const $ = id => document.getElementById(id);
const ids = ['m', 'c', 'k', 'F', 'x0', 'v0-vin', 'tol-vin', 'h-vin'];
let last = null;
const fmt = n => Number.isFinite(n) ? (Math.abs(n) > 1e5 || Math.abs(n) < .001 && n !== 0 ? n.toExponential(2) : n.toFixed(3)) : '—';

const presets = PRESETS.viento;

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
  const {t,x,tRef,xRef}=res.grafica;
  lineChart($('chart-vin'),[{points:t.map((t,i)=>({x:t,y:x[i]}))},{points:tRef.map((t,i)=>({x:t,y:xRef[i]}))}],{xLabel:'Tiempo (s)',yLabel:'Desplazamiento (m)',log:false,yDomain:[0,2]});
}

function fmtError(v) {
  return v === null ? '—' : fmt(v);
}

function drawChart2Vin(res) {
  const { t, x, xRK2 } = res.grafica;
  const points = t.map((time, i) => ({ x: time, y: Math.abs(x[i] - xRK2[i]) }));
  lineChart($('chart2-vin'), [{ points }], {
    xLabel: 'Tiempo (s)', yLabel: 'Diferencia absoluta entre RK4 y RK2 (m)', log: false, yDomain: [0]
  });
}

function renderResultados(res, preserveTime) {
  const { ref, resultados } = res;

  $('x-max').textContent = fmt(ref.xMax);
  $('t-end').textContent = fmt(ref.tEnd);
  $('x-ref').textContent = fmt(ref.xMax);
  $('output-status-vin').textContent = 'Simulación actualizada · revisa la gráfica y la comparación de métodos.';

  const metodos = resultados.filter(r => r.magnitud === 'amplitud');
  const integraciones = resultados.filter(r => r.magnitud && r.magnitud.startsWith('integral'));

  $('method-results-vin').innerHTML = metodos.map(r => `<tr><td>${r.name}</td><td>${r.converged ? 'Calculado / criterio satisfecho' : 'No convergió / precisión insuficiente'}</td><td>${fmt(r.value)}</td><td>${r.magnitud}</td><td>${fmtError(r.residuo)}</td><td>${fmtError(r.errorAbs)}</td><td>${fmtError(r.errorRel)}</td><td>${fmtError(r.errorPct)}</td></tr>`).join('');

  $('integ-results-vin').innerHTML = integraciones.map(r => `<tr><td>${r.name}</td><td>${fmt(r.value)}</td><td>${r.magnitud}</td><td>${fmtError(r.residuo)}</td><td>${fmtError(r.errorAbs)}</td><td>${fmtError(r.errorRel)}</td><td>${fmtError(r.errorPct)}</td></tr>`).join('');

  const conclusions = experiment('viento', res.scenario, res.entradas).conclusions;
  $('conclusion-vin').innerHTML = `<h3>Conclusión numérica</h3><p>${conclusions.numerical}</p><h3>Conclusión del problema</h3><p>${conclusions.problem}</p>`;
  renderDemo('viento', res, res.entradas, {preserveTime});
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

function renderIteracionVin(res) { $('iteration-results-vin').innerHTML = historyTable(res.resultados); }

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

const runVin = bindSimulationInputs(ids, calculate);
function calculate(preserveTime) {
  try {
    const v = inputsVin();
    if (v.c < 0 || v.m <= 0 || v.k <= 0 || v.tolerance < 1e-10 || v.tolerance > 0.1 || v.h <= 0) {
      throw new Error('Introduce valores válidos: m > 0, c ≥ 0, k > 0, tolerancia entre 10⁻¹⁰ y 0,1, h > 0.');
    }
    $('error-vin').textContent = '';
    const res = simulateViento(v);
    last = { entradas: v, resultados: res };
    renderResultados(res, preserveTime);
    return true;
  } catch (e) {
    last = null;
    $('error-vin').textContent = e.message;
    $('output-status-vin').textContent = 'No se pudo calcular. Corrige las entradas.';
    ['x-max', 't-end', 'x-ref'].forEach(id => $(id).textContent = '—');
    $('explanation-vin').textContent = '';
    clearDemo('demo-viento'); $('chart-vin').replaceChildren();
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

const requestedScenario=new URLSearchParams(globalThis.location?.search || '').get('scenario'); if (requestedScenario && presets[requestedScenario]) $('scenario-vin').value=requestedScenario; $('scenario-vin').dispatchEvent(new Event('change'));

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


mountLocalHistory('viento', inputsVin, v => { $('scenario-vin').value=v.scenario; Object.entries({"m": "m", "c": "c", "k": "k", "F": "F", "x0": "x0", "v0": "v0-vin", "tolerance": "tol-vin", "h": "h-vin"}).forEach(([key,id])=>$(id).value=v[key]); $('scenario-vin-desc').textContent=presets[v.scenario].desc; runVin(); });

$('restore-viento').onclick = () => { $('scenario-vin').value='normal'; $('scenario-vin').dispatchEvent(new Event('change')); };
mountCloudHistory('viento', inputsVin, v => { $('scenario-vin').value=v.scenario; Object.entries({"m": "m", "c": "c", "k": "k", "F": "F", "x0": "x0", "v0": "v0-vin", "tolerance": "tol-vin", "h": "h-vin"}).forEach(([key,id])=>$(id).value=v[key]); $('scenario-vin-desc').textContent=presets[v.scenario].desc; runVin(); });
