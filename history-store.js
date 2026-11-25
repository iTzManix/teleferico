// Almacenamiento local normalizado conforme al DER. Transacción atómica IndexedDB.
import {CASES, SCENARIOS, VERSION, presetInputs} from './experiments.js';
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
export async function saveExperiment(report) {
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
export async function listExperiments() {
  const db=await database();try{return (await req(db.transaction('simulacion').objectStore('simulacion').getAll())).sort((a,b)=>b.id-a.id);}finally{db.close();}
}
export async function loadExperiment(id) {
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
export async function tableCounts() {
  const db=await database();try{const tx=db.transaction(tables);return Object.fromEntries(await Promise.all(tables.map(async name=>[name,await req(tx.objectStore(name).count())])));}finally{db.close();}
}
