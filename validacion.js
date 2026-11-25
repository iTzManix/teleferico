import { renderDemo } from './demo-scenes.js';
import {CASES,SCENARIOS,VERSION,INTEGRATION,allExperiments,experiment} from './experiments.js';
import {fmt,esc,historyTable,lineChart} from './render.js';
import {saveExperiment,listExperiments,loadExperiment,tableCounts} from './history-store.js';
const $=id=>document.getElementById(id);
let reports=[],selected=null;
const initialCase=$('case-filter').value || 'deterioro';
$('case-filter').innerHTML=Object.entries(CASES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
$('scenario-filter').innerHTML=Object.entries(SCENARIOS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
$('case-filter').value=initialCase;
$('integration').textContent=INTEGRATION;
const rows=methods=>methods.map(m=>`<tr><td>${esc(m.name)}</td><td class="${m.converged?'good':'attention'}">${m.converged?'Calculado / criterio satisfecho':'No convergió'}</td><td>${fmt(m.value)}</td><td>${fmt(m.reference)}</td><td>${esc(m.unit)}</td><td>${fmt(m.errorAbs)}</td><td>${fmt(m.errorRel)}</td><td>${fmt(m.errorPct)}</td><td>${fmt(m.residuo)}</td><td>${m.it??m.iteraciones??m.history?.length??'Directo'}</td></tr>`).join('');
const shown=m=>Number.isFinite(m.errorRel)?Math.min(1e4,Math.max(1e-16,m.errorRel)):1e4;
function errorChart(svg,methods) {lineChart(svg,[{points:methods.map((m,i)=>({x:i+1,y:shown(m)}))}],{xLabel:'Método (según la leyenda)',yLabel:'Error relativo, log₁₀ (límites 10⁻¹⁶ a 10⁴)'});}
function renderMatrix() {
  $('matrix').innerHTML=Object.entries(CASES).map(([c,label])=>`<tr><td>${label}</td>${Object.entries(SCENARIOS).map(([s])=>{const r=reports.find(r=>r.caso===c&&r.scenario===s);return `<td><button data-case="${c}" data-scenario="${s}" aria-pressed="${selected?.caso===c&&selected?.scenario===s}">${r?.referenceVerified?'Referencia contrastada':'Revisar control'}<small>${r?.methods.length??0} métodos · ${r?.methods.filter(m=>!m.converged).length??0} sin convergencia</small></button></td>`;}).join('')}</tr>`).join('');
}
function renderTrace() {
  const m=selected.methods[Number($('trace-method').value)],key=$('trace-metric').value;
  lineChart($('convergence-chart'),[{points:(m?.history||[]).map((r,i)=>({x:r.iteration??i+1,y:r[key]}))}],{yLabel:key==='residual'?'Residuo (norma o |f|), log₁₀':'Error absoluto frente a referencia, log₁₀'});
  $('trace-note').textContent=`${m?.name??''}. ${key==='residual'?'Solo se grafica si el método tiene residuo definido.':'En EDO el error de refinamiento es de trayectoria (viento) o distancia final (detención).'} El eje horizontal enumera los registros; h o n exactos están en las tablas. Cero se dibuja en 10⁻¹⁶; valores no finitos quedan fuera de la curva.`;
}
function select(caso,scenario,customReport) {
  selected=customReport||reports.find(r=>r.caso===caso&&r.scenario===scenario);
  if(!selected) return;
  $('case-filter').value=caso;$('scenario-filter').value=scenario;
  $('selected-title').textContent=CASES[caso];$('selected-scenario').textContent=SCENARIOS[scenario]+' / MODELO '+selected.version;
  $('open-module').href=caso+'.html?scenario='+scenario+'#simulador';
  renderDemo(caso,selected.output,selected.inputs,'demo-validacion');
  $('inputs').textContent=JSON.stringify(selected.inputs,null,2);$('reference-data').textContent=JSON.stringify(selected.reference,null,2);
  $('reference-kind').textContent=selected.reference.kind;$('reference-check').textContent=selected.referenceVerified?'Control de referencia satisfecho. Consulte las limitaciones y los errores de cada método.':'Revisar el control de referencia de esta ejecución.';
  const s=selected.sensitivity;$('sensitivity-detail').textContent=s.detail;
  for(const [id,v] of Object.entries({epsilon:s.epsilon,change:s.change,amplification:s.amplification,condition:s.condition})) $(id).innerHTML=fmt(v);
  $('identification').textContent=JSON.stringify({matriz:s.C,observaciones:s.y,original:s.original,perturbado:s.perturbed},null,2);
  $('methods').innerHTML=rows(selected.methods);$('histories').innerHTML=historyTable(selected.methods);
  $('comparison-note').textContent=caso==='sensores'?'Valor = MAE en datos ocultos; referencia de ese error = 0. Error relativo = norma del vector de errores / norma de los valores verdaderos. Residuo = error máximo en nodos usados.':caso==='deterioro'?'Los vectores siguen el orden [D₀, α, β, s]. Residuo = ||b−Ax||₂; error = distancia a la calibración de referencia. El criterio de residuo no garantiza parámetros precisos.':'Cada resultado se compara con la referencia de su magnitud y unidad. Un guion en residuo significa que esa métrica no se aplica. En viento las cuadraturas integran la solución analítica para separar su error del de la EDO.';
  $('numerical-conclusion').textContent=selected.conclusions.numerical;$('problem-conclusion').textContent=selected.conclusions.problem;
  errorChart($('error-chart'),selected.methods);$('error-legend').innerHTML=selected.methods.map((m,i)=>`<span>${i+1}. ${esc(m.name)}</span>`).join('');
  $('trace-method').innerHTML=selected.methods.map((m,i)=>`<option value="${i}">${esc(m.name)}</option>`).join('');
  $('trace-method').value=String(Math.max(0,selected.methods.findIndex(m=>m.history?.length&&m.converged)));renderTrace();renderMatrix();
}
async function run() {
  $('suite-status').textContent='Ejecutando los doce experimentos…';$('rerun').disabled=true;
  await new Promise(resolve=>setTimeout(resolve,0));
  try{reports=allExperiments();$('coverage').textContent=reports.length+'/12';$('references').textContent=reports.filter(r=>r.referenceVerified).length+'/12';$('suite-status').textContent='Ejecución completa. La divergencia de Jacobi se conserva como resultado numérico.';select($('case-filter').value,$('scenario-filter').value);}catch(e){$('suite-status').textContent='No se completó la validación: '+e.message;}finally{$('rerun').disabled=false;}
}
$('case-filter').onchange=$('scenario-filter').onchange=()=>select($('case-filter').value,$('scenario-filter').value);
$('matrix').onclick=e=>{const b=e.target.closest('[data-case]');if(b)select(b.dataset.case,b.dataset.scenario);};
$('trace-method').onchange=$('trace-metric').onchange=renderTrace;$('rerun').onclick=run;
function download(name,text,type) {const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export').onclick=()=>download('simtele-evidencia-s3.json',JSON.stringify({version:VERSION,date:new Date().toISOString(),reports},(_k,v)=>typeof v==='number'&&!Number.isFinite(v)?String(v):v,2),'application/json');
$('csv').onclick=()=>{const records=[['caso','escenario','metodo','valor','referencia','unidad','error_abs','error_rel','error_pct','residuo','convergio'],...reports.flatMap(r=>r.methods.map(m=>[r.caso,r.scenario,m.name,JSON.stringify(m.value),JSON.stringify(m.reference),m.unit,m.errorAbs,m.errorRel,m.errorPct,m.residuo,m.converged]))];download('simtele-tablas-s3.csv','\uFEFF'+records.map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(';')).join('\r\n'),'text/csv;charset=utf-8');};
function printable() {
  $('print-report').innerHTML=`<h1>SIMTELE-RISK<br>Validación y defensa de semana 3</h1><p>Modelo ${VERSION}. Datos sintéticos. ${new Date().toLocaleDateString('es-BO')}. Equipo: Gabriel Efrain Cruz Quino, Melanny Vania Ramos Paco, Edwin Alvaro Mamani Choque y Adriana Valeria Fernandez Flores.</p><p>Este informe reúne doce experimentos, referencias, comparación de métodos, sensibilidad y dos conclusiones diferenciadas por caso. Los escenarios mal condicionados de detención y viento son subexperimentos de identificación; conservan la dinámica normal para aislar sensibilidad.</p>${reports.map((r,i)=>`<section><h2>${CASES[r.caso]} · ${SCENARIOS[r.scenario]}</h2><h3>Modelo y referencia</h3><p>${esc(r.reference.kind)}</p><pre>${esc(JSON.stringify({inputs:r.inputs,reference:r.reference},null,2))}</pre><h3>Comparación</h3><table><thead><tr><th>Método</th><th>Valor</th><th>Referencia</th><th>Unidad</th><th>Error abs.</th><th>Error rel.</th><th>Estado</th></tr></thead><tbody>${r.methods.map(m=>`<tr><td>${esc(m.name)}</td><td>${fmt(m.value)}</td><td>${fmt(m.reference)}</td><td>${esc(m.unit)}</td><td>${fmt(m.errorAbs)}</td><td>${fmt(m.errorRel)}</td><td>${m.converged?'Calculado':'No convergió'}</td></tr>`).join('')}</tbody></table><h3>Sensibilidad</h3><p>${esc(r.sensitivity.detail)} Amplificación absoluta: ${fmt(r.sensitivity.amplification)}.</p><h3>Conclusión numérica</h3><p>${esc(r.conclusions.numerical)}</p><h3>Conclusión del problema</h3><p>${esc(r.conclusions.problem)}</p><svg id="print-chart-${i}"></svg></section>`).join('')}<section><h2>Conclusión integradora</h2><p>${INTEGRATION}</p><h3>DER y persistencia</h3><p>Usuario → simulación; caso de estudio → escenario → simulación → ejecución de método → iteración y resultado resumido. Historial normalizado local con IndexedDB. Supabase ya tiene el DER. Se importaron 18 experimentos y las pruebas SQL de los doce escenarios, reintentos y aislamiento pasaron. La tabla anterior se conserva; el ensayo de sesión en navegador sigue pendiente. La prueba local debe demostrar guardar, cerrar, recuperar y repetir.</p><h3>Referencias</h3><p>T. Sauer, Numerical Analysis, 3.ª ed., Pearson, 2018. R. L. Burden, J. D. Faires y A. M. Burden, Numerical Analysis, 10.ª ed., Cengage, 2016. Consigna académica SIMTELE-RISK, semana 3. Repositorio https://github.com/iTzManix/teleferico.</p></section>`;
  reports.forEach((r,i)=>errorChart($('print-chart-'+i),r.methods));
}
$('print').onclick=()=>{printable();window.print();};
$('save-local').onclick=async()=>{try{const id=await saveExperiment(selected);$('persistence-message').textContent=`Experimento ${id} guardado. Recarga la página y recupéralo.`;}catch(e){$('persistence-message').textContent=e.message;}};
async function list() {
  try{const saved=await listExperiments();$('saved-list').replaceChildren();
    for(const row of saved){const li=document.createElement('li'),b=document.createElement('button');b.textContent=`#${row.id} · ${CASES[row.caso]} · ${row.parametros_entrada_json.scenario} · ${row.fecha} · Recuperar y repetir`;
      b.onclick=async()=>{try{const original=await loadExperiment(row.id),r=experiment(row.caso,row.parametros_entrada_json.scenario,row.parametros_entrada_json);select(r.caso,r.scenario,r);const stable=x=>JSON.stringify(x,(_k,v)=>typeof v==='number'&&!Number.isFinite(v)?String(v):v);const same=stable(original.methods.map(m=>m.value))===stable(r.methods.map(m=>m.value));$('persistence-message').textContent=`Recuperado #${row.id}: ${original.methods.length} resultados originales. Modelo guardado ${row.version_modelo}; actual ${VERSION}. Repetición: ${same?'valores idénticos':'hay diferencias; revisar versión y entradas'}.`;}catch(e){$('persistence-message').textContent=e.message;}};li.append(b);$('saved-list').append(li);
    }$('persistence-message').textContent=`${saved.length} experimentos recuperados del navegador.`;
  }catch(e){$('persistence-message').textContent=e.message;}
}
$('list-local').onclick=list;$('counts').onclick=async()=>{try{$('stored-counts').textContent=JSON.stringify(await tableCounts(),null,2);}catch(e){$('persistence-message').textContent=e.message;}};
export const ready=run();
