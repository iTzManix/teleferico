import { mountCloudHistory } from './cloud-history.js';
import { renderDemo } from './demo-scenes.js';
import { PRESETS, experiment } from './experiments.js';
import { historyTable } from './render.js';
import { mountLocalHistory } from './local-history-ui.js';
import { simulate } from './math.js';
import { database } from './db.js';
const $ = id => document.getElementById(id), ids = ['y0', 'y1', 'y2', 'bias', 'threshold', 'tolerance']; let last = null; const fmt = n => Number.isFinite(n) ? (Math.abs(n) > 1e5 || Math.abs(n) < .001 && n !== 0 ? n.toExponential(2) : n.toFixed(3)) : '—';

const presets = PRESETS.deterioro;

function inputs() { return Object.fromEntries([...ids.map(id => [id, $(id).value.trim() === '' ? NaN : Number($(id).value)]), ['scenario', $('scenario').value]]) }

function draw(result, threshold) {
  let svg = $('chart'),
    end = Math.max(3, Math.min(36, (result.crossing || 12) * 1.3)), [d, a, b] = result.ref, vals = Array.from({ length: 101 }, (_, i) => d + a * (end * i / 100) + b * (end * i / 100) ** 2),
    min = Math.min(0, threshold, ...vals),
    max = Math.max(1, threshold, ...vals), y = v => 200 - (v - min) / (max - min) * 180, pts = vals.map((v, i) => `${40 + i * 5.4},${y(v)}`).join(' ');
  svg.innerHTML = `<line x1="40" y1="200" x2="580" y2="200" stroke="#aab5aa"/><line x1="40" y1="${y(threshold)}" x2="580" y2="${y(threshold)}" stroke="#bb7a58" stroke-dasharray="5 5"/><polyline fill="none" stroke="#72947b" stroke-width="3" points="${pts}"/><text x="40" y="216" fill="#859185" font-size="11">0 meses</text><text x="520" y="216" fill="#859185" font-size="11">${fmt(end)} meses</text>`
}

function draw2(result) {
  let svg = $('chart2'),
    iterMethods = result.results.filter(r => r.name !== 'LU (pivoteo)' && r.history && r.history.length > 0),
    allRes = [];
  iterMethods.forEach(r => r.history.forEach(h => allRes.push({ method: r.name, iteration: h.iteration, residual: h.residual })));
  if (allRes.length === 0) { svg.innerHTML = '<text x="300" y="110" fill="#859185" font-size="12" text-anchor="middle">No hay datos de convergencia iterativa</text>'; return; }
  const maxIter = Math.max(...allRes.map(r => r.iteration));
  const residuals = allRes.map(r => r.residual).filter(v => Number.isFinite(v) && v > 0);
  const minR = Math.min(...residuals, 1e-12);
  const maxR = Math.max(...residuals, 1);
  const logMin = Math.log10(minR);
  const logMax = Math.log10(maxR);
  const logRange = logMax - logMin || 1;
  const width = 600, height = 220, pad = 40;
  const scaleX = (it) => pad + (it / maxIter) * (width - 2 * pad);
  const scaleY = (r) => height - pad - ((Math.log10(Math.max(r, 1e-15)) - logMin) / logRange) * (height - 2 * pad);

  const colors = { 'Jacobi': '#c62828', 'Gauss-Seidel': '#1565c0', 'Gradiente conjugado': '#2e7d32' };
  let lines = '';
  const grouped = {};
  allRes.forEach(r => { if (!grouped[r.method]) grouped[r.method] = []; grouped[r.method].push(r); });
  Object.entries(grouped).forEach(([method, pts]) => {
    const color = colors[method] || '#333';
    const points = pts.map(p => `${scaleX(p.iteration)},${scaleY(p.residual)}`).join(' ');
    lines += `<polyline fill="none" stroke="${color}" stroke-width="2" points="${points}"/>`;
  });

  // Axis labels
  const yLabels = [minR, Math.pow(10, (logMin + logMax) / 2), maxR].map(v => `<text x="${pad - 5}" y="${scaleY(v)}" fill="#859185" font-size="9" text-anchor="end">${v.toExponential(1)}</text>`).join('');
  const xLabels = [0, Math.floor(maxIter / 2), maxIter].map(v => `<text x="${scaleX(v)}" y="${height - pad + 14}" fill="#859185" font-size="9" text-anchor="middle">${v}</text>`).join('');

  svg.innerHTML = `
    <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="#333" stroke-width="1"/>
    <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" stroke="#333" stroke-width="1"/>
    ${lines}
    ${yLabels}
    ${xLabels}
    <text x="${width / 2}" y="${height - 2}" fill="#333" font-size="11" text-anchor="middle">Iteración</text>
    <text x="${pad - 28}" y="${height / 2}" fill="#333" font-size="11" text-anchor="middle" transform="rotate(-90, ${pad - 28}, ${height / 2})">Residuo (log)</text>
  `;
}

function comparisons(res) {
  const row = (label, x) => `<tr><td>${label}</td>${x.map(value => `<td>${fmt(value)}</td>`).join('')}</tr>`;

  $('parameter-results').innerHTML = row('Referencia', res.ref) + res.results.map(r => row(r.name, r.x)).join('');

  $('iteration-results').innerHTML = res.results.filter(r => r.name !== 'LU (pivoteo)').map(r => `<details><summary>${r.name} · ${r.history.length} iteraciones registradas ${r.converged ? '· convergió' : '· no convergió'}</summary><div class="table-wrap"><table><thead><tr><th>ITERACIÓN</th><th>D₀</th><th>α</th><th>β</th><th>s</th><th>RESIDUO ‖Ax−b‖₂</th><th>ERROR ABS. ‖x−x*‖₂</th></tr></thead><tbody>${r.history.map(h => `<tr><td>${h.iteration}</td>${h.x.map(value => `<td>${fmt(value)}</td>`).join('')}<td>${fmt(h.residual)}</td><td>${fmt(h.error)}</td></tr>`).join('')}</tbody></table></div></details>`).join('');

  $('scenario-results').innerHTML = Object.entries(presets).map(([scenario, p]) => { let v = Object.fromEntries([...ids.map((id, i) => [id, p.values[i]]), ['scenario', scenario]]), r = simulate(v); return `<tr><td>${{ normal: 'Normal', estres: 'Estrés', mal: 'Mal condicionado' }[scenario]}</td><td>${fmt(r.ref[0])}</td><td>${fmt(r.ref[1])}</td><td>${fmt(r.ref[2])}</td><td>${fmt(v.threshold)}</td><td>${r.crossing === null ? 'No calculado' : fmt(r.crossing)}</td><td>${fmt(r.condition)}</td></tr>` }).join('');
}
function run() {
  try {
    let v = inputs(), res = simulate(v); last = { entradas: v, resultados: res }; $('error').textContent = ''; $('crossing').textContent = res.crossing === null ? 'No calculado' : fmt(res.crossing); $('initial').textContent = fmt(res.ref[0]); $('condition').textContent = fmt(res.condition); $('explanation').textContent = res.crossing === 0 ? 'El índice inicial ya alcanza o supera el umbral.' : res.crossing === null ? 'La curva obtenida no cumple las hipótesis de crecimiento del cálculo de umbral. Revisa los datos.' : `Con estas lecturas, el modelo estima el umbral en ${fmt(res.crossing)} meses. α = ${fmt(res.ref[1])} y β = ${fmt(res.ref[2])};
un crecimiento mayor puede adelantar la inspección. Es una proyección hipotética, no un diagnóstico.`; $('method-results').innerHTML = res.results.map(r => `<tr><td>${r.name}</td><td>${r.converged ? 'Convergió' : 'No convergió / precisión insuficiente'}</td><td>${r.it || 'Directo'}</td><td>${fmt(r.residual)}</td><td>${fmt(r.error)}</td><td>${fmt(r.relativeError)}</td><td>${r.relativeError === null ? '—' : fmt(r.relativeError * 100) + '%'}</td></tr>`).join(''); draw(res, v.threshold); renderDemo('deterioro',res,v); draw2(res); comparisons(res); renderSensitivityDet(); $('output-status').textContent = 'Simulación actualizada · revisa la gráfica y la comparación de métodos.'; return true
  } catch (e) { last = null; $('error').textContent = e.message; $('output-status').textContent = 'No se pudo calcular. Corrige las entradas para actualizar los resultados.';['crossing', 'initial', 'condition'].forEach(id => $(id).textContent = '—'); $('explanation').textContent = ''; $('chart').replaceChildren(); $('chart2').replaceChildren(); ['method-results', 'parameter-results', 'iteration-results', 'scenario-results', 'sensitivity-det'].forEach(id => $(id).replaceChildren()); return false }
}

$('scenario').addEventListener('change', () => { let p = presets[$('scenario').value]; ids.forEach((id, i) => $(id).value = p.values[i]); $('scenario-desc').textContent = p.desc; run() }); $('run').addEventListener('click', () => { if (run()) { $('output').focus({ preventScroll: true }); $('output').scrollIntoView({ behavior: 'smooth', block: 'start' }) } }); const requestedScenario=new URLSearchParams(globalThis.location?.search || '').get('scenario'); if (requestedScenario && presets[requestedScenario]) $('scenario').value=requestedScenario; $('scenario').dispatchEvent(new Event('change'));

// ---------- Sincronización navbar ↔ panel de cuenta ----------
// No hay inputs en el navbar, solo botones que hacen scroll
$('nav-signin').onclick = () => { document.getElementById('cuenta').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
$('nav-signup').onclick = () => { document.getElementById('cuenta').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
$('nav-signout').onclick = async () => { try { let db = await database(); let { error } = await db.auth.signOut(); msg(error ? error.message : 'Sesión cerrada.'); clearHistory(); $('nav-signout').style.display = 'none'; $('nav-signin').style.display = ''; $('nav-signup').style.display = ''; } catch (e) { msg(e.message) } };
// Botones del panel HISTORIAL PERSONAL (igual que en detencion-app.js)
$('signin').onclick = () => auth(false).catch(e => msg(e.message));
$('signup').onclick = () => auth(true).catch(e => msg(e.message));
$('signout').onclick = async () => { try { let db = await database(); let { error } = await db.auth.signOut(); msg(error ? error.message : 'Sesión cerrada.'); clearHistory(); updateNavAuth().catch(() => {}); } catch (e) { msg(e.message) } };
function clearHistory() { ['history-list', 'account-history-list'].forEach(id => { const el = $(id); if (el) el.replaceChildren(); }); }
// Actualizar visibilidad de botones según sesión
async function updateNavAuth() { let u = await user(); if (u) { $('nav-signout').style.display = ''; $('nav-signin').style.display = 'none'; $('nav-signup').style.display = 'none'; } else { $('nav-signout').style.display = 'none'; $('nav-signin').style.display = ''; $('nav-signup').style.display = ''; } }
updateNavAuth().catch(() => {});

function renderSensitivityDet() {
  try {
    const v = inputs();
    const vPert = { ...v, y2: v.y2 + 0.0001 };
    const rOrig = simulate(v);
    const rPert = simulate(vPert);
    const betaOrig = rOrig.ref[2];
    const betaPert = rPert.ref[2];
    const cambio = betaPert - betaOrig;
    const factor = Math.abs(cambio) > 1e-300 ? Math.abs(cambio) / 0.0001 : null;
    $('sensitivity-det').innerHTML = `
      <tr>
        <td>Última lectura (y₂)</td>
        <td>${fmt(v.y2)}</td>
        <td>${fmt(vPert.y2)}</td>
        <td>${fmt(cambio)}</td>
        <td>${factor === null ? '—' : fmt(factor)}</td>
      </tr>
    `;
  } catch (e) {
    $('sensitivity-det').replaceChildren();
  }
}

const msg = t => document.querySelectorAll('[data-msg]').forEach(el => el.textContent = t); async function user() { let db = await database(); let { data, error } = await db.auth.getUser(); if (error) return null; return data.user } async function auth(signup) { let email = $('email').value, password = $('password').value; if (!email || !password) { msg('Escribe tu correo y contraseña.'); return } let db = await database(); let { data, error } = signup ? await db.auth.signUp({ email, password }) : await db.auth.signInWithPassword({ email, password }); msg(error ? error.message : signup && !data.session ? 'Revisa tu correo para confirmar la cuenta antes de entrar.' : 'Sesión iniciada.'); $('password').value = ''; updateNavAuth().catch(() => {}); }
// Guardar e historial


mountLocalHistory('deterioro', inputs, v => { $('scenario').value=v.scenario; ids.forEach(id=>$(id).value=v[id]); $('scenario-desc').textContent=presets[v.scenario].desc; run(); });

$('restore-deterioro').onclick = () => { $('scenario').value='normal'; $('scenario').dispatchEvent(new Event('change')); };
mountCloudHistory('deterioro', inputs, v => { $('scenario').value=v.scenario; ids.forEach(id=>$(id).value=v[id]); $('scenario-desc').textContent=presets[v.scenario].desc; run(); });
