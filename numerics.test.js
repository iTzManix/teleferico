import {test} from 'node:test';
import assert from 'node:assert/strict';
import {simulateDetencion,simulateViento,simulateSensores,newtonDividedDiff,lagrange,cubicSpline,rk4,trapezoid,simpson,romberg,bisection,newton,secant,windExact} from './math.js';
import {allExperiments,experiment} from './experiments.js';
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} vs ${b}`);
test('Newton y Lagrange reproducen un polinomio en nodos y puntos intermedios',()=>{
  const xs=[0,1,2,3],ys=xs.map(x=>x*x);
  for(const x of [0,.4,1,1.5,2.7,3]){near(newtonDividedDiff(xs,ys,x),x*x);near(lagrange(xs,ys,x),x*x);}
});
test('spline natural interpola y conserva derivadas primera y segunda en nodos',()=>{
  const xs=[0,1,2,3],ys=[0,1,4,9],f=x=>cubicSpline(xs,ys,x),e=1e-4;
  xs.forEach((x,i)=>near(f(x),ys[i]));
  for(const x of [1,2]) {near((f(x)-f(x-e))/e,(f(x+e)-f(x))/e,3e-4);near((f(x)-2*f(x-e)+f(x-2*e))/(e*e),(f(x+2*e)-2*f(x+e)+f(x))/(e*e),.001);}
});
test('detención por tramos: 6 segundos, 35 metros y sin retroceso',()=>{
  const r=simulateDetencion({v0:10,tr:1,a:2,h:.3});near(r.ref.tTotal,6);near(r.ref.dTotal,35);
  for(const m of r.resultados) near(m.value,m.unit==='s'?6:35,1e-6);
  assert.ok(r.grafica.v.every(v=>v>=0));assert.ok(r.grafica.x.every((x,i,a)=>i===0||x>=a[i-1]-1e-12));near(r.grafica.t.at(-1),6);
});
test('cabina inicialmente quieta termina sin excepción ni desplazamiento',()=>{
  const r=simulateDetencion({v0:0,tr:1,a:2});r.resultados.forEach(m=>near(m.value,0));near(r.ref.tTotal,0);
});
test('RK ajusta el último paso al extremo solicitado',()=>{const r=rk4((_t,y)=>[y[0]],0,[1],1,.3);near(r.t.at(-1),1);near(r.y.at(-1)[0],Math.E,.0002);});
test('cuadraturas y raíces contra referencias analíticas independientes',()=>{
  near(trapezoid(x=>x,0,1,7),.5);near(simpson(x=>x**3,0,1,7),.25);near(romberg(Math.sin,0,Math.PI,12).value,2,1e-9);
  for(const r of [bisection(x=>x*x-2,0,2),newton(x=>x*x-2,x=>2*x,1),secant(x=>x*x-2,1,2)]) {assert.ok(r.converged);near(r.root,Math.SQRT2,2e-6);}
  assert.equal(bisection(x=>x*x+1,-1,1).converged,false);assert.equal(newton(()=>1,()=>0,0).converged,false);
});
test('viento: solución exacta libre sin amortiguamiento y todos los regímenes',()=>{
  near(windExact({m:1,c:0,k:1,F:0,x0:1,v0:0},Math.PI),-1);
  for(const c of [0,1,2,4]) {const p={m:1,c,k:1,F:1,x0:0,v0:0};near(windExact(p,0),0);const sol=rk4((_t,[x,v])=>[v,1-c*v-x],0,[0,0],3,.01);near(sol.y.at(-1)[0],windExact(p,3),1e-7);}
});
test('viento: refinar h reduce error de trayectoria con órdenes RK2 y RK4',()=>{
  const r=simulateViento({m:500,c:50,k:200,F:100,x0:0,v0:0,h:.2});
  for(const m of r.resultados.slice(0,2)){assert.ok(m.history[0].error>m.history[1].error*3);assert.ok(m.history[1].error>m.history[2].error*3);}
  for(const m of r.resultados.filter(m=>m.name.includes('∫'))) {assert.ok(m.reference>1);near(m.errorAbs,Math.abs(m.value-m.reference));assert.ok(m.unit.includes('s'));}
});
test('sensores: datos ocultos ausentes de entrenamiento y errores no triviales',()=>{
  const r=simulateSensores({nNodos:9,puntosOcultar:2});assert.equal(r.nodos.length,7);assert.equal(r.withheld.length,2);
  assert.ok(r.withheld.every(x=>!r.nodos.includes(x)));assert.ok(r.errorOcultos.lagrange>1e-4);near(r.errorOcultos.lagrange,r.errorOcultos.newton,1e-10);
  const exp=simulateSensores({funcion:'exp',nNodos:9});assert.notDeepEqual(exp.grafica.yRef,r.grafica.yRef);
});
test('12 experimentos con referencias y dos conclusiones; mal condicionamiento cuantificado',()=>{
  const reports=allExperiments();assert.equal(reports.length,12);
  for(const r of reports){assert.ok(r.referenceVerified,r.caso+'/'+r.scenario);assert.ok(r.conclusions.numerical&&r.conclusions.problem);assert.ok(r.methods.length>=3);}
  for(const caso of ['detencion','deterioro','viento','sensores']) {
    const normal=reports.find(r=>r.caso===caso&&r.scenario==='normal'),mal=reports.find(r=>r.caso===caso&&r.scenario==='mal');assert.ok(mal.sensitivity.amplification>normal.sensitivity.amplification*100);
  }
  const d=reports.find(r=>r.caso==='deterioro'&&r.scenario==='normal');assert.equal(d.methods.find(m=>m.name==='Jacobi').converged,false);
});
test('escenarios de interfaz usan entradas coherentes entre S1 y S3',()=>{
  near(experiment('deterioro','estres').reference.crossing,5);near(experiment('deterioro','mal').reference.crossing,Math.sqrt(104)-2,1e-8);
  assert.notDeepEqual(experiment('sensores','normal').inputs,experiment('sensores','estres').inputs);
});
test('validación rechaza pasos peligrosos, nodos duplicados y datos incompatibles',()=>{
  assert.throws(()=>rk4(()=>[1],0,[0],1,0));assert.throws(()=>trapezoid(x=>x,0,1,0));assert.throws(()=>lagrange([0,0],[1,2],.2));
  assert.throws(()=>simulateDetencion({v0:10,tr:1,a:0}));assert.throws(()=>simulateSensores({nNodos:7,puntosOcultar:6}));
});
