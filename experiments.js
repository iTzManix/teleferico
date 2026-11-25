import {simulate, direct, simulateDetencion, simulateViento, simulateSensores} from './math.js';
export const VERSION='3.0.0';
export const CASES={detencion:'Detención de emergencia',deterioro:'Deterioro mecánico',viento:'Oscilaciones por viento',sensores:'Reconstrucción de sensores'};
export const SCENARIOS={normal:'Normal',estres:'Estrés',mal:'Mal condicionado'};
export const PRESETS={
  deterioro:{normal:{values:[13,15.5,19,3,60,1e-6],desc:'Curva D = 10 + 2t + 0,5t²; mediciones en 0, 1 y 2 meses.'},estres:{values:[18,23,30,3,60,1e-6],desc:'Curva D = 15 + 4t + t²; crecimiento más rápido.'},mal:{values:[13,13.0402,13.0808,3,60,1e-6],desc:'La misma curva normal, medida en 0, 0,02 y 0,04 meses. Se aísla la sensibilidad.'}},
  detencion:{normal:{values:[10,1,2,1e-6,.1],desc:'Reacción a velocidad constante y frenado hasta v = 0.'},estres:{values:[15,1.5,1.5,1e-6,.1],desc:'Más velocidad, mayor reacción y menor desaceleración.'},mal:{values:[10,1,2,1e-6,.1],desc:'Misma dinámica normal. Identificación sensible del frenado con dos velocidades casi iguales; véase Validación.'}},
  viento:{normal:{values:[500,50,200,100,0,0,1e-6,.4],desc:'Oscilador amortiguado con fuerza constante de 100 N.'},estres:{values:[500,20,200,200,0,0,1e-6,.4],desc:'Mayor fuerza y menor amortiguamiento.'},mal:{values:[500,50,200,100,0,0,1e-6,.4],desc:'Misma dinámica normal. Identificación de c y k con observaciones casi dependientes; véase Validación.'}},
  sensores:{normal:{values:['sin',7,0,2*Math.PI,0,2,.5,1e-6],desc:'Se retiran dos observaciones antes de construir los interpolantes.'},estres:{values:['sin',7,0,2*Math.PI,.08,3,.5,1e-6],desc:'Tres observaciones ausentes y ruido determinista de amplitud 0,08.'},mal:{values:['sin',9,0,2*Math.PI,0,2,.5,1e-6],desc:'Nodos agrupados hacia el inicio (t = a + (b−a)u⁵). Se cuantifica la amplificación de una perturbación.'}}
};
const KEYS={deterioro:['y0','y1','y2','bias','threshold','tolerance'],detencion:['v0','tr','a','tolerance','h'],viento:['m','c','k','F','x0','v0','tolerance','h'],sensores:['funcion','nNodos','a','b','ruido','puntosOcultar','umbral','tolerance']};
export function presetInputs(caso,scenario) {return {...Object.fromEntries(KEYS[caso].map((k,i)=>[k,PRESETS[caso][scenario].values[i]])),scenario};}
export const SOLVERS={deterioro:simulate,detencion:simulateDetencion,viento:simulateViento,sensores:simulateSensores};
const f=n=>Number.isFinite(n)?Number(n).toPrecision(5):'no finito';
const matNorm=A=>Math.max(...A.map(r=>r.reduce((s,v)=>s+Math.abs(v),0)));
export function conditionInf(A) {
  const columns=A.map((_,i)=>direct(A,A.map((_,j)=>i===j?1:0)));
  return matNorm(A)*matNorm(A.map((_,i)=>columns.map(c=>c[i])));
}
function identification(C,truth,eps) {
  const y=C.map(r=>r.reduce((s,v,i)=>s+v*truth[i],0)),z=y.slice(); z[z.length-1]+=eps;
  const original=direct(C,y),perturbed=direct(C,z),change=Math.hypot(...original.map((v,i)=>v-perturbed[i]));
  return {C,y,original,perturbed,epsilon:eps,change,amplification:change/eps,condition:conditionInf(C)};
}
export function experiment(caso,scenario,custom) {
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
export function allExperiments() {return Object.keys(CASES).flatMap(c=>Object.keys(SCENARIOS).map(s=>experiment(c,s)));}
export const INTEGRATION='La confiabilidad depende de un modelo coherente, una referencia independiente y una métrica con unidades correctas. La convergencia del algoritmo no garantiza precisión de los parámetros ni validez física. El estrés cambia la exigencia del fenómeno; el mal condicionamiento amplifica incertidumbres del problema matemático. Los cuatro casos permiten evaluar estas diferencias sin inferir fallas reales de Mi Teleférico.';
