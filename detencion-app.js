import { simulateDetencion } from './math.js';
import { database } from './db.js';

const $ = id => document.getElementById(id);
const ids = ['v0', 'tr', 'a', 'tol-det', 'h-det'];
let last = null;
const fmt = n => Number.isFinite(n) ? (Math.abs(n) > 1e5 || Math.abs(n) < .001 && n !== 0 ? n.toExponential(2) : n.toFixed(3)) : '—';

const presets = {
  normal: {
    values: [12, 1, 3, .000001, .01],
    desc: 'Velocidad, tiempo de reacción y frenado nominales.'
  },
  estres: {
    values: [18, 1.5, 2, .000001, .01],
    desc: 'Mayor velocidad o menor desaceleración.'
  },
  mal: {
    values: [12, 1, 0.1, .000001, .01],
    desc: 'Desaceleración muy pequeña; tiempo de detención muy sensible.'
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

function inputsDet() {
  return {
    v0: Number($(ids[0]).value.trim() === '' ? NaN : $(ids[0]).value),
    tr: Number($(ids[1]).value.trim() === '' ? NaN : $(ids[1]).value),
    a: Number($(ids[2]).value.trim() === '' ? NaN : $(ids[2]).value),
    tolerance: Number($(ids[3]).value.trim() === '' ? NaN : $(ids[3]).value),
    h: Number($(ids[4]).value.trim() === '' ? NaN : $(ids[4]).value),
    scenario: $('scenario-det').value
  };
}

function drawChartDet(res) {
  const svg = $('chart-det');
  const { t, x, v, tCruce, dTotal } = res.grafica;
  const width = 600;
  const height = 220;
  const pad = 40;

  const tMax = Math.max(...t);
  const xMax = Math.max(dTotal, ...x) || 1;
  const vMax = Math.max(...v.map(Math.abs), res.entradas.v0) || 1;
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
    <text x="${scaleX(tCruce)}" y="${pad - 5}" fill="#666" font-size="10" text-anchor="middle">cruce ${fmt(tCruce)} s</text>
  `;
}

function fmtError(v) {
  return v === null ? '—' : fmt(v);
}

function drawChart2Det(res) {
  const svg = $('chart2-det');
  const width = 600;
  const height = 220;
  const pad = 50;
  const metodos = res.resultados;
  const maxErr = Math.max(...metodos.map(m => m.errorAbs || 0), 1);

  let bars = '';
  let labels = '';
  metodos.forEach((m, i) => {
    const x = pad + i * (width - 2 * pad) / metodos.length;
    const barH = maxErr > 0 ? (m.errorAbs / maxErr) * (height - 2 * pad) : 0;
    const color = m.name.includes('RK') ? '#2e7d32' : m.name.includes('Trapecio') || m.name.includes('Simpson') || m.name.includes('Romberg') ? '#1565c0' : '#c62828';
    bars += `<rect x="${x - 10}" y="${height - pad - barH}" width="20" height="${barH}" fill="${color}"/>`;
    labels += `<text x="${x}" y="${height - pad + 16}" fill="#333" font-size="9" text-anchor="middle" transform="rotate(-30, ${x}, ${height - pad + 16})">${m.name.replace(' (distancia)', '').replace(' (tiempo)', '')}</text>`;
  });

  svg.innerHTML = `
    <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="#333" stroke-width="1"/>
    <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" stroke="#333" stroke-width="1"/>
    ${bars}
    ${labels}
    <text x="${width / 2}" y="${height - 2}" fill="#333" font-size="11" text-anchor="middle">Error absoluto por método</text>
    <text x="${pad - 28}" y="${height / 2}" fill="#333" font-size="11" text-anchor="middle" transform="rotate(-90, ${pad - 28}, ${height / 2})">Error</text>
  `;
}

function renderResultados(res) {
  const { ref, resultados, cruce } = res;

  $('t-cero').textContent = fmt(res.cruce.biseccion.root ?? ref.tTotal);
  $('d-total').textContent = fmt(ref.dTotal);
  $('t-ref').textContent = fmt(ref.tTotal);
  $('output-status-det').textContent = 'Simulación actualizada · revisa la gráfica y la comparación de métodos.';

  $('method-results-det').innerHTML = resultados.map(r => `<tr><td>${r.name}</td><td>${r.converged ? 'Convergió' : 'No convergió / precisión insuficiente'}</td><td>${fmt(r.value)}</td><td>${r.magnitud || 'distancia'}</td><td>${fmtError(r.residuo)}</td><td>${fmtError(r.errorAbs)}</td><td>${fmtError(r.errorRel)}</td><td>${fmtError(r.errorPct)}</td></tr>`).join('');

  $('root-results-det').innerHTML = [
    { name: 'Bisección', r: cruce.biseccion },
    { name: 'Newton', r: cruce.newton },
    { name: 'Secante', r: cruce.secante },
  ].map(({ name, r }) => `<tr><td>${name}</td><td>${fmt(r.root)}</td><td>${r.iterations}</td><td>${r.converged ? 'Sí' : 'No'}</td></tr>`).join('');

  const tErr = Math.abs(res.cruce.biseccion.root - ref.tTotal);
  const rk4dist = resultados.find(r => r.name === 'RK4 (distancia)');
  const dErr = Math.abs(rk4dist ? rk4dist.value : 0 - ref.dTotal);

  $('conclusion-det').innerHTML = `
    <h3>Conclusión numérica</h3>
    <p>RK4 y RK2 integran la EDO con pequeña desviación frente a la referencia analítica. La búsqueda de raíces localiza v(t)=0 con precisión; el error de tiempo es ${fmt(tErr)} s y el error de distancia es ${fmt(dErr)} m.</p>
    <h3>Conclusión del problema</h3>
    <p>Con v₀=${fmt(res.entradas.v0)} m/s, tᵣ=${fmt(res.entradas.tr)} s y a=${fmt(res.entradas.a)} m/s², la cabina se detiene tras ≈${fmt(ref.tTotal)} s recorriendo ≈${fmt(ref.dTotal)} m. Un escenario mal condicionado (a muy pequeña) alarga mucho el tiempo de frenado; esto es sensibilidad matemática, no riesgo físico por sí solo.</p>
  `;

  drawChartDet(res);
  drawChart2Det(res);
  renderIteracionDet(res);
  renderEscenariosDet(res);
  renderSensitivityDet(res);
  $('explanation-det').textContent = `Con estas entradas, el modelo estima el cruce de velocidad en ${fmt(res.cruce.biseccion.root)} s y una distancia de frenado de ${fmt(ref.dTotal)} m. Es una proyección educativa, no un diagnóstico operativo.`;
}

function renderSensitivityDet(res) {
  const { entradas } = res;
  const epsilon = 0.0001;
  const aPert = entradas.a + epsilon;

  const rOrig = simulateDetencion({ v0: entradas.v0, tr: entradas.tr, a: entradas.a, tolerance: entradas.tolerance, h: entradas.h, scenario: entradas.scenario });
  const rPert = simulateDetencion({ v0: entradas.v0, tr: entradas.tr, a: aPert, tolerance: entradas.tolerance, h: entradas.h, scenario: entradas.scenario });

  const cambioT = rPert.ref.tTotal - rOrig.ref.tTotal;
  const cambioD = rPert.ref.dTotal - rOrig.ref.dTotal;

  $('sensitivity-det').innerHTML = `
    <tr>
      <td>Desaceleración a</td>
      <td>${fmt(entradas.a)}</td>
      <td>${fmt(aPert)}</td>
      <td>${fmt(cambioT)}</td>
      <td>${fmt(cambioD)}</td>
    </tr>
  `;
}

function renderIteracionDet(res) {
  const filas = res.resultados.map(r => {
    // Para métodos con historial (raíces), mostrar tabla de iteraciones
    if (r.history && r.history.length > 0) {
      const detalle = r.history.map(h => `
        <tr>
          <td>${h.iteration}</td>
          <td>${fmt(h.a !== undefined ? h.a : (h.x || ''))}</td>
          <td>${fmt(h.b !== undefined ? h.b : '')}</td>
          <td>${fmt(h.c !== undefined ? h.c : (h.xNew || h.xCurr || ''))}</td>
          <td>${fmt(h.fc !== undefined ? h.fc : (h.fx !== undefined ? h.fx : ''))}</td>
          <td>${fmt(h.fpx !== undefined ? h.fpx : '')}</td>
          <td>${fmt(h.fPrev !== undefined ? h.fPrev : '')}</td>
        </tr>
      `).join('');

      const cols = r.name.includes('Bisección')
        ? '<th>ITERACIÓN</th><th>a</th><th>b</th><th>c (medio)</th><th>f(c)</th><th>—</th><th>—</th>'
        : r.name.includes('Newton')
        ? '<th>ITERACIÓN</th><th>x</th><th>f(x)</th><th>f′(x)</th><th>x_nuevo</th><th>—</th><th>—</th>'
        : r.name.includes('Secante')
        ? '<th>ITERACIÓN</th><th>x_prev</th><th>x_curr</th><th>f_prev</th><th>f_curr</th><th>x_new</th><th>—</th>'
        : '<th>ITERACIÓN</th><th>VALOR</th><th>—</th><th>—</th><th>—</th><th>—</th><th>—</th>';

      return `<details><summary>${r.name} · ${r.history.length} iteraciones registradas ${r.converged ? '· convergió' : '· no convergió'}</summary><div class="table-wrap"><table><thead><tr>${cols}</tr></thead><tbody>${detalle}</tbody></table></div></details>`;
    }

    // Para métodos sin historial (RK2, RK4, Trapecio, Simpson, Romberg)
    return `<details><summary>${r.name} · Resultado directo (sin iteraciones intermedias) ${r.converged ? '· convergió' : '· no convergió'}</summary><div class="table-wrap"><table><thead><tr><th>MÉTODO</th><th>VALOR</th><th>MAGNITUD</th><th>ERROR ABS.</th><th>ERROR REL.</th><th>ERROR %</th></tr></thead><tbody><tr><td>${r.name}</td><td>${fmt(r.value)}</td><td>${r.magnitud || 'distancia'}</td><td>${fmtError(r.errorAbs)}</td><td>${fmtError(r.errorRel)}</td><td>${fmtError(r.errorPct)}</td></tr></tbody></table></div></details>`;
  }).join('');

  $('iteration-results-det').innerHTML = filas;
}

function renderEscenariosDet(res) {
  const scenarioNames = { normal: 'Normal', estres: 'Estrés', mal: 'Mal condicionado' };
  const filas = Object.entries(presets).map(([s, p]) => {
    const v = {
      v0: p.values[0], tr: p.values[1], a: p.values[2],
      tolerance: p.values[3], h: p.values[4], scenario: s
    };
    const r = simulateDetencion(v);
    const rk4 = r.resultados.find(x => x.name === 'RK4 (distancia)');
    const bis = r.cruce.biseccion;
    return `
      <tr>
        <td>${scenarioNames[s]}</td>
        <td>RK4 (distancia)</td>
        <td>${fmt(rk4 ? rk4.value : 0)}</td>
        <td>distancia</td>
        <td>${fmtError(rk4 ? rk4.errorAbs : 0)}</td>
        <td>${fmtError(rk4 ? rk4.errorRel : 0)}</td>
        <td>${fmtError(rk4 ? rk4.errorPct : 0)}</td>
      </tr>
      <tr>
        <td>${scenarioNames[s]}</td>
        <td>Bisección (tiempo)</td>
        <td>${fmt(bis.root)}</td>
        <td>tiempo</td>
        <td>${fmtError(Math.abs(bis.root - r.ref.tTotal))}</td>
        <td>${fmtError(relError(bis.root, r.ref.tTotal))}</td>
        <td>${fmtError(pctError(bis.root, r.ref.tTotal))}</td>
      </tr>
    `;
  }).join('');
  $('scenario-results-det').innerHTML = filas;
}

function runDet() {
  try {
    const v = inputsDet();
    if (!v.v0 || !v.a || v.tolerance < 1e-10 || v.tolerance > 0.1 || v.h <= 0) {
      throw new Error('Introduce valores válidos: v₀ > 0, a > 0, tolerancia entre 10⁻¹⁰ y 0,1, h > 0.');
    }
    $('error-det').textContent = '';
    const res = simulateDetencion(v);
    last = { entradas: v, resultados: res };
    renderResultados(res);
    return true;
  } catch (e) {
    last = null;
    $('error-det').textContent = e.message;
    $('output-status-det').textContent = 'No se pudo calcular. Corrige las entradas.';
    ['t-cero', 'd-total', 't-ref'].forEach(id => $(id).textContent = '—');
    $('explanation-det').textContent = '';
    $('chart-det').replaceChildren();
    $('chart2-det').replaceChildren();
    ['method-results-det', 'root-results-det', 'iteration-results-det', 'scenario-results-det', 'sensitivity-det', 'conclusion-det'].forEach(id => $(id).replaceChildren());
    return false;
  }
}

$('scenario-det').addEventListener('change', () => {
  const p = presets[$('scenario-det').value];
  $(ids[0]).value = p.values[0];
  $(ids[1]).value = p.values[1];
  $(ids[2]).value = p.values[2];
  $(ids[3]).value = p.values[3];
  $(ids[4]).value = p.values[4];
  $('scenario-det-desc').textContent = p.desc;
  runDet();
});

$('run-det').addEventListener('click', () => {
  if (runDet()) {
    $('output-det').focus({ preventScroll: true });
    $('output-det').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

$('scenario-det').dispatchEvent(new Event('change'));

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
$('save').onclick = async () => { try { runDet(); if (!last) return; let u = await user(); if (!u) { msg('Inicia sesión para guardar.'); return } let db = await database(); let { error } = await db.from('simulaciones').insert({ user_id: u.id, caso: 'detencion', escenario: last.entradas.scenario, entradas: last.entradas, resultados: last.resultados }); msg(error ? error.message : 'Simulación guardada.') } catch (e) { msg(e.message) } };
$('history').onclick = async () => { try { if (!await user()) { msg('Inicia sesión para consultar el historial.'); return } let db = await database(); let { data, error } = await db.from('simulaciones').select('id,caso,escenario,entradas,creado_en').eq('caso', 'detencion').order('creado_en', { ascending: false }).limit(30); if (error) { msg(error.message); return } let list = $('history-list'); list.replaceChildren(); data.forEach(row => { let li = document.createElement('li'), button = document.createElement('button'); button.textContent = `${new Date(row.creado_en).toLocaleString('es-BO')} · ${row.escenario} · Abrir y repetir`; button.onclick = () => { $('scenario-det').value = row.entradas.scenario; $('scenario-det-desc').textContent = presets[row.entradas.scenario].desc; ids.forEach(id => $(id).value = row.entradas[id]); runDet(); msg('Simulación recuperada y repetida con el modelo actual.') }; li.append(button); list.append(li) }); msg(data.length ? `${data.length} simulaciones encontradas.` : 'Aún no hay simulaciones guardadas.') } catch (e) { msg(e.message) } };
updateNavAuth();
