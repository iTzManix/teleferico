// Generado por npm run build. Editar las fuentes, no este archivo.
(()=>{'use strict';
const modules={
"sensores-app.js":(exports,load)=>{
const { mountCloudHistory } = load("cloud-history.js");
const { bindSimulationInputs } = load("live-inputs.js");
const { clearDemo, renderDemo } = load("demo-scenes.js");
const { PRESETS, experiment } = load("experiments.js");
const { historyTable } = load("render.js");
const { mountLocalHistory } = load("local-history-ui.js");
const { simulateSensores } = load("math.js");
const { database } = load("db.js");
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

  const tMin = t[0], tMax = t.at(-1);
  const { umbral } = res.entradas;
  const allY = [...yRef, ...yLag, ...yNew, ...ySpl, ...valores];
  if (Number.isFinite(umbral)) allY.push(umbral);
  const yMin = Math.min(...allY);
  const yMax = Math.max(...allY);
  const yRange = yMax - yMin || 1;

  const scaleX = (ti) => pad + ((ti - tMin) / (tMax - tMin)) * (width - 2 * pad);
  const scaleY = (val) => height - pad - ((val - yMin) / yRange) * (height - 2 * pad);

  const line = (pts, stroke) => `<polyline fill="none" stroke="${stroke}" stroke-width="2" points="${pts}"/>`;

  let ptsRef = t.map((ti, i) => `${scaleX(ti)},${scaleY(yRef[i])}`).join(' ');
  let ptsLag = t.map((ti, i) => `${scaleX(ti)},${scaleY(yLag[i])}`).join(' ');
  let ptsNew = t.map((ti, i) => `${scaleX(ti)},${scaleY(yNew[i])}`).join(' ');
  let ptsSpl = t.map((ti, i) => `${scaleX(ti)},${scaleY(ySpl[i])}`).join(' ');

  const markers = nodos.map((x, i) => `<circle cx="${scaleX(x)}" cy="${scaleY(valores[i])}" r="3" fill="#333"/>`).join('');

  svg.innerHTML = `
    <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="#333" stroke-width="1"/>
    <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" stroke="#333" stroke-width="1"/>
    ${line(ptsRef, '#2e7d32')}
    ${line(ptsLag, '#c62828')}
    ${line(ptsNew, '#1565c0')}
    ${line(ptsSpl, '#7b1fa2')}
    ${Number.isFinite(umbral) ? `<line x1="${pad}" x2="${width-pad}" y1="${scaleY(umbral)}" y2="${scaleY(umbral)}" stroke="#986d46" stroke-dasharray="5 4"/><text x="${width-pad}" y="${scaleY(umbral)-4}" text-anchor="end" font-size="10">Umbral · ${fmt(umbral)}</text>` : ''}
    ${markers}
    <text x="${pad}" y="${height - 6}" fill="#333" font-size="11">${fmt(tMin)}</text>
    <text x="${width - 40}" y="${height - 6}" fill="#333" font-size="11">${fmt(tMax)}</text>
    <text x="${pad-4}" y="${pad+4}" text-anchor="end" fill="currentColor" font-size="9">${fmt(yMax)}</text>
    <text x="${pad-4}" y="${height-pad}" text-anchor="end" fill="currentColor" font-size="9">${fmt(yMin)}</text>
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
    bars += `<text x="${x}" y="${height-pad-barH-5}" text-anchor="middle" fill="currentColor" font-size="10">${fmt(m.valor)}</text>`;
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

function renderResultados(res, preserveTime) {
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
  renderDemo('sensores', res, res.entradas, {preserveTime});
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

  const rOrig = res;
  const rPert = simulateSensores({ ...entradas, scenario: res.scenario, perturbation: epsilon });

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

const runSen = bindSimulationInputs(['funcion-sen', 'n-nodos', 'sen-a', 'sen-b', 'sen-ruido', 'sen-ocultar', 'sen-umbral', 'tol-sen'], calculate);
function calculate(preserveTime) {
  try {
    const v = inputsSen();
    if (!v.nNodos || v.nNodos < 4 || v.b <= v.a || v.tolerance < 1e-10 || v.tolerance > 0.1) {
      throw new Error('Introduce valores válidos: nodos de 4 a 20, b > a, tolerancia entre 10⁻¹⁰ y 0,1.');
    }
    $('error-sen').textContent = '';
    const res = simulateSensores(v);
    last = { entradas: v, resultados: res };
    renderResultados(res, preserveTime);
    return true;
  } catch (e) {
    last = null;
    $('error-sen').textContent = e.message;
    $('output-status-sen').textContent = 'No se pudo calcular. Corrige las entradas.';
    ['err-lag', 'err-new', 'err-spl'].forEach(id => $(id).textContent = '—');
    $('explanation-sen').textContent = '';
    clearDemo('demo-sensores'); $('chart-sen').replaceChildren();
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

Object.assign(exports,{});
},
"cloud-history.js":(exports,load)=>{
// Adaptador de nube: DER transaccional y compatibilidad con el esquema previo.
const {database} = load("db.js");
const {experiment,VERSION,CASES} = load("experiments.js");
const {esc,fmt} = load("render.js");
function cloudPayload(report) {
  // JSON no admite Infinity/NaN: se preservan como texto; no se convierten en cero.
  return JSON.parse(JSON.stringify({caso:report.caso,scenario:report.scenario,inputs:report.inputs,version:report.version,
    reference:report.reference,conclusions:report.conclusions,sensitivity:report.sensitivity,methods:report.methods},
    (_key,value)=>typeof value==='number'&&!Number.isFinite(value)?String(value):value));
}
const missingRpc=error=>error?.code==='PGRST202'||error?.code==='42883';
function canonicalJson(value) {
  if(Array.isArray(value))return '['+value.map(canonicalJson).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonicalJson(value[key])).join(',')+'}';
  return JSON.stringify(value);
}
async function authenticated(db) {
  const {data,error}=await db.auth.getUser();
  if(error||!data?.user)throw Error('Inicia sesión para guardar o recuperar tus experimentos.');
  return data.user;
}
async function saveCloudExperiment(report,requestId,dbOverride) {
  const db=dbOverride||await database(),user=await authenticated(db),payload=cloudPayload(report);
  const {data,error}=await db.rpc('simtele_guardar',{p_experimento:payload,p_solicitud:requestId});
  if(!error)return {id:data,storage:'der',version:payload.version};
  // Solo se usa el esquema anterior si la RPC realmente no existe.
  // Un timeout o error de permisos nunca dispara una segunda escritura alternativa.
  if(!missingRpc(error))throw Error(error.message||'No se pudo guardar el experimento. Reintenta la misma solicitud.');
  const snapshot=JSON.parse(JSON.stringify({...report.output,_simtele_meta:{reference:payload.reference,conclusions:payload.conclusions}},
    (_key,value)=>typeof value==='number'&&!Number.isFinite(value)?String(value):value));
  const row={id:requestId,user_id:user.id,caso:payload.caso,escenario:payload.scenario,entradas:payload.inputs,resultados:snapshot,version_modelo:payload.version};
  const result=await db.from('simulaciones').insert(row).select('id').single();
  if(result.error?.code==='23505') {
    const found=await db.from('simulaciones').select('id,user_id,caso,escenario,entradas,resultados,version_modelo').eq('id',requestId).single();
    if(!found.error&&found.data&&canonicalJson(found.data)===canonicalJson(row))return {id:requestId,storage:'legacy',version:payload.version};
  }
  if(result.error)throw Error(result.error.message);
  return {id:result.data.id,storage:'legacy',version:payload.version};
}
async function listCloudExperiments(caso,dbOverride) {
  const db=dbOverride||await database();await authenticated(db);
  const sync=await db.rpc('simtele_importar_anteriores');
  if(sync.error&&!missingRpc(sync.error))throw Error(sync.error.message);
  if(!sync.error){
    const {data,error}=await db.rpc('simtele_listar',{p_caso:caso||null,p_limite:30});
    if(error)throw Error(error.message);
    return (data||[]).map(row=>({...row,storage:'der'}));
  }
  let query=db.from('simulaciones').select('id,caso,escenario,entradas,creado_en,version_modelo');
  if(caso)query=query.eq('caso',caso);
  const {data,error}=await query.order('creado_en',{ascending:false}).limit(30);
  if(error)throw Error(error.message);
  return (data||[]).map(row=>({...row,storage:'legacy'}));
}
async function loadCloudExperiment(row,dbOverride) {
  const db=dbOverride||await database();await authenticated(db);
  if(row.storage==='der') {
    const {data,error}=await db.rpc('simtele_recuperar',{p_id:row.id});
    if(error)throw Error(error.message);
    if(!data||!Array.isArray(data.methods))throw Error('El experimento recuperado está incompleto.');
    return data;
  }
  const {data,error}=await db.from('simulaciones').select('*').eq('id',row.id).single();
  if(error)throw Error(error.message);
  const raw=data.resultados;
  return {id:data.id,caso:data.caso,scenario:data.escenario,inputs:data.entradas,version:data.version_modelo||'1',createdAt:data.creado_en,
    methods:Array.isArray(raw)?raw:(raw?.results||raw?.resultados||[]),reference:raw?._simtele_meta?.reference||raw?.ref,original:raw};
}
function compareCloudSnapshot(saved,current) {
  const stable=xs=>JSON.stringify(xs,(_key,value)=>typeof value==='number'&&!Number.isFinite(value)?String(value):value);
  const values=methods=>methods.map(m=>[m.name,m.value??m.x??m.valor]);
  return {sameVersion:saved.version===current.version,sameValues:stable(values(saved.methods))===stable(values(cloudPayload(current).methods))};
}
function mountCloudHistory(caso,getInputs,restore) {
  const save=document.getElementById('save'),history=document.getElementById('history'),list=document.getElementById('history-list');
  const accountList=document.getElementById('account-history-list');
  const msg=text=>document.querySelectorAll('[data-msg], #account-message, #save-message').forEach(el=>el.textContent=text);
  const snapshot=document.createElement('section');snapshot.className='panel cloud-snapshot';snapshot.hidden=true;
  document.getElementById('simulador').append(snapshot);
  let pending=null;
  save.onclick=async()=>{
    if(save.disabled)return;save.disabled=true;
    try {
      const inputs=getInputs(),report=experiment(caso,inputs.scenario,inputs),body=JSON.stringify(cloudPayload(report));
      if(!pending||pending.body!==body)pending={body,id:crypto.randomUUID()};
      const result=await saveCloudExperiment(report,pending.id);pending=null;
      msg(`Experimento ${result.id} guardado · modelo ${result.version} · ${result.storage==='der'?'DER de Supabase':'esquema anterior compatible (migración del DER pendiente)'}.`);
    }catch(e){msg(e.message);}finally{save.disabled=false;}
  };
  async function showSaved(row) {
    const saved=await loadCloudExperiment(row);snapshot.hidden=false;
    snapshot.innerHTML=`<h3>Resultado original guardado · ${esc(CASES[saved.caso]||saved.caso)}</h3><p>Experimento ${esc(saved.id)} · versión ${esc(saved.version)}. Este snapshot no se recalcula al abrirlo.</p><div class="table-wrap"><table><thead><tr><th>Método</th><th>Valor guardado</th><th>Error absoluto guardado</th><th>Residuo guardado</th></tr></thead><tbody>${saved.methods.map(m=>`<tr><td>${esc(m.name)}</td><td>${fmt(m.value??m.x??m.valor)}</td><td>${fmt(m.errorAbs??m.error)}</td><td>${fmt(m.residuo??m.residual)}</td></tr>`).join('')}</tbody></table></div>`;
    msg(`Recuperado ${saved.id}: ${saved.methods.length} métodos originales, modelo ${saved.version}.`);
    return saved;
  }
  history.onclick=async()=>{
    if(history.disabled)return;history.disabled=true;
    try {
      const rows=await listCloudExperiments(caso);list.replaceChildren();accountList?.replaceChildren();
      for(const row of rows) {
        const li=document.createElement('li'),open=document.createElement('button'),repeat=document.createElement('button');
        open.textContent=`${new Date(row.creado_en).toLocaleString('es-BO')} · ${row.escenario} · v${row.version_modelo} · Ver guardado`;
        open.onclick=()=>showSaved(row).catch(e=>msg(e.message));repeat.textContent='Repetir entradas';
        repeat.onclick=async()=>{try{const saved=await showSaved(row);restore({...saved.inputs,scenario:saved.scenario});const current=experiment(caso,saved.scenario,{...saved.inputs,scenario:saved.scenario}),check=compareCloudSnapshot(saved,current);
          msg(`Experimento ${row.id} recuperado y repetido. ${check.sameVersion?(check.sameValues?'La misma versión reproduce los valores guardados.':'La misma versión produjo diferencias: revisa las entradas.'): 'Versión guardada '+saved.version+'; actual '+VERSION+'. Las diferencias deben interpretarse como cambio de modelo.'}`);
        }catch(e){msg(e.message);}};
        li.append(open,repeat);list.append(li);
        if(accountList){const extra=document.createElement('li'),button=document.createElement('button');button.textContent=open.textContent;button.onclick=open.onclick;extra.append(button);accountList.append(extra);}
      }
      msg(rows.length?`${rows.length} experimentos de ${CASES[caso]} recuperados.`:'No hay experimentos guardados para este caso.');
    }catch(e){msg(e.message);}finally{history.disabled=false;}
  };
}

Object.assign(exports,{cloudPayload,missingRpc,canonicalJson,saveCloudExperiment,listCloudExperiments,loadCloudExperiment,compareCloudSnapshot,mountCloudHistory});
},
"db.js":(exports,load)=>{
// db.js — Conexión compartida a Supabase (reutilizable por todos los módulos)
let dbPromise;

function database() {
  return dbPromise ||= import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.89.0/+esm')
    .then(({ createClient }) => createClient(
      'https://ucgkylgsvcymepplvias.supabase.co',
      'sb_publishable_-j_8z-D6DpdNgsVxvqOZug_Ob2eUvtx'
    ))
    .catch(() => { dbPromise = null; throw Error('No se pudo conectar con el servicio de historial. Comprueba tu conexión.') })
}

Object.assign(exports,{database});
},
"experiments.js":(exports,load)=>{
const {simulate, direct, simulateDetencion, simulateViento, simulateSensores} = load("math.js");
const VERSION='3.0.0';
const CASES={detencion:'Detención de emergencia',deterioro:'Deterioro mecánico',viento:'Oscilaciones por viento',sensores:'Reconstrucción de sensores'};
const SCENARIOS={normal:'Normal',estres:'Estrés',mal:'Mal condicionado'};
const PRESETS={
  deterioro:{normal:{values:[13,15.5,19,3,60,1e-6],desc:'Curva D = 10 + 2t + 0,5t²; mediciones en 0, 1 y 2 meses.'},estres:{values:[18,23,30,3,60,1e-6],desc:'Curva D = 15 + 4t + t²; crecimiento más rápido.'},mal:{values:[13,13.0402,13.0808,3,60,1e-6],desc:'La misma curva normal, medida en 0, 0,02 y 0,04 meses. Se aísla la sensibilidad.'}},
  detencion:{normal:{values:[10,1,2,1e-6,.1],desc:'Reacción a velocidad constante y frenado hasta v = 0.'},estres:{values:[15,1.5,1.5,1e-6,.1],desc:'Más velocidad, mayor reacción y menor desaceleración.'},mal:{values:[10,1,2,1e-6,.1],desc:'Misma dinámica normal. Identificación sensible del frenado con dos velocidades casi iguales; véase Validación.'}},
  viento:{normal:{values:[500,50,200,100,0,0,1e-6,.4],desc:'Oscilador amortiguado con fuerza constante de 100 N.'},estres:{values:[500,20,200,200,0,0,1e-6,.4],desc:'Mayor fuerza y menor amortiguamiento.'},mal:{values:[500,50,200,100,0,0,1e-6,.4],desc:'Misma dinámica normal. Identificación de c y k con observaciones casi dependientes; véase Validación.'}},
  sensores:{normal:{values:['sin',7,0,2*Math.PI,0,2,.5,1e-6],desc:'Se retiran dos observaciones antes de construir los interpolantes.'},estres:{values:['sin',7,0,2*Math.PI,.08,3,.5,1e-6],desc:'Tres observaciones ausentes y ruido determinista de amplitud 0,08.'},mal:{values:['sin',9,0,2*Math.PI,0,2,.5,1e-6],desc:'Nodos agrupados hacia el inicio (t = a + (b−a)u⁵). Se cuantifica la amplificación de una perturbación.'}}
};
const KEYS={deterioro:['y0','y1','y2','bias','threshold','tolerance'],detencion:['v0','tr','a','tolerance','h'],viento:['m','c','k','F','x0','v0','tolerance','h'],sensores:['funcion','nNodos','a','b','ruido','puntosOcultar','umbral','tolerance']};
function presetInputs(caso,scenario) {return {...Object.fromEntries(KEYS[caso].map((k,i)=>[k,PRESETS[caso][scenario].values[i]])),scenario};}
const SOLVERS={deterioro:simulate,detencion:simulateDetencion,viento:simulateViento,sensores:simulateSensores};
const f=n=>Number.isFinite(n)?Number(n).toPrecision(5):'no finito';
const matNorm=A=>Math.max(...A.map(r=>r.reduce((s,v)=>s+Math.abs(v),0)));
function conditionInf(A) {
  const columns=A.map((_,i)=>direct(A,A.map((_,j)=>i===j?1:0)));
  return matNorm(A)*matNorm(A.map((_,i)=>columns.map(c=>c[i])));
}
function identification(C,truth,eps) {
  const y=C.map(r=>r.reduce((s,v,i)=>s+v*truth[i],0)),z=y.slice(); z[z.length-1]+=eps;
  const original=direct(C,y),perturbed=direct(C,z),change=Math.hypot(...original.map((v,i)=>v-perturbed[i]));
  return {C,y,original,perturbed,epsilon:eps,change,amplification:change/eps,condition:conditionInf(C)};
}
function experiment(caso,scenario,custom) {
  const inputs=custom?{...custom,scenario}:presetInputs(caso,scenario), start=performance.now(), output=SOLVERS[caso](inputs),elapsed=performance.now()-start;
  let methods,reference,conclusions,check,sensitivity;
  if(caso==='deterioro') {
    methods=output.results.map(m=>({...m,value:m.x,reference:output.ref,unit:'vector de parámetros',errorAbs:m.error,errorRel:m.relativeError,errorPct:m.relativeError===null?null:100*m.relativeError,residuo:m.residual}));
    const h=output.times[1],beta=(inputs.y2-2*inputs.y1+inputs.y0)/(2*h*h),alpha=(inputs.y1-inputs.y0)/h-beta*h,independent=[inputs.y0-inputs.bias,alpha,beta,inputs.bias];
    check=Math.hypot(...independent.map((v,i)=>v-output.ref[i]))<1e-7;
    reference={kind:'Diferencias finitas de las tres lecturas y calibración independiente',parameters:independent,crossing:output.crossing,condition:output.condition};
    const pert=simulate({...inputs,y2:inputs.y2+1e-4});
    sensitivity={epsilon:1e-4,change:Math.abs(pert.ref[2]-output.ref[2]),amplification:Math.abs(pert.ref[2]-output.ref[2])/1e-4,condition:output.condition,detail:'Cambio en β al aumentar y₂ en 0,0001 puntos. κ₂ corresponde a CᵀC; las ecuaciones normales elevan al cuadrado κ₂(C).'};
    const gc=methods.find(m=>m.name==='Gradiente conjugado');
    conclusions={numerical:`Jacobi diverge en esta matriz. Gauss-Seidel y gradiente conjugado deben evaluarse por error y residuo: GC termina con error relativo ${f(100*gc.errorRel)} %. κ₂(A) = ${f(output.condition)}. Las normas de parámetros mezclan unidades; los errores por coeficiente se obtienen de los vectores de la tabla.`,problem:`Con D₀ = ${f(output.ref[0])}, α = ${f(output.ref[1])} y β = ${f(output.ref[2])}, el umbral hipotético ${inputs.threshold} se alcanza en ${output.crossing===null?'un tiempo no definido bajo el supuesto de crecimiento':f(output.crossing)+' meses'}. Es una proyección del índice, no el instante de falla del rodamiento.`};
  } else if(caso==='detencion') {
    methods=output.resultados; reference={kind:'Solución analítica por tramos: reacción + frenado uniforme',...output.ref};
    check=methods.every(m=>m.converged && m.errorAbs<Math.max(1e-7,inputs.tolerance*10));
    const speed=inputs.v0||10,delta=scenario==='mal'?.001:5;
    sensitivity={...identification([[speed,speed*speed],[speed+delta,(speed+delta)**2]],[inputs.tr,1/(2*inputs.a)],1e-4),detail:'Identificación de [tᵣ, q], q = 1/(2a), desde d(v) = v·tᵣ + v²q. Solo cambia la separación de velocidades del experimento, no el frenado físico. κ∞ de la matriz de observaciones.'};
    conclusions={numerical:'Raíces, cuadraturas y RK se comparan con la referencia de su propia magnitud. Al separar la reacción del frenado se elimina el sesgo anterior. Para aceleración constante, RK2/RK4 y las cuadraturas pueden ser exactos salvo redondeo; eso no prueba su exactitud en una dinámica general.',problem:`La cabina se detiene a los ${f(output.ref.tTotal)} s tras recorrer ${f(output.ref.dTotal)} m. La reacción aporta ${f(inputs.v0*inputs.tr)} m. Velocidad inicial y capacidad de frenado determinan el margen de parada bajo estos supuestos.`};
  } else if(caso==='viento') {
    methods=output.resultados; reference={kind:output.ref.kind,xMax:output.ref.xMax,integrals:methods.filter(m=>m.name.startsWith('Romberg')).map(m=>({name:m.name,value:m.reference,unit:m.unit}))};
    check=methods.filter(m=>m.name.startsWith('RK4')).every(m=>m.trajectoryError<.01);
    const delta=scenario==='mal'?1e-5:1;
    sensitivity={...identification([[1,1],[2,2+delta]],[inputs.c,inputs.k],1e-4),detail:'Identificación [c, k] a partir de F−m·x″ = c·v + k·x. Filas [v, x] sintéticas; casi dependientes en MAL. κ∞ mide sensibilidad del problema inverso, no inestabilidad física.'};
    const r2=methods[0],r4=methods[1];
    conclusions={numerical:`La trayectoria se valida con la solución analítica: error máximo RK2 = ${f(r2.trajectoryError)} m y RK4 = ${f(r4.trajectoryError)} m. Las tablas refinan h; cada integral usa una referencia adaptativa independiente con sus unidades. El máximo muestreado añade error de localización del pico.`,problem:`El máximo de desplazamiento de referencia muestreado en 30 s es ${f(output.ref.xMax)} m. La fuerza constante desplaza el equilibrio a ${f(inputs.F/inputs.k)} m. El caso mal condicionado estudia la identificación de parámetros, manteniendo la misma dinámica normal.`};
  } else {
    methods=output.resultados; reference={kind:'Señal analítica conocida; observaciones ocultas retiradas antes de interpolar',signal:inputs.funcion,withheld:output.withheld.map(t=>({t,value:inputs.funcion==='sin'?Math.sin(t):Math.exp(-t)})),trainingNodes:output.nodos};
    check=output.withheld.every(t=>!output.nodos.includes(t))&&methods.every(m=>Number.isFinite(m.errorAbs));
    const pert=simulateSensores({...inputs,perturbation:(inputs.perturbation||0)+1e-8}),change=Math.max(...pert.grafica.yLag.map((v,i)=>Math.abs(v-output.grafica.yLag[i])));
    sensitivity={epsilon:1e-8,change,amplification:change/1e-8,detail:'Cambio máximo del interpolante de Lagrange en una malla de 121 puntos al aumentar únicamente la primera lectura de entrenamiento en 10⁻⁸. No se perturban los datos ocultos.'};
    const best=methods.reduce((a,b)=>a.errorAbs<b.errorAbs?a:b);
    conclusions={numerical:`Newton y Lagrange representan el mismo polinomio para los mismos datos; sus discrepancias numéricas deben observarse en nodos agrupados. El menor MAE oculto de esta ejecución es ${f(best.errorAbs)} (${best.name}). El spline natural conserva continuidad de primera y segunda derivadas. El error relativo se calcula como ||predicción−verdad||₂ / ||verdad||₂ en datos ocultos.`,problem:`Se reconstruyen ${output.withheld.length} observaciones retiradas, usando ${output.nodos.length} lecturas disponibles. El ruido y la distribución de observaciones afectan la precisión. El error en nodos de entrenamiento no sustituye la validación en datos ausentes.`};
  }
  return {caso,scenario,inputs,version:VERSION,elapsed,reference,referenceVerified:check,methods,sensitivity,conclusions,output};
}
function allExperiments() {return Object.keys(CASES).flatMap(c=>Object.keys(SCENARIOS).map(s=>experiment(c,s)));}
const INTEGRATION='La confiabilidad depende de un modelo coherente, una referencia independiente y una métrica con unidades correctas. La convergencia del algoritmo no garantiza precisión de los parámetros ni validez física. El estrés cambia la exigencia del fenómeno; el mal condicionamiento amplifica incertidumbres del problema matemático. Los cuatro casos permiten evaluar estas diferencias sin inferir fallas reales de Mi Teleférico.';

Object.assign(exports,{VERSION,CASES,SCENARIOS,PRESETS,presetInputs,SOLVERS,conditionInf,experiment,allExperiments,INTEGRATION});
},
"math.js":(exports,load)=>{
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0), norm = a => Math.hypot(...a);
const mv = (A, x) => A.map(row => dot(row, x));

function direct(A, b) {
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

function simulate({ y0, y1, y2, bias, threshold, tolerance, scenario }) { let times = scenario === 'mal' ? [0, .02, .04] : [0, 1, 2], observations = [y0, y1, y2, bias]; if (!observations.concat([threshold, tolerance]).every(Number.isFinite) || tolerance < 1e-10 || tolerance > .1) throw Error('Introduce números válidos y una tolerancia entre 10⁻¹⁰ y 0,1.'); let C = times.map(t => [1, t, t * t, 1]); C.push([0, 0, 0, 1]); let A = Array.from({ length: 4 }, (_, i) => Array.from({ length: 4 }, (_, j) => C.reduce((s, r) => s + r[i] * r[j], 0))), b = Array.from({ length: 4 }, (_, i) => C.reduce((s, r, k) => s + r[i] * observations[k], 0)), ref = direct(C, observations), results = []; function record(name, x, it, history = []) { let residual = norm(mv(A, x).map((v, i) => v - b[i])), error = norm(x.map((v, i) => v - ref[i])); results.push({ name, x, it, residual, error, relativeError: norm(ref) === 0 ? null : error / norm(ref), history, converged: Number.isFinite(residual) && residual <= tolerance }) } record('LU (pivoteo)', direct(A, b), 0); for (const name of ['Jacobi', 'Gauss-Seidel']) { let x = [0, 0, 0, 0], it = 0, history = []; for (; it < 1000; it++) { let old = x.slice(); for (let i = 0; i < 4; i++) { let sum = 0; for (let j = 0; j < 4; j++)if (j !== i) sum += A[i][j] * (name === 'Jacobi' ? old[j] : x[j]); x[i] = (b[i] - sum) / A[i][i] } if (!x.every(Number.isFinite)) { it++; break } let residual = norm(mv(A, x).map((v, i) => v - b[i])), error = norm(x.map((v, i) => v - ref[i])); if (!Number.isFinite(residual) || !Number.isFinite(error)) { it++; break } history.push({ iteration: it + 1, x: x.slice(), residual, error }); if (residual <= tolerance) { it++; break } } record(name, x, it, history) } let x = [0, 0, 0, 0], r = b.slice(), p = r.slice(), rr = dot(r, r), it = 0, history = []; while (it < 1000 && Math.sqrt(rr) > tolerance) { let Ap = mv(A, p), den = dot(p, Ap); if (!Number.isFinite(den) || den <= 0) break; let step = rr / den; x = x.map((v, i) => v + step * p[i]); r = r.map((v, i) => v - step * Ap[i]); let next = dot(r, r); p = r.map((v, i) => v + (next / rr) * p[i]); rr = next; it++; history.push({ iteration: it, x: x.slice(), residual: norm(mv(A, x).map((v, i) => v - b[i])), error: norm(x.map((v, i) => v - ref[i])) }) } record('Gradiente conjugado', x, it, history); let [d, a, beta] = ref, delta = threshold - d, crossing = null; if (delta <= 0) crossing = 0; else if (beta > 0 && a >= 0) crossing = 2 * delta / (a + Math.sqrt(a * a + 4 * beta * delta)); else if (beta === 0 && a > 0) crossing = delta / a; return { ref, results, condition: condition(A), crossing, times, A, b } }


Object.assign(exports,load("numerics.js"));
Object.assign(exports,{direct,simulate});
},
"numerics.js":(exports,load)=>{
// Núcleo verificable v3. Unidades y referencias se conservan por magnitud.
const absError = (x, ref) => Math.abs(x - ref);
const relError = (x, ref) => ref === 0 || !Number.isFinite(ref) ? null : absError(x, ref) / Math.abs(ref);
const pctError = (x, ref) => relError(x, ref) === null ? null : 100 * relError(x, ref);
const sensitivity = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const isFiniteResult = Number.isFinite;
const residualNorm = (A, x, b) => Math.hypot(...A.map((r, i) => r.reduce((s, v, j) => s + v * x[j], -b[i])));
function finite(...xs) { if (!xs.every(Number.isFinite)) throw Error('Las entradas deben ser números finitos.'); }
function options(tol, maxIter) { if (!(tol > 0) || !Number.isInteger(maxIter) || maxIter < 1 || maxIter > 10000) throw Error('Tolerancia o máximo de iteraciones inválido.'); }
function bisection(f, a, b, {tol = 1e-6, maxIter = 1000} = {}) {
  finite(a, b); options(tol, maxIter);
  const history = []; let fa = f(a), fb = f(b);
  if (!Number.isFinite(fa) || !Number.isFinite(fb) || a > b) return {root:null, converged:false, iterations:0, history, reason:'Intervalo inválido'};
  if (fa === 0 || fb === 0) return {root:fa === 0 ? a : b, converged:true, iterations:0, history};
  if (Math.sign(fa) === Math.sign(fb)) return {root:null, converged:false, iterations:0, history, reason:'No hay cambio de signo'};
  let c;
  for (let i = 1; i <= maxIter; i++) {
    c = a + (b - a) / 2; const fc = f(c);
    history.push({iteration:i, a, b, c, fc, residual:Math.abs(fc), width:(b-a)/2});
    if (!Number.isFinite(fc)) break;
    if (fc === 0 || (b-a)/2 <= tol) return {root:c, converged:true, iterations:i, history};
    if (Math.sign(fa) !== Math.sign(fc)) { b = c; fb = fc; } else { a = c; fa = fc; }
  }
  return {root:c, converged:false, iterations:history.length, history};
}
function newton(f, df, x, {tol = 1e-6, maxIter = 1000} = {}) {
  finite(x); options(tol, maxIter); const history = [];
  for (let i = 1; i <= maxIter; i++) {
    const fx = f(x), d = df(x);
    if (!Number.isFinite(fx)) break;
    if (Math.abs(fx) <= tol) return {root:x, converged:true, iterations:history.length, history};
    if (!Number.isFinite(d) || Math.abs(d) < 1e-200) break;
    const next = x - fx/d;
    if (!Number.isFinite(next)) break;
    history.push({iteration:i, x:next, fx:f(next), residual:Math.abs(f(next)), step:Math.abs(next-x)});
    if (Math.abs(next-x) <= tol && Math.abs(f(next)) <= tol) return {root:next, converged:true, iterations:i, history};
    x = next;
  }
  return {root:x, converged:false, iterations:history.length, history, reason:'Derivada, estancamiento o límite de iteraciones'};
}
function secant(f, x0, x1, {tol = 1e-6, maxIter = 1000} = {}) {
  finite(x0,x1); options(tol,maxIter); const history=[];
  for (let i=1;i<=maxIter;i++) {
    const f0=f(x0), f1=f(x1);
    if (Number.isFinite(f1) && Math.abs(f1)<=tol) return {root:x1,converged:true,iterations:history.length,history};
    if (![f0,f1].every(Number.isFinite) || Math.abs(f1-f0)<1e-200) break;
    const next=x1-f1*(x1-x0)/(f1-f0); if (!Number.isFinite(next)) break;
    history.push({iteration:i,x:next,fx:f(next),residual:Math.abs(f(next)),step:Math.abs(next-x1)});
    if (Math.abs(next-x1)<=tol && Math.abs(f(next))<=tol) return {root:next,converged:true,iterations:i,history};
    x0=x1; x1=next;
  }
  return {root:x1,converged:false,iterations:history.length,history,reason:'Secante degenerada o límite de iteraciones'};
}
function nodesValid(xs, ys) {
  if (xs.length !== ys.length || xs.length < 2 || !xs.concat(ys).every(Number.isFinite) || xs.some((v,i)=>i && v<=xs[i-1])) throw Error('Nodos finitos, distintos y ordenados requeridos.');
}
function lagrange(xs, ys, x) {
  nodesValid(xs,ys);
  return ys.reduce((s,y,i)=>s+y*xs.reduce((p,v,j)=>j===i?p:p*(x-v)/(xs[i]-v),1),0);
}
function newtonDividedDiff(xs,ys,x) {
  nodesValid(xs,ys); const a=ys.slice(), n=xs.length;
  for(let j=1;j<n;j++) for(let i=n-1;i>=j;i--) a[i]=(a[i]-a[i-1])/(xs[i]-xs[i-j]);
  let value=a[n-1]; for(let i=n-2;i>=0;i--) value=a[i]+(x-xs[i])*value;
  return value;
}
function cubicSpline(xs,ys,x) {
  nodesValid(xs,ys); const n=xs.length, M=Array(n).fill(0), mu=Array(n).fill(0), z=Array(n).fill(0);
  for(let i=1;i<n-1;i++) {
    const left=xs[i]-xs[i-1], right=xs[i+1]-xs[i];
    const den=2*(left+right)-left*mu[i-1];
    mu[i]=right/den;
    z[i]=(6*((ys[i+1]-ys[i])/right-(ys[i]-ys[i-1])/left)-left*z[i-1])/den;
  }
  for(let i=n-2;i>=0;i--) M[i]=z[i]-mu[i]*M[i+1];
  let j=0; while(j<n-2 && xs[j+1]<x) j++;
  const h=xs[j+1]-xs[j], A=(xs[j+1]-x)/h, B=(x-xs[j])/h;
  return A*ys[j]+B*ys[j+1]+((A*A*A-A)*M[j]+(B*B*B-B)*M[j+1])*h*h/6;
}
function intervals(n) { if(!Number.isInteger(n) || n<1 || n>200000) throw Error('Subintervalos: entero entre 1 y 200000.'); }
function trapezoid(f,a,b,n=1000) {
  intervals(n); finite(a,b); const h=(b-a)/n; let sum=(f(a)+f(b))/2;
  for(let i=1;i<n;i++) sum+=f(a+i*h); return sum*h;
}
function simpson(f,a,b,n=1000) {
  intervals(n); finite(a,b); n+=n%2; const h=(b-a)/n; let sum=f(a)+f(b);
  for(let i=1;i<n;i++) sum+=(i%2?4:2)*f(a+i*h); return sum*h/3;
}
function romberg(f,a,b,maxDepth=10,tol=1e-10) {
  if(!Number.isInteger(maxDepth)||maxDepth<2||maxDepth>17||!(tol>0)) throw Error('Profundidad o tolerancia inválida.');
  const table=[[trapezoid(f,a,b,1)]];
  for(let i=1;i<maxDepth;i++) {
    table[i]=[trapezoid(f,a,b,2**i)];
    for(let j=1;j<=i;j++) table[i][j]=table[i][j-1]+(table[i][j-1]-table[i-1][j-1])/(4**j-1);
    if(Math.abs(table[i][i]-table[i-1][i-1])<=tol) return {value:table[i][i],depth:i+1,converged:true,table};
  }
  return {value:table.at(-1).at(-1),depth:maxDepth,converged:false,table};
}
function rk2Step(f,t,y,h) { const a=f(t,y), b=f(t+h/2,y.map((v,i)=>v+h*a[i]/2)); return y.map((v,i)=>v+h*b[i]); }
function rk4Step(f,t,y,h) {
  const a=f(t,y),b=f(t+h/2,y.map((v,i)=>v+h*a[i]/2)),c=f(t+h/2,y.map((v,i)=>v+h*b[i]/2)),d=f(t+h,y.map((v,i)=>v+h*c[i]));
  return y.map((v,i)=>v+h*(a[i]+2*b[i]+2*c[i]+d[i])/6);
}
function integrate(step,f,t0,y0,end,h) {
  finite(t0,end,h,...y0);
  if(h<=0 || end<t0 || Math.ceil((end-t0)/h)>200000) throw Error('Paso o intervalo de integración inválido (máximo 200000 pasos).');
  const t=[t0],y=[y0.slice()]; let ti=t0,yi=y0.slice();
  const n=Math.ceil((end-t0)/h);
  for(let i=0;i<n;i++) {
    const next=i===n-1?end:Math.min(end,t0+(i+1)*h);
    yi=step(f,ti,yi,next-ti); ti=next;
    if(!yi.every(Number.isFinite)) throw Error('La trayectoria desbordó. Reduce el paso o revisa los parámetros.');
    t.push(ti); y.push(yi.slice());
  }
  return {t,y};
}
const rk2=(f,t,y,end,h)=>integrate(rk2Step,f,t,y,end,h);
const rk4=(f,t,y,end,h)=>integrate(rk4Step,f,t,y,end,h);
const metric=(name,value,ref,unit,extra={})=>({name,value,reference:ref,unit,magnitud:unit,errorAbs:absError(value,ref),errorRel:relError(value,ref),errorPct:pctError(value,ref),converged:Number.isFinite(value),residuo:null,history:[],...extra});
function simulateDetencion({v0,tr,a,tolerance=1e-6,h=.01,scenario='normal'}) {
  finite(v0,tr,a,tolerance,h); if(v0<0||tr<0||a<=0||h<=0||tolerance<=0) throw Error('Se requiere v₀ ≥ 0, reacción ≥ 0, a > 0, paso y tolerancia positivos.');
  const tb=v0/a, total=v0===0?0:tr+tb, distance=v0*tr+v0*v0/(2*a);
  const ref={tTotal:total,dTotal:distance};
  function trajectory(solver,step) {
    if(v0===0) return {t:[0],y:[[0,0]]};
    const reaction=solver((_t,[_x,v])=>[v,0],0,[0,v0],tr,step);
    const brake=solver((_t,[_x,v])=>[v,-a],tr,reaction.y.at(-1),total,step);
    brake.y.at(-1)[1]=0;
    return {t:[...reaction.t,...brake.t.slice(1)],y:[...reaction.y,...brake.y.slice(1)]};
  }
  const sol2=trajectory(rk2,h), sol4=trajectory(rk4,h);
  const vf=t=>v0-a*(t-tr), rootOptions={tol:tolerance};
  const zero={root:0,converged:true,iterations:0,history:[]};
  const roots=v0===0?{biseccion:zero,newton:zero,secante:zero}:{biseccion:bisection(vf,tr,tr+tb*1.3,rootOptions),newton:newton(vf,()=>-a,tr,rootOptions),secante:secant(vf,tr,tr+tb*1.3,rootOptions)};
  const results=[];
  for(const [name,solver,sol] of [['RK2',rk2,sol2],['RK4',rk4,sol4]]) {
    const history=[h,h/2,h/4].map((step,i)=>{const value=trajectory(solver,step).y.at(-1)[0];return {iteration:i+1,h:step,value,error:absError(value,distance)};});
    results.push(metric(name+' (distancia)',sol.y.at(-1)[0],distance,'m',{history,tiempo:total}));
  }
  const n=Math.max(2,Math.ceil(tb/h));
  const quadrature=(method,count)=>v0===0?0:v0*tr+method(t=>v0-a*t,0,tb,count);
  for(const [name,method] of [['Trapecio',trapezoid],['Simpson 1/3',simpson]]) {
    const history=[Math.max(2,Math.ceil(n/4)),Math.max(2,Math.ceil(n/2)),n].map((count,i)=>{const value=quadrature(method,count);return {iteration:i+1,n:method===simpson?count+count%2:count,value,error:absError(value,distance)};});
    results.push(metric(name+' (distancia)',quadrature(method,n),distance,'m',{history,tiempo:total}));
  }
  const rb=v0===0?{value:0,depth:0,converged:true,table:[]}:romberg(t=>v0-a*t,0,tb,12,tolerance);
  results.push(metric('Romberg (distancia)',v0*tr+rb.value,distance,'m',{converged:rb.converged,history:rb.table.map((row,i)=>({iteration:i+1,n:2**i,value:v0*tr+row[i],error:absError(v0*tr+row[i],distance)})),profundidad:rb.depth}));
  for(const [name,key] of [['Bisección','biseccion'],['Newton','newton'],['Secante','secante']]) {
    const r=roots[key]; results.push(metric(name+' (tiempo)',r.root,total,'s',{converged:r.converged,iteraciones:r.iterations,history:r.history.map(row=>({...row,error:absError(row.c??row.x,total)})),residuo:v0===0?0:Math.abs(vf(r.root))}));
  }
  return {scenario,entradas:{v0,tr,a,tolerance,h},ref,resultados:results,cruce:roots,grafica:{t:sol4.t,x:sol4.y.map(y=>y[0]),v:sol4.y.map(y=>Math.max(0,y[1])),tCruce:total,dTotal:distance}};
}
// Solución exacta del oscilador lineal con fuerza constante, todos los regímenes.
function windExact({m,c,k,F,x0,v0},t) {
  const eq=F/k,q=x0-eq,g=c/(2*m),w2=k/m,disc=g*g-w2;
  if(Math.abs(disc)<=1e-12*Math.max(w2,g*g)) return eq+Math.exp(-g*t)*(q+(v0+g*q)*t);
  if(disc<0) { const w=Math.sqrt(-disc);return eq+Math.exp(-g*t)*(q*Math.cos(w*t)+(v0+g*q)*Math.sin(w*t)/w); }
  const d=Math.sqrt(disc),r1=-w2/(g+d),r2=-g-d,A=(v0-r2*q)/(r1-r2),B=q-A;
  return eq+A*Math.exp(r1*t)+B*Math.exp(r2*t);
}
// Referencia de cuadratura independiente: Simpson adaptativo por 64 segmentos.
function adaptiveIntegral(f,a,b,tol=1e-11) {
  function rec(a,b,fa,fm,fb,S,eps,depth) {
    const mid=(a+b)/2,fl=f((a+mid)/2),fr=f((mid+b)/2),L=(mid-a)*(fa+4*fl+fm)/6,R=(b-mid)*(fm+4*fr+fb)/6,delta=L+R-S;
    if(depth===0 && Math.abs(delta)>15*eps) throw Error('La referencia adaptativa no alcanzó precisión.');
    if(Math.abs(delta)<=15*eps || depth===0) return L+R+delta/15;
    return rec(a,mid,fa,fl,fm,L,eps/2,depth-1)+rec(mid,b,fm,fr,fb,R,eps/2,depth-1);
  }
  let value=0; for(let i=0;i<64;i++) { const l=a+(b-a)*i/64,r=a+(b-a)*(i+1)/64,fa=f(l),fm=f((l+r)/2),fb=f(r); value+=rec(l,r,fa,fm,fb,(r-l)*(fa+4*fm+fb)/6,tol/64,22); }
  return value;
}
function simulateViento(p) {
  const {m,c,k,F,x0,v0,tolerance=1e-6,h=.01,scenario='normal'}=p;
  finite(m,c,k,F,x0,v0,tolerance,h); if(m<=0||k<=0||c<0||h<=0||tolerance<=0) throw Error('m y k positivos, c ≥ 0, paso y tolerancia positivos requeridos.');
  const f=(_t,[x,v])=>[v,(F-c*v-k*x)/m], end=30, exact=t=>windExact(p,t),sol2=rk2(f,0,[x0,v0],end,h),sol4=rk4(f,0,[x0,v0],end,h);
  const grid=Array.from({length:6001},(_,i)=>end*i/6000),xr=grid.map(exact),maxRef=Math.max(...xr.map(Math.abs));
  const results=[];
  for(const [name,solver,sol] of [['RK2',rk2,sol2],['RK4',rk4,sol4]]) {
    const trajectoryError=s=>Math.max(...s.y.map((y,i)=>Math.abs(y[0]-exact(s.t[i]))));
    const history=[h,h/2,h/4].map((step,i)=>({iteration:i+1,h:step,error:trajectoryError(step===h?sol:solver(f,0,[x0,v0],end,step))}));
    const xMax=Math.max(...sol.y.map(y=>Math.abs(y[0])));
    results.push(metric(name+' (ampl. máx.)',xMax,maxRef,'m',{magnitud:'amplitud',trajectoryError:trajectoryError(sol),history,referenceLabel:'Máximo muestreado de la solución exacta, Δt = 0,005 s'}));
  }
  const n=Math.max(8,Math.ceil(end/h));
  for(const [label,fun,unit] of [['|x|',t=>Math.abs(exact(t)),'m·s'],['x²',t=>exact(t)**2,'m²·s']]) {
    const reference=adaptiveIntegral(fun,0,end);
    for(const [name,method] of [['Trapecio',trapezoid],['Simpson',simpson]]) {
      const history=[Math.ceil(n/4),Math.ceil(n/2),n].map((count,i)=>{const value=method(fun,0,end,count);return {iteration:i+1,n:method===simpson?count+count%2:count,value,error:absError(value,reference)};});
      results.push(metric(name+' ∫'+label,method(fun,0,end,n),reference,unit,{magnitud:'integral '+label,history}));
    }
    const rb=romberg(fun,0,end,14,tolerance);
    results.push(metric('Romberg ∫'+label,rb.value,reference,unit,{magnitud:'integral '+label,converged:rb.converged,history:rb.table.map((row,i)=>({iteration:i+1,n:2**i,value:row[i],error:absError(row[i],reference)})),profundidad:rb.depth}));
  }
  return {scenario,entradas:{m,c,k,F,x0,v0,tolerance,h},ref:{xMax:maxRef,tEnd:end,kind:'Solución analítica e integración adaptativa independiente'},resultados:results,grafica:{t:sol4.t,x:sol4.y.map(y=>y[0]),xRK2:sol2.y.map(y=>y[0]),v:sol4.y.map(y=>y[1]),tRef:grid,xRef:xr}};
}
function simulateSensores({funcion='sin',nNodos=7,a=0,b=2*Math.PI,ruido=0,puntosOcultar=2,umbral=.5,tolerance=1e-6,scenario='normal',perturbation=0}) {
  finite(nNodos,a,b,ruido,puntosOcultar,tolerance,perturbation);
  if(!['sin','exp'].includes(funcion)||!Number.isInteger(nNodos)||nNodos<4||nNodos>20||!(b>a)||ruido<0||!Number.isInteger(puntosOcultar)||puntosOcultar<1||puntosOcultar>nNodos-3||tolerance<=0) throw Error('Usa 4 a 20 nodos y oculta entre 1 y n−3 puntos; intervalo creciente y ruido ≥ 0.');
  const truth=funcion==='sin'?Math.sin:t=>Math.exp(-t);
  const allNodes=Array.from({length:nNodos},(_,i)=>a+(b-a)*(scenario==='mal'?(i/(nNodos-1))**5:i/(nNodos-1)));
  const hidden=new Set(Array.from({length:puntosOcultar},(_,i)=>Math.max(1,Math.min(nNodos-2,Math.round((i+1)*(nNodos-1)/(puntosOcultar+1))))));
  const nodos=allNodes.filter((_,i)=>!hidden.has(i)),valores=allNodes.map((t,i)=>truth(t)+Math.sin(i*7.3+1.1)*ruido).filter((_,i)=>!hidden.has(i));
  valores[0]+=perturbation;
  const withheld=allNodes.filter((_,i)=>hidden.has(i));
  const evals=Array.from({length:121},(_,i)=>a+(b-a)*i/120),yRef=evals.map(truth);
  const funcs={lagrange:x=>lagrange(nodos,valores,x),newton:x=>newtonDividedDiff(nodos,valores,x),spline:x=>cubicSpline(nodos,valores,x)};
  const errors={},known={},dense={},predictions={},results=[];
  for(const [key,interp] of Object.entries(funcs)) {
    const es=withheld.map(t=>interp(t)-truth(t)),mae=es.reduce((s,v)=>s+Math.abs(v),0)/es.length;
    const relative=Math.hypot(...withheld.map(t=>truth(t)))===0?null:Math.hypot(...es)/Math.hypot(...withheld.map(truth));
    const fit=Math.max(...nodos.map((t,i)=>Math.abs(interp(t)-valores[i])));
    errors[key]=mae; known[key]=fit; predictions[key]=evals.map(interp); dense[key]=Math.max(...evals.map((t,i)=>Math.abs(predictions[key][i]-truth(t))));
    results.push({name:{lagrange:'Lagrange',newton:'Newton (dif. divididas)',spline:'Spline cúbico'}[key],key,converged:Number.isFinite(mae),valor:mae,value:mae,reference:0,unit:'señal',magnitud:'MAE ocultos',errorAbs:mae,errorRel:relative,errorPct:relative===null?null:100*relative,errorConocidos:fit,errorOcultos:mae,errorValidacion:dense[key],residuo:fit,history:withheld.map((t,i)=>({iteration:i+1,t,value:interp(t),reference:truth(t),error:Math.abs(es[i])}))});
  }
  let root=null;
  if(Number.isFinite(umbral)) { const f=t=>funcs.lagrange(t)-umbral; for(let i=0;i<200;i++) { const l=a+(b-a)*i/200,r=a+(b-a)*(i+1)/200;if(f(l)*f(r)<=0){root=bisection(f,l,r,{tol:tolerance});break;} } }
  return {scenario,entradas:{funcion,nNodos,a,b,ruido,puntosOcultar,umbral,tolerance,perturbation},ref:{funcion,a,b,nNodos},nodos,valores,withheld,puntosEval:evals,resultados:results,errorOcultos:errors,errorConocidos:known,errorValidacion:dense,raiz:{biseccion:root,umbral},grafica:{t:evals,yRef,yLag:predictions.lagrange,yNew:predictions.newton,ySpl:predictions.spline,nodos,valores}};
}

Object.assign(exports,{absError,relError,pctError,sensitivity,isFiniteResult,residualNorm,bisection,newton,secant,lagrange,newtonDividedDiff,cubicSpline,trapezoid,simpson,romberg,rk2Step,rk4Step,rk2,rk4,simulateDetencion,windExact,adaptiveIntegral,simulateViento,simulateSensores});
},
"render.js":(exports,load)=>{
const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Array.isArray(n)?'['+n.map(fmt).join('; ')+']':typeof n==='number'?(Number.isFinite(n)?(n===0?'0':Math.abs(n)<.001||Math.abs(n)>1e5?n.toExponential(3):Number(n.toPrecision(6)).toString()):'no finito'):n==null?'—':esc(n);
function historyTable(methods) {
  return methods.map(m=>{
    const rows=m.history||[],keys=['iteration','h','n','t','value','reference','x','c','residual','error'].filter(k=>rows.some(r=>r[k]!==undefined));
    const labels={iteration:'Paso / iteración',h:'h',n:'Subintervalos',t:'t',value:'Aproximación',reference:'Referencia',x:'x',c:'Punto medio',residual:'Residuo',error:'Error absoluto'};
    return `<details><summary>${esc(m.name)} · ${rows.length} registros · ${m.converged?'criterio satisfecho / calculado':'no convergió'}</summary>${rows.length?`<div class="table-wrap"><table><thead><tr>${keys.map(k=>`<th>${labels[k]}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${keys.map(k=>`<td>${fmt(r[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:'<p>Método directo sin iteraciones. Consulte el resultado y su error.</p>'}</details>`;
  }).join('');
}
function lineChart(svg,series,{xLabel='Iteración / refinamiento',yLabel='Error absoluto (escala log₁₀)',log=true,yDomain=[]}={}) {
  const colors=['#d77d48','#49a4c7','#8c75d6','#579361'],W=760,H=290,L=80,R=20,T=24,B=52;
  const points=series.flatMap(s=>s.points).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
  if(!points.length){svg.innerHTML='<text x="20" y="40" fill="currentColor">Sin registros finitos para esta métrica.</text>';return;}
  const transform=y=>log?Math.log10(Math.max(1e-16,Math.abs(y))):y;
  let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
  for(const p of points){const y=transform(p.y);xmin=Math.min(xmin,p.x);xmax=Math.max(xmax,p.x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);}
  for(const value of yDomain){ymin=Math.min(ymin,transform(value));ymax=Math.max(ymax,transform(value));}
  if(xmax===xmin)xmax=xmin+1;
  if(ymax===ymin){ymin-=1;ymax+=1;}
  const sx=x=>L+(x-xmin)/(xmax-xmin)*(W-L-R),sy=y=>H-B-(transform(y)-ymin)/(ymax-ymin)*(H-T-B);
  let html='';for(let i=0;i<=4;i++){const y=T+i*(H-T-B)/4,label=ymax-i*(ymax-ymin)/4;html+=`<line x1="${L}" y1="${y}" x2="${W-R}" y2="${y}" stroke="currentColor" opacity=".12"/><text x="${L-8}" y="${y+5}" text-anchor="end" fill="currentColor" font-size="13">${log?'10^'+label.toFixed(1):fmt(Number(label.toPrecision(3)))}</text>`;}
  for(let i=0;i<=4;i++){const x=xmin+i*(xmax-xmin)/4;html+=`<text x="${sx(x)}" y="${H-B+22}" text-anchor="middle" fill="currentColor" font-size="13">${x.toPrecision(3)}</text>`;}
  for(const [i,s] of series.entries()){const ps=s.points.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));html+=`<polyline fill="none" stroke="${colors[i%4]}" stroke-width="2.5" points="${ps.map(p=>`${sx(p.x)},${sy(p.y)}`).join(' ')}"/>`;if(ps.length<20)html+=ps.map(p=>`<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="3" fill="${colors[i%4]}"/>`).join('');}
  html+=`<text x="${L}" y="15" fill="currentColor" font-size="13">${esc(yLabel)}</text><text x="${W/2}" y="${H-6}" text-anchor="middle" fill="currentColor" font-size="13">${esc(xLabel)}</text>`;
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.innerHTML=html;
}

Object.assign(exports,{esc,fmt,historyTable,lineChart});
},
"live-inputs.js":(exports,load)=>{
// Solo los parámetros del modelo disparan el cálculo. El control de tiempo
// de la animación y los campos de la cuenta se manejan por separado.
function bindSimulationInputs(ids, calculate) {
  const fields = ids.map(id => document.getElementById(id));
  let timer;
  let lastValues;

  function run(preserveTime = false) {
    clearTimeout(timer);
    lastValues = fields.map(field => field.value);
    return calculate(preserveTime);
  }

  function update() {
    if (fields.some((field, index) => field.value !== lastValues?.[index])) run(true);
  }

  for (const field of fields) {
    field.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(update, 180);
    });
    field.addEventListener('change', update);
  }
  return run;
}

Object.assign(exports,{bindSimulationInputs});
},
"demo-scenes.js":(exports,load)=>{
const {windExact} = load("numerics.js");
const {fmt,esc} = load("render.js");
const active=new Map();
function clearDemo(targetId) {
  active.get(targetId)?.stop();
  active.delete(targetId);
  document.getElementById(targetId)?.replaceChildren();
}
const cabin=(x,y,angle=0)=>`<g transform="translate(${x} ${y}) rotate(${angle})"><path d="M0 -49V-20" stroke="#53665c" stroke-width="4"/><rect x="-30" y="-20" width="60" height="45" rx="10" fill="#c87540"/><path d="M-22 -12H22V6H-22Z" fill="#d7ebed"/><path d="M0 -12V6M-22 12H22" stroke="#53665c" stroke-width="2"/></g>`;
function renderDemo(caso,output,inputs,{targetId='demo-'+caso,preserveTime=false}={}) {
  const previous=preserveTime?active.get(targetId)?.playback():null;
  clearDemo(targetId);
  const host=document.getElementById(targetId);if(!host)return;
  let frameId;
  const stop=()=>{if(frameId!==undefined)cancelAnimationFrame(frameId);frameId=undefined;};
  const titles={detencion:'Del movimiento a la parada',deterioro:'El índice se acerca al umbral',viento:'Una fuerza, una respuesta oscilante',sensores:'Reconstruir lo que no se midió'};
  const descriptions={detencion:'Durante la reacción, la cabina conserva su velocidad. Después frena hasta detenerse. Mueve el tiempo para ver qué ocurre.',deterioro:'El rodamiento ilustra un índice educativo. El tiempo del control se expresa en meses, y el umbral no representa una falla real.',viento:'La cabina oscila alrededor del equilibrio del modelo. El dibujo amplifica el movimiento para hacerlo visible; los valores muestran metros reales.',sensores:'Los círculos naranjas son observaciones retiradas del entrenamiento. Se contrastan las predicciones con el valor verdadero, sin usarlo para ajustar.'};
  const end=caso==='detencion'?output.ref.tTotal:caso==='deterioro'?(output.crossing??10):caso==='viento'?output.ref.tEnd:inputs.b;
  const unit=caso==='deterioro'?'meses':'s';
  const start=caso==='sensores'?inputs.a:0;
  const previewTime=caso==='viento'?5:caso==='sensores'?(start+end)/2:end*.55;
  const initial=previous?Math.min(end,Math.max(start,previous.time)):previewTime;
  host.innerHTML=`<div class="demo-heading"><span class="demo-kicker">EJEMPLO INTERACTIVO</span><h3>${titles[caso]}</h3><p>${descriptions[caso]}</p></div><svg data-scene viewBox="0 0 640 210" role="img" aria-label="${esc(titles[caso])}"></svg><div class="demo-values" data-values aria-live="off"></div><label class="demo-time">Explorar tiempo <span data-clock></span><input data-time type="range" min="${start}" max="${end}" step="any" value="${initial}" aria-label="Tiempo del ejemplo en ${unit}"></label><div class="demo-controls"><button type="button" data-play>Reproducir ejemplo</button><button type="button" data-reset>Volver al inicio</button></div>`;
  const slider=host.querySelector('[data-time]'),svg=host.querySelector('[data-scene]'),values=host.querySelector('[data-values]'),clock=host.querySelector('[data-clock]');slider.value=initial;
  const chip=(name,value)=>`<div><span>${name}</span><strong>${value}</strong></div>`;
  // Una misma escala para las fuerzas habituales permite comparar amplitudes.
  const windExtent=caso==='viento'?Math.max(2,Math.ceil(Math.max(output.ref.xMax,Math.abs(inputs.F/inputs.k)))):0;
  function draw(t) {
    clock.textContent=fmt(t)+' '+unit;
    if(caso==='detencion') {
      const {v0,tr,a}=inputs,u=Math.min(Math.max(0,t-tr),v0/a),distance=v0*Math.min(t,tr)+v0*u-a*u*u/2,velocity=Math.max(0,v0-a*u),total=output.ref.dTotal;
      const extent=100*Math.max(1,Math.ceil(total/100)),sx=meters=>65+510*meters/extent,px=sx(distance),rx=sx(v0*tr);
      const phase=t>=end?'Detenida':t<=tr?'Reacción':'Frenado';
      svg.innerHTML=`<path d="M45 67H595" stroke="#86988b" stroke-width="3"/><path d="M65 158H575" stroke="#bdc6be" stroke-width="3"/><path d="M65 158H${rx}" stroke="#ddab62" stroke-width="9"/><path d="M${rx} 158H${sx(total)}" stroke="#428889" stroke-width="9"/><path d="M65 149V168M${rx} 149V168M${sx(total)} 149V168" stroke="#718078" stroke-width="2"/>${cabin(px,116)}<text x="65" y="191" font-size="14">0 m</text><text x="320" y="191" font-size="14" text-anchor="middle">Reacción · ${fmt(v0*tr)} m / Parada · ${fmt(total)} m</text><text x="575" y="191" font-size="14" text-anchor="end">${fmt(extent)} m</text>`;
      values.innerHTML=chip('Fase',phase)+chip('Velocidad',fmt(velocity)+' m/s')+chip('Distancia',fmt(distance)+' m');
    } else if(caso==='deterioro') {
      const [d,a,b]=output.ref,D=d+a*t+b*t*t,ratio=D>=inputs.threshold?1:inputs.threshold>0?Math.max(0,D/inputs.threshold):0,px=75+(end?500*t/end:0);
      svg.innerHTML=`<g transform="translate(120 90)"><circle r="56" fill="none" stroke="#8e9c93" stroke-width="13"/><circle r="29" fill="none" stroke="#428889" stroke-width="12"/>${Array.from({length:8},(_,i)=>{const q=i*Math.PI/4+t*.5;return `<circle cx="${42*Math.cos(q)}" cy="${42*Math.sin(q)}" r="6" fill="#c87540"/>`;}).join('')}</g><text x="235" y="68" font-size="17">D(t) = D₀ + αt + βt²</text><rect x="235" y="90" width="340" height="20" rx="10" fill="#b7c6bb"/><rect x="235" y="90" width="${340*ratio}" height="20" rx="10" fill="#c87540"/><text x="235" y="137" font-size="14">${fmt(D)} / ${fmt(inputs.threshold)} puntos</text><path d="M75 175H575" stroke="#8e9c93" stroke-width="3"/><circle cx="${px}" cy="175" r="7" fill="#c87540"/><text x="75" y="202" font-size="14">Inspección inicial</text><text x="575" y="202" text-anchor="end" font-size="14">${output.crossing===null?'Fin de la vista':'Umbral'} · ${fmt(end)} meses</text>`;
      values.innerHTML=chip('Índice D(t)',fmt(D)+' puntos')+chip('Umbral',fmt(inputs.threshold)+' puntos')+chip('Tiempo proyectado',output.crossing===null?'Sin cruce proyectado':fmt(output.crossing)+' meses');
    } else if(caso==='viento') {
      const displacement=windExact(inputs,t),x=320+240*displacement/windExtent,eq=320+240*(inputs.F/inputs.k)/windExtent;
      svg.innerHTML=`<path d="M70 35H570" stroke="#8e9c93" stroke-width="4"/><path d="M320 35L${x} 105" stroke="#53665c" stroke-width="4"/><path d="M320 42V184" stroke="#8e9c93" stroke-dasharray="5 5"/><path d="M${eq} 44V184" stroke="#428889" stroke-dasharray="4 5"/>${cabin(x,145,Math.max(-15,Math.min(15,displacement/windExtent*16)))}<text x="65" y="201" font-size="14">Escala lateral · ±${fmt(windExtent)} m</text><text x="${Math.min(535,eq)}" y="65" font-size="13" text-anchor="end">Equilibrio F/k</text>`;
      values.innerHTML=chip('Desplazamiento',fmt(displacement)+' m')+chip('Equilibrio',fmt(inputs.F/inputs.k)+' m')+chip('Fuerza constante',fmt(inputs.F)+' N');
    } else {
      const xs=output.grafica.t,lag=output.grafica.yLag,spl=output.grafica.ySpl,truth=output.grafica.yRef,limits=[...truth,...lag,...spl,...output.valores],min=Math.min(...limits),max=Math.max(...limits),sx=x=>55+535*(x-inputs.a)/(inputs.b-inputs.a),sy=y=>170-135*(y-min)/(max-min||1),index=Math.min(xs.length-1,Math.max(0,Math.round((t-inputs.a)/(inputs.b-inputs.a)*(xs.length-1))));
      const curve=(ys,color,dash='')=>`<polyline points="${xs.map((x,i)=>`${sx(x)},${sy(ys[i])}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-dasharray="${dash}"/>`;
      svg.innerHTML=curve(truth,'#739785','5 4')+curve(lag,'#c87540')+curve(spl,'#5b80b5')+output.nodos.map((x,i)=>`<circle cx="${sx(x)}" cy="${sy(output.valores[i])}" r="4" fill="#428889"/>`).join('')+output.withheld.map(x=>`<circle cx="${sx(x)}" cy="${sy(inputs.funcion==='sin'?Math.sin(x):Math.exp(-x))}" r="7" stroke="#c87540" stroke-width="2" fill="none"/>`).join('')+`<path d="M${sx(t)} 25V180" stroke="#7e8f84" stroke-dasharray="3 4"/><text x="55" y="202" font-size="13">Verde: verdad · Naranja: polinomio · Azul: spline · ○: dato oculto</text>`;
      values.innerHTML=chip('Datos utilizados',String(output.nodos.length))+chip('Datos ocultos',String(output.withheld.length))+chip('Valor reconstruido',fmt(lag[index]))+chip('Cruce del umbral',output.raiz.biseccion?.converged?fmt(output.raiz.biseccion.root)+' s':'Sin cruce');
    }
  }
  let playing=false,origin=0,last=initial;
  active.set(targetId,{stop,playback:()=>({time:last,playing})});
  const play=host.querySelector('[data-play]');
  slider.disabled=play.disabled=end<=start;
  slider.oninput=()=>{stop();playing=false;last=Number(slider.value);play.textContent='Reproducir ejemplo';draw(last);};
  host.querySelector('[data-reset]').onclick=()=>{stop();playing=false;last=start;slider.value=start;play.textContent='Reproducir ejemplo';draw(start);};
  function frame(now) {
    frameId=undefined;
    if(!playing)return;
    const t=Math.min(end,start+(now-origin)/1000*(end-start)/9);slider.value=t;last=t;draw(t);
    if(t<end)frameId=requestAnimationFrame(frame);else{playing=false;play.textContent='Repetir ejemplo';}
  }
  play.onclick=()=>{if(typeof requestAnimationFrame!=='function'||end<=start)return;playing=!playing;if(playing){if(last>=end)last=start;origin=performance.now()-(last-start)/(end-start)*9000;play.textContent='Pausar';frameId=requestAnimationFrame(frame);}else{stop();play.textContent='Continuar';}};
  draw(initial);
  if(previous?.playing && initial<end)play.onclick();
}

Object.assign(exports,{clearDemo,renderDemo});
},
"local-history-ui.js":(exports,load)=>{
const {experiment,VERSION} = load("experiments.js");
const {saveExperiment,listExperiments,loadExperiment} = load("history-store.js");
function mountLocalHistory(caso,getInputs,restore) {
  const panel=document.createElement('section');panel.className='panel local-history';
  panel.innerHTML='<h3>Ensayo local de persistencia</h3><p>Guarda en este navegador usando las siete entidades del DER. Puedes cerrar la pestaña, volver y recuperar las entradas y el resultado original. Este historial es independiente de tu cuenta de Supabase.</p><div class="actions"><button type="button" data-local-save>Guardar experimento local</button><button type="button" data-local-list>Recuperar experimentos locales</button></div><p role="status" data-local-message></p><ul data-local-items></ul>';
  const host=document.getElementById('simulador');host.append(panel);
  const msg=t=>panel.querySelector('[data-local-message]').textContent=t;
  panel.querySelector('[data-local-save]').onclick=async()=>{try{const inputs=getInputs(),r=experiment(caso,inputs.scenario,inputs),id=await saveExperiment(r);msg(`Experimento ${id} guardado · modelo ${VERSION}. Recarga y recupéralo para comprobar persistencia.`);}catch(e){msg(e.message);}};
  panel.querySelector('[data-local-list]').onclick=async()=>{try{const rows=(await listExperiments()).filter(r=>r.caso===caso),list=panel.querySelector('[data-local-items]');list.replaceChildren();for(const r of rows){const li=document.createElement('li'),b=document.createElement('button');b.textContent=`Experimento ${r.id} · ${r.fecha} · ${r.version_modelo} · ${r.parametros_entrada_json.scenario} · Recuperar y repetir`;b.onclick=async()=>{try{const saved=await loadExperiment(r.id);restore(saved.simulation.parametros_entrada_json);msg(`Recuperado ${r.id}: ${saved.methods.length} resultados originales. Repetido con modelo ${VERSION}${r.version_modelo!==VERSION?' (versión distinta de la guardada)':''}.`);}catch(e){msg(e.message);}};li.append(b);list.append(li);}msg(rows.length?`${rows.length} experimentos disponibles.`:'No hay experimentos locales guardados para este caso.');}catch(e){msg(e.message);}};
}

Object.assign(exports,{mountLocalHistory});
},
"history-store.js":(exports,load)=>{
// Almacenamiento local normalizado conforme al DER. Transacción atómica IndexedDB.
const {CASES, SCENARIOS, VERSION, presetInputs} = load("experiments.js");
const tables=['usuario','caso_estudio','escenario','simulacion','ejecucion_metodo','iteracion_resultado','resultado_resumen'];
const req=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
function database() {
  return new Promise((resolve,reject)=>{
    const open=indexedDB.open('simtele-risk-der-v3',1);
    open.onupgradeneeded=()=>{for(const name of tables) open.result.createObjectStore(name,{keyPath:'id',autoIncrement:true});};
    open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error);
  });
}
const clean=value=>JSON.parse(JSON.stringify(value,(_k,v)=>typeof v==='number'&&!Number.isFinite(v)?String(v):v));
async function saveExperiment(report) {
  const db=await database();
  try {return await new Promise((resolve,reject)=>{
    const tx=db.transaction(tables,'readwrite'),s=Object.fromEntries(tables.map(t=>[t,tx.objectStore(t)])); let id;
    tx.oncomplete=()=>resolve(id);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Guardado cancelado.'));
    const ci=Object.keys(CASES).indexOf(report.caso)+1,ei=(ci-1)*3+Object.keys(SCENARIOS).indexOf(report.scenario)+1;
    s.usuario.put({id:1,nombre:'Participante local'});
    s.caso_estudio.put({id:ci,nombre:CASES[report.caso],version_modelo:VERSION});
    s.escenario.put({id:ei,caso_id:ci,tipo:report.scenario,descripcion:SCENARIOS[report.scenario],parametros_base_json:presetInputs(report.caso,report.scenario),fuente_datos:'Datos sintéticos del laboratorio'});
    const sr=s.simulacion.add({usuario_id:1,escenario_id:ei,caso:report.caso,fecha:new Date().toISOString(),parametros_entrada_json:report.inputs,version_modelo:report.version,estado:'guardado'});
    sr.onsuccess=()=>{id=sr.result;for(const m of report.methods){
      const er=s.ejecucion_metodo.add({simulacion_id:id,metodo:m.name,tolerancia:report.inputs.tolerance,paso:report.inputs.h??null,max_iteraciones:/Jacobi|Gauss|Gradiente|Bisección|Newton \(tiempo\)|Secante/.test(m.name)?1000:null,convergio:m.converged,tiempo_ms:null});
      er.onsuccess=()=>{const eid=er.result;
        for(const [i,row] of (m.history||[]).entries()) s.iteracion_resultado.add(clean({ejecucion_id:eid,numero:i+1,aproximacion_json:row,residual:row.residual??null,error_absoluto:row.error??null,error_relativo:null}));
        s.resultado_resumen.add(clean({ejecucion_id:eid,valor_json:m.value,referencia_json:m.reference,metricas_error_json:{absolute:m.errorAbs,relative:m.errorRel,residual:m.residuo},interpretacion:report.conclusions.numerical+'\n'+report.conclusions.problem,metodo_snapshot:m}));
      };
    }};
  });}finally{db.close();}
}
async function listExperiments() {
  const db=await database();try{return (await req(db.transaction('simulacion').objectStore('simulacion').getAll())).sort((a,b)=>b.id-a.id);}finally{db.close();}
}
async function loadExperiment(id) {
  const db=await database();
  try {
    // Un único snapshot de lectura evita mezclar versiones entre consultas.
    const tx=db.transaction(tables,'readonly');
    const [simulation,executions,summaries]=await Promise.all([req(tx.objectStore('simulacion').get(id)),req(tx.objectStore('ejecucion_metodo').getAll()),req(tx.objectStore('resultado_resumen').getAll())]);
    if(!simulation) throw Error('Experimento no encontrado.');
    const ids=new Set(executions.filter(e=>e.simulacion_id===id).map(e=>e.id));
    return {simulation,methods:summaries.filter(s=>ids.has(s.ejecucion_id)).map(s=>s.metodo_snapshot)};
  }finally{db.close();}
}
async function tableCounts() {
  const db=await database();try{const tx=db.transaction(tables);return Object.fromEntries(await Promise.all(tables.map(async name=>[name,await req(tx.objectStore(name).count())])));}finally{db.close();}
}

Object.assign(exports,{saveExperiment,listExperiments,loadExperiment,tableCounts});
}
};
const cache={};function load(id){if(cache[id])return cache[id];const exports=cache[id]={};modules[id](exports,load);return exports;}
try{load("sensores-app.js");}catch(error){console.error(error);const status=document.getElementById('suite-status')||document.getElementById('app-load-status');if(status){status.hidden=false;status.textContent='No se pudo iniciar la página: '+error.message;}}
})();
