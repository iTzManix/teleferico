// Núcleo verificable v3. Unidades y referencias se conservan por magnitud.
export const absError = (x, ref) => Math.abs(x - ref);
export const relError = (x, ref) => ref === 0 || !Number.isFinite(ref) ? null : absError(x, ref) / Math.abs(ref);
export const pctError = (x, ref) => relError(x, ref) === null ? null : 100 * relError(x, ref);
export const sensitivity = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
export const isFiniteResult = Number.isFinite;
export const residualNorm = (A, x, b) => Math.hypot(...A.map((r, i) => r.reduce((s, v, j) => s + v * x[j], -b[i])));
function finite(...xs) { if (!xs.every(Number.isFinite)) throw Error('Las entradas deben ser números finitos.'); }
function options(tol, maxIter) { if (!(tol > 0) || !Number.isInteger(maxIter) || maxIter < 1 || maxIter > 10000) throw Error('Tolerancia o máximo de iteraciones inválido.'); }
export function bisection(f, a, b, {tol = 1e-6, maxIter = 1000} = {}) {
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
export function newton(f, df, x, {tol = 1e-6, maxIter = 1000} = {}) {
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
export function secant(f, x0, x1, {tol = 1e-6, maxIter = 1000} = {}) {
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
export function lagrange(xs, ys, x) {
  nodesValid(xs,ys);
  return ys.reduce((s,y,i)=>s+y*xs.reduce((p,v,j)=>j===i?p:p*(x-v)/(xs[i]-v),1),0);
}
export function newtonDividedDiff(xs,ys,x) {
  nodesValid(xs,ys); const a=ys.slice(), n=xs.length;
  for(let j=1;j<n;j++) for(let i=n-1;i>=j;i--) a[i]=(a[i]-a[i-1])/(xs[i]-xs[i-j]);
  let value=a[n-1]; for(let i=n-2;i>=0;i--) value=a[i]+(x-xs[i])*value;
  return value;
}
export function cubicSpline(xs,ys,x) {
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
export function trapezoid(f,a,b,n=1000) {
  intervals(n); finite(a,b); const h=(b-a)/n; let sum=(f(a)+f(b))/2;
  for(let i=1;i<n;i++) sum+=f(a+i*h); return sum*h;
}
export function simpson(f,a,b,n=1000) {
  intervals(n); finite(a,b); n+=n%2; const h=(b-a)/n; let sum=f(a)+f(b);
  for(let i=1;i<n;i++) sum+=(i%2?4:2)*f(a+i*h); return sum*h/3;
}
export function romberg(f,a,b,maxDepth=10,tol=1e-10) {
  if(!Number.isInteger(maxDepth)||maxDepth<2||maxDepth>17||!(tol>0)) throw Error('Profundidad o tolerancia inválida.');
  const table=[[trapezoid(f,a,b,1)]];
  for(let i=1;i<maxDepth;i++) {
    table[i]=[trapezoid(f,a,b,2**i)];
    for(let j=1;j<=i;j++) table[i][j]=table[i][j-1]+(table[i][j-1]-table[i-1][j-1])/(4**j-1);
    if(Math.abs(table[i][i]-table[i-1][i-1])<=tol) return {value:table[i][i],depth:i+1,converged:true,table};
  }
  return {value:table.at(-1).at(-1),depth:maxDepth,converged:false,table};
}
export function rk2Step(f,t,y,h) { const a=f(t,y), b=f(t+h/2,y.map((v,i)=>v+h*a[i]/2)); return y.map((v,i)=>v+h*b[i]); }
export function rk4Step(f,t,y,h) {
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
export const rk2=(f,t,y,end,h)=>integrate(rk2Step,f,t,y,end,h);
export const rk4=(f,t,y,end,h)=>integrate(rk4Step,f,t,y,end,h);
const metric=(name,value,ref,unit,extra={})=>({name,value,reference:ref,unit,magnitud:unit,errorAbs:absError(value,ref),errorRel:relError(value,ref),errorPct:pctError(value,ref),converged:Number.isFinite(value),residuo:null,history:[],...extra});
export function simulateDetencion({v0,tr,a,tolerance=1e-6,h=.01,scenario='normal'}) {
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
export function windExact({m,c,k,F,x0,v0},t) {
  const eq=F/k,q=x0-eq,g=c/(2*m),w2=k/m,disc=g*g-w2;
  if(Math.abs(disc)<=1e-12*Math.max(w2,g*g)) return eq+Math.exp(-g*t)*(q+(v0+g*q)*t);
  if(disc<0) { const w=Math.sqrt(-disc);return eq+Math.exp(-g*t)*(q*Math.cos(w*t)+(v0+g*q)*Math.sin(w*t)/w); }
  const d=Math.sqrt(disc),r1=-w2/(g+d),r2=-g-d,A=(v0-r2*q)/(r1-r2),B=q-A;
  return eq+A*Math.exp(r1*t)+B*Math.exp(r2*t);
}
// Referencia de cuadratura independiente: Simpson adaptativo por 64 segmentos.
export function adaptiveIntegral(f,a,b,tol=1e-11) {
  function rec(a,b,fa,fm,fb,S,eps,depth) {
    const mid=(a+b)/2,fl=f((a+mid)/2),fr=f((mid+b)/2),L=(mid-a)*(fa+4*fl+fm)/6,R=(b-mid)*(fm+4*fr+fb)/6,delta=L+R-S;
    if(depth===0 && Math.abs(delta)>15*eps) throw Error('La referencia adaptativa no alcanzó precisión.');
    if(Math.abs(delta)<=15*eps || depth===0) return L+R+delta/15;
    return rec(a,mid,fa,fl,fm,L,eps/2,depth-1)+rec(mid,b,fm,fr,fb,R,eps/2,depth-1);
  }
  let value=0; for(let i=0;i<64;i++) { const l=a+(b-a)*i/64,r=a+(b-a)*(i+1)/64,fa=f(l),fm=f((l+r)/2),fb=f(r); value+=rec(l,r,fa,fm,fb,(r-l)*(fa+4*fm+fb)/6,tol/64,22); }
  return value;
}
export function simulateViento(p) {
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
export function simulateSensores({funcion='sin',nNodos=7,a=0,b=2*Math.PI,ruido=0,puntosOcultar=2,umbral=.5,tolerance=1e-6,scenario='normal',perturbation=0}) {
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
