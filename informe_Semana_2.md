# SIMTELE-RISK: Informe de experimentos y fallos detectados

**Proyecto:** SIMTELE-RISK — Desafío Integrador de Métodos Numéricos  
**Contexto:** Sistema de transporte por cable (inspirado en Mi Teleférico, La Paz). Escenarios hipotéticos y datos sintéticos.  
**Estado:** Informe consolidado de experimentos (Semana 1 + Semana 2) con batería ampliada de casos límite  
**Repositorio / aplicación:** [github.com/iTzManix/teleferico](https://github.com/iTzManix/teleferico) · [itzmanix.github.io/teleferico](https://itzmanix.github.io/teleferico/)

- Univ. GABRIEL EFRAIN CRUZ QUINO
- Univ. MELANNY VANIA RAMOS PACO 
- Univ. EDWIN ALVARO MAMANI CHOQUE
- Univ. ADRIANA VALERIA FERNANDEZ FLORES
---

## 1. Resumen ejecutivo

Se documentan experimentos ejecutados sobre los **cuatro módulos** (detención, deterioro, oscilaciones por viento y reconstrucción de sensores), en condiciones **NORMAL**, **ESTRÉS** y **MAL CONDICIONADO**, más una batería de **casos límite** pensados para forzar fallos de modelado, convergencia, estabilidad y de la interfaz del simulador.

**Hallazgos críticos (vista rápida)**

| Módulo | Estado | Fallo / hallazgo principal |
|--------|--------|----------------------------|
| Deterioro | Operativo | Jacobi **diverge** (desbordamiento). Con tolerancia laxa en escenario mal condicionado, Gauss-Seidel y GC “convergen” con **error de parámetros enorme**. |
| Detención | Implementado con bug de modelo | La EDO **no modela la fase de reacción**. Tiempos y distancias numéricos no coinciden con la referencia analítica. Con \(v_0=0\) el simulador **lanza excepción**. |
| Viento | Operativo (amplitudes) | RK2/RK4 coherentes. Métricas de error de \(\int\|x\|\) e \(\int x^2\) **mal referenciadas** (error del mismo orden que el valor). |
| Sensores | Implementado con bug | **Newton por diferencias divididas** tiene error de implementación (coeficientes mal extraídos) → errores medios \(\sim 10^2\). Escenario `estres` **no cambia parámetros** en el núcleo numérico. |

Todos los datos son sintéticos. El sistema es educativo y no describe fallas reales ni recomendaciones operativas.

---

## 2. Cobertura matemática implementada

| Familia | Métodos | Módulo(s) | Evidencia de error |
|---------|---------|-----------|--------------------|
| Errores (transversal) | Absoluto, relativo, %, residual, sensibilidad, \(\kappa(A)\) | Todos | Tablas por método y escenario |
| Sistemas lineales | Jacobi, Gauss-Seidel, LU (pivoteo), gradiente conjugado, solución directa | Deterioro | Residuo, iteraciones, error vs. \(x^*\) |
| Raíces | Bisección, Newton-Raphson, secante | Detención, sensores, (proyección deterioro) | Historial, residual, convergencia |
| Integración | Trapecio compuesto, Simpson 1/3, Romberg | Detención, viento | Valor, profundidad, error |
| EDO | RK2 (punto medio), RK4 clásico | Detención, viento | Trayectoria, amplitud, error vs. ref. |
| Interpolación | Lagrange, Newton (dif. divididas), splines cúbicos | Sensores | Error en ocultos y conocidos |

---

## 3. Modelos matemáticos (referencia)

### 3.1 Deterioro mecánico

$$
D(t) = D_0 + \alpha t + \beta t^2, \qquad y(t) = D(t) + s
$$

Con tres lecturas y calibración independiente del sesgo se forma \(C x = y\). Para comparar métodos iterativos:

$$
A = C^\top C, \qquad b = C^\top y
$$

(matriz simétrica definida positiva). Referencia: solución directa de \(C x = y\).

Errores reportados:

$$
r = b - A\hat{x}, \quad
E_{\mathrm{abs}} = \|\hat{x} - x^*\|_2, \quad
E_{\mathrm{rel}} = \frac{E_{\mathrm{abs}}}{\|x^*\|_2}
\quad (\|x^*\|_2 \neq 0)
$$

### 3.2 Detención de emergencia

Referencia analítica (reacción a velocidad constante + frenado con desaceleración constante):

$$
t_{\mathrm{total}} = t_r + \frac{v_0}{a}, \qquad
d_{\mathrm{total}} = v_0\, t_r + \frac{v_0^2}{2a}
$$

Durante la reacción (\(0 \le t \le t_r\)): \(v \equiv v_0\). Durante el frenado: \(v' = -a\), \(x' = v\).

### 3.3 Oscilaciones por viento

$$
x' = v, \qquad v' = \frac{F - c v - k x}{m}
$$

Referencia numérica de alta precisión: RK4 con paso \(h/10\).

### 3.4 Reconstrucción de sensores

Señal de prueba \(y(t) = \sin(t)\) (o \(e^{-t}\)) en \([0, 2\pi]\). Se ocultan puntos de evaluación densos y se mide el error de predicción real de Lagrange, Newton y splines cúbicos.

---

## 4. Experimentos — Módulo deterioro

### 4.1 Casos base (referencia conocida)

Parámetros que reproducen \(x^* = [D_0,\ \alpha,\ \beta,\ s]^\top = [10,\ 2,\ 0{,}5,\ 3]^\top\) en NORMAL:

| Escenario | Tiempos (meses) | Lecturas \(y_0,y_1,y_2\) | Sesgo | Umbral | \(\kappa_2(A)\) | \(t^*\) al umbral |
|-----------|-----------------|-------------------------|-------|--------|-----------------|-------------------|
| NORMAL | 0, 1, 2 | 13, 15.5, 19 | 3 | 60 | \(\approx 211\) | **8,198** meses |
| ESTRÉS | 0, 1, 2 | 13, 20, 30 | 3 | 60 | \(\approx 211\) | **4,224** meses |
| MAL COND. | 0, 0.02, 0.04 | 13, 15.5, 19 | 3 | 60 | \(\mathbf{\approx 6{,}14\times 10^7}\) | **0,164** meses |

**NORMAL — métodos**

| Método | Iter. | Convergió | Residuo | Error \(\|\hat x-x^*\|_2\) |
|--------|------:|:---------:|--------:|--------------------------:|
| LU (pivoteo) | 0 | Sí | \(\sim 0\) | \(\sim 9{,}5\times 10^{-16}\) |
| Jacobi | 847 | **No** (overflow) | \(\infty\) | \(\sim 10^{307}\) |
| Gauss-Seidel | 328 | Sí | \(9{,}7\times 10^{-7}\) | \(7{,}4\times 10^{-6}\) |
| Gradiente conjugado | 4 | Sí | \(1{,}0\times 10^{-9}\) | \(4{,}1\times 10^{-11}\) |

**MAL CONDICIONADO — métodos**

| Método | Iter. | Convergió | Residuo | Error |
|--------|------:|:---------:|--------:|------:|
| LU | 0 | Sí | \(\sim 0\) | \(\sim 4{,}2\times 10^{-11}\) |
| Jacobi | 842 | **No** | \(\infty\) | \(\infty\) |
| Gauss-Seidel | 282 | Sí | \(9{,}7\times 10^{-7}\) | \(\mathbf{3{,}8\times 10^{-2}}\) |
| Gradiente conjugado | 5 | Sí | \(7{,}0\times 10^{-7}\) | \(1{,}5\times 10^{-6}\) |

**Conclusión numérica parcial:** un residuo pequeño **no** implica parámetros precisos cuando \(\kappa(A)\) es alto.

### 4.2 Casos límite y fallos adicionales (deterioro)

| Caso | Entradas | Resultado observado | Fallo / interpretación |
|------|----------|---------------------|------------------------|
| Tolerancia \(10^{-12}\) | tolerancia fuera de \([10^{-10},\,0{,}1]\) | **Excepción:** “Introduce números válidos…” | Validación de UI/núcleo rechaza tolerancia demasiado estricta (diseño deliberado, pero limita experimentos de alta precisión). |
| Umbral ya superado | threshold = 5 (< \(D_0\)) | `crossing = 0` | Correcto según regla \(D_0 \ge U \Rightarrow t=0\). |
| Índice **decreciente** | \(y = (20,18,15)\), bias = 2 | \(x^* = [18,\ -1{,}5,\ -0{,}5,\ 2]\), **crossing = null** | El modelo solo proyecta cruce si \(\alpha \ge 0\), \(\beta > 0\). No hay tiempo al umbral si el índice baja. |
| MAL + tolerancia laxa \(10^{-3}\) | mismos datos mal | GS: residual OK, **error \(\approx 39\)**; GC: residual OK, **error \(\approx 1{,}2\times 10^3\)** | **Fallo conceptual grave:** con tolerancia floja el criterio de residuo declara “convergido” con parámetros inútiles. Confirma que hay que reportar siempre error vs. referencia, no solo residuo. |

---

## 5. Experimentos — Módulo detención de emergencia

### 5.1 Caso NORMAL de referencia

$$
v_0 = 10\ \mathrm{m/s},\quad t_r = 1\ \mathrm{s},\quad a = 2\ \mathrm{m/s}^2
\quad\Rightarrow\quad
t_{\mathrm{total}} = 6\ \mathrm{s},\quad d_{\mathrm{total}} = 35\ \mathrm{m}
$$

| Método | Valor obtenido | Referencia | Error abs. | Observación |
|--------|----------------|------------|------------|-------------|
| RK2 (distancia a \(t_{\mathrm{end}}\)) | \(-11\) m | 35 m | \(\sim 46\) | Integra más allá de \(v=0\) |
| RK4 (distancia a \(t_{\mathrm{end}}\)) | \(-11\) m | 35 m | \(\sim 46\) | Idem |
| Trapecio / Simpson / Romberg | \(25\) m | 35 m | \(10\) | Solo distancia de frenado \(v_0^2/(2a)\) |
| Bisección / Newton / Secante (tiempo) | \(5\) s | 6 s | \(1\) | Solo \(v_0/a\), sin reacción |

### 5.2 ESTRÉS y otros parámetros

| Caso | \(v_0, t_r, a\) | \(t^*, d^*\) | Tiempo numérico | Distancia integración | Distancia RK |
|------|----------------|--------------|-----------------|----------------------|--------------|
| ESTRÉS | 15, 1.5, 1.5 | 11.5 s, 97.5 m | \(\approx 10\) s | \(\approx 75\) m | \(\approx 43\) m |
| \(a\) pequeña | 10, 1, 0.5 | 21 s, 110 m | 20 s | 100 m | 91 m |
| \(a\) grande | 10, 0.5, 20 | 1 s, 7.5 m | 0.5 s | 2.5 m | \(-300\) m |
| Paso grueso \(h=1\) | 10, 1, 2 | 6 s, 35 m | 5 s | 25 m | \(-11\) m |

En todos los casos el **sesgo sistemático** es el mismo: falta \(t_r\) en el tiempo y \(v_0 t_r\) en la distancia.

### 5.3 Fallo de robustez: \(v_0 = 0\)

```text
simulateDetencion({ v0: 0, tr: 1, a: 2, h: 0.01 })
→ Error: n debe ser > 0   (en trapezoid / integración)
```

**Causa:** con \(v_0=0\) se tiene \(t_{\mathrm{cruce}} \approx 0\) y el número de subintervalos de la cuadratura queda \(\le 0\). El simulador **no valida** este caso y lanza excepción en lugar de devolver \(t=0\), \(d=0\).

### 5.4 Causa raíz del fallo de modelado

La EDO implementada es:

$$
x' = v, \qquad v' = -a \quad \text{desde } t = 0
$$

con \((x(0), v(0)) = (0, v_0)\). **No existe la fase de reacción** \(0 \le t \le t_r\) con \(v' = 0\). Por eso:

1. Las raíces de \(v(t)=0\) encuentran solo \(t = v_0/a\).
2. La integración de \(v\) recupera solo \(v_0^2/(2a)\).
3. RK2/RK4 siguen con \(v < 0\) hasta \(t_{\mathrm{total}}+5\) y la posición se vuelve negativa.

**Corrección recomendada:** EDO por tramos, o sumar analíticamente \(v_0 t_r\) e integrar solo el frenado, deteniendo la integración cuando \(v \le 0\).

---

## 6. Experimentos — Módulo oscilaciones por viento

### 6.1 NORMAL (forzado + amortiguado)

$$
m=500,\ c=50,\ k=200,\ F=100,\ x_0=v_0=0,\ h=0{,}01,\ t\in[0,30]
$$

| Método | Magnitud | Valor | Error vs. RK4 fino |
|--------|----------|------:|-------------------:|
| RK2 | Amplitud máx. \(\|x\|\) | 0,889732 | \(\sim 1{,}9\times 10^{-6}\) |
| RK4 | Amplitud máx. \(\|x\|\) | 0,889733 | \(\sim 6{,}5\times 10^{-7}\) |
| Trap./Simp./Romberg | \(\int_0^{30}\|x\|\,dt\) | \(\approx 14{,}89\) | error reportado \(\sim 14\) (del orden del valor) |
| Trap./Simp./Romberg | \(\int_0^{30} x^2\,dt\) | \(\approx 8{,}61\) | error reportado \(\sim 7{,}7\) |

### 6.2 Otros regímenes

| Caso | Parámetros | Amplitud RK2 | Amplitud RK4 | Comentario |
|------|------------|-------------:|-------------:|------------|
| ESTRÉS (más fuerza, menos amort.) | \(c=20\), \(F=200\), \(h=0{,}05\) | \(\approx 1{,}9053\) | \(\approx 1{,}9053\) | Diferencia RK2/RK4 muy pequeña |
| Vibración libre \(F=0\) | \(m=1\), \(c=0{,}2\), \(k=1\), \(x_0=1\) | 1,000000 | 1,000000 | Coincide con \(\|x_0\|\) (subamortiguado) |
| Sin amortiguamiento \(c=0\) | \(F=0\), \(x_0=1\) | 1,00000 | 1,00000 | Oscilación no amortiguada; amplitud estable |
| Paso grueso \(h=0{,}5\) | NORMAL | 0,89062 | 0,88972 | RK2 degrada más que RK4 (error \(\sim 10^{-3}\) vs \(10^{-6}\)) |
| Fuerte amortiguamiento | \(c=500\), \(k=50\), \(F=100\) | \(\approx 1{,}922\) | \(\approx 1{,}922\) | Amplitudes RK2/RK4 casi idénticas |

### 6.3 Fallos detectados (viento)

1. **Error de las integrales mal definido:** en varios `pushMethod` se compara trapecio/Simpson contra Romberg (o valores del mismo orden), de modo que el “error” reportado es del tamaño de la propia integral. No hay una referencia de alta precisión independiente para \(\int\|x\|\) e \(\int x^2\).
2. Escenario **mal condicionado** del módulo no tiene un subexperimento dedicado cuantificado (p. ej. identificación de \(c,k\) con matriz de sensibilidad ill-conditioned).
3. \(F\) se trata como constante; el caso analítico clásico \(F(t)=0\) subamortiguado está disponible vía parámetros pero no es el default de la UI.

---

## 7. Experimentos — Módulo reconstrucción de sensores

### 7.1 NORMAL (nodos equiespaciados, \(\sin t\), 7 nodos, 2 puntos ocultos, sin ruido)

| Método | Error medio (puntos ocultos) | Error medio (puntos conocidos densos) |
|--------|-----------------------------:|--------------------------------------:|
| Lagrange | \(\approx 0\) | \(\approx 5{,}4\times 10^{-3}\) |
| **Newton (dif. divididas)** | \(\mathbf{\approx 6{,}39}\) | \(\mathbf{\approx 102}\) |
| Spline cúbico | \(\approx 0\) | \(\approx 3{,}1\times 10^{-2}\) |

Raíz de cruce de umbral \(0{,}5\) (bisección sobre Lagrange): \(\approx 0{,}542\) (convergió).

### 7.2 MAL CONDICIONADO (nodos tipo Chebyshev / agrupados en bordes)

| Método | Error ocultos | Error conocidos |
|--------|-------------:|----------------:|
| Lagrange | \(\approx 0{,}012\) | \(\approx 0{,}0065\) |
| Newton | \(\approx 7{,}03\) | \(\approx 99{,}5\) |
| Spline | \(\approx 0{,}110\) | \(\approx 0{,}052\) |

### 7.3 ESTRÉS vs NORMAL

En el **núcleo** `simulateSensores`, el escenario `"estres"` **no modifica** `nNodos`, `ruido`, `puntosOcultar` ni la distribución de nodos. Solo `"mal"` cambia la generación de nodos. Resultado: **NORMAL y ESTRÉS producen números idénticos** si no se sobrescriben parámetros desde la UI.

### 7.4 Diagnóstico del bug de Newton

Prueba unitaria manual (\(y = x^2\) en nodos \(0,1,2,3\)):

| Evaluación en \(x=1{,}5\) | Valor |
|--------------------------|------:|
| Verdad (\(1{,}5^2\)) | 2,25 |
| Lagrange | **2,25** |
| Spline | 2,35 |
| **Newton (implementación actual)** | **1,875** (incorrecto) |

En \(\sin t\):

| Método | \(\sin(\pi/2)\) aproximado |
|--------|---------------------------:|
| Lagrange | \(\approx 0{,}974\) |
| Newton actual | \(\approx -1{,}30\) (absurdo) |
| Verdad | 1 |

**Causa:** en `newtonDividedDiff` los coeficientes se extraen como el último elemento de cada fila de la tabla de diferencias, en lugar de la primera fila completa \(d_{0,0},\, d_{0,1},\, \ldots,\, d_{0,n-1}\). Eso invalida el polinomio de Newton y explica los errores \(\sim 10^2\).

---

## 8. Teoría de errores transversal — síntesis experimental

| Tipo | Dónde se midió | Lección experimental |
|------|----------------|----------------------|
| Residuo \(\|b-A\hat x\|\) | Deterioro | Suficiente solo si \(\kappa(A)\) es moderado. Con \(\kappa\sim 10^7\) y tol laxa, “convergido” ≠ útil. |
| Error abs. vs. referencia | Todos | Obligatorio; el informe debe mostrar siempre error, no solo residuo. |
| Error relativo / % | Cuando \(\|x^*\|\neq 0\) | Implementado; se evita división por cero. |
| Sensibilidad | Deterioro (perturbación \(10^{-4}\)) | Amplificación extrema en mal condicionado (documentada en avance S1). |
| \(\kappa_2(A)\) | Deterioro | \(211 \to 6{,}14\times 10^7\) al acercar nodos temporales. |
| Convergencia / no convergencia | Jacobi, raíces, Romberg, \(v_0=0\) | Documentar como resultado del método; no confundir con “riesgo físico”. |
| Estabilidad de interpolación | Sensores | Newton roto por bug; Lagrange/splines estables en el rango probado. |

---

## 9. Catálogo consolidado de fallos detectados

### 9.1 Fallos de modelado / numéricos

| ID | Módulo | Descripción | Severidad | Reproducibilidad |
|----|--------|-------------|-----------|------------------|
| **F1** | Detención | EDO sin fase de reacción → \(t\) y \(d\) sistemáticamente cortos | **Alta** | Siempre, cualquier \(t_r > 0\) |
| **F2** | Detención | RK continúa con \(v<0\) → posiciones negativas al final del intervalo | **Alta** | Siempre si \(t_{\mathrm{end}} > v_0/a\) |
| **F3** | Detención | \(v_0 = 0\) → excepción `n debe ser > 0` en cuadratura | **Alta** | `simulateDetencion({v0:0,...})` |
| **F4** | Sensores | Newton (dif. divididas): coeficientes mal extraídos → errores \(\sim 10^2\) | **Alta** | Cualquier llamada a `newtonDividedDiff` |
| **F5** | Sensores | Escenario `"estres"` no altera parámetros en el núcleo | **Media** | `scenario: "estres"` vs `"normal"` |
| **F6** | Viento | Error reportado de \(\int\|x\|\) e \(\int x^2\) del orden del valor (referencia circular/incorrecta) | **Media** | Cualquier corrida con integrales |
| **F7** | Deterioro | Jacobi diverge (overflow) en NORMAL/ESTRÉS/MAL | Documentado | Esperado matemáticamente; debe mostrarse, no ocultarse |
| **F8** | Deterioro | Tolerancia laxa + mal condicionamiento → “convergencia” con error de parámetros enorme | **Alta** (pedagógico) | MAL + `tolerance: 1e-3` |
| **F9** | Deterioro | Índice decreciente → `crossing = null` (sin mensaje claro al usuario) | Baja | \(\alpha<0\) o \(\beta\le 0\) |

### 9.2 Fallos de plataforma / ingeniería

| ID | Descripción | Severidad |
|----|-------------|-----------|
| **P1** | Esquema BD guarda instantánea JSON; DER completo (iteraciones, métodos como tablas) no materializado | Media |
| **P2** | Ciclo obligatorio guardar → cerrar → recuperar → repetir aún no verificado E2E con usuario autenticado | Media |
| **P3** | Tests automatizados solo cubren deterioro (`math.test.js`); no hay tests de RK, raíces, integración ni interpolación | Media |
| **P4** | Validación de tolerancia impide \(< 10^{-10}\); limita experimentos de alta precisión | Baja |

---

## 10. Pruebas automatizadas actuales

```bash
npm test
```

| Test | Resultado |
|------|-----------|
| Calibración independiente y proyección de referencia | PASS |
| Mediciones próximas empeoran el condicionamiento | PASS |
| Umbral ya alcanzado y datos inválidos | PASS |
| Historial de iteraciones coherente con resultado | PASS |

**Cobertura:** 4/4 sobre deterioro. **Pendiente:** tests de regresión para F1–F6 (detención, Newton, escenarios de sensores, integrales de viento).

---

## 11. Conclusiones de esta etapa experimental

### Conclusión numérica

- **Sistemas lineales:** LU y gradiente conjugado son fiables en el problema SPD de calibración; Gauss-Seidel converge pero se degrada con mal condicionamiento; Jacobi no es usable aquí.
- **EDO:** RK2 y RK4 dan amplitudes muy cercanas cuando el modelo es coherente; la diferencia crece con paso grueso (a favor de RK4).
- **Integración:** los algoritmos (trapecio, Simpson, Romberg) se ejecutan, pero la **métrica de error** debe redefinirse frente a una referencia independiente.
- **Interpolación:** Lagrange y splines son utilizables; **Newton está incorrecto** y debe corregirse antes de usarlo en conclusiones.
- **Mal condicionamiento:** el escenario de deterioro ilustra de forma clara que residuo pequeño ≠ solución precisa; es el mejor ejemplo pedagógico del sistema en su estado actual.

### Conclusión sobre los problemas modelados

- Bajo supuestos sintéticos, el índice de deterioro alcanza el umbral educativo a \(\approx 8{,}2\) meses (normal) y \(\approx 4{,}2\) meses (estrés).
- La detención de emergencia **aún no entrega tiempos/distancias confiables** hasta corregir la fase de reacción y la parada en \(v=0\).
- Las oscilaciones responden de forma esperada a cambios de \(c\) y \(F\); faltan límites del modelo físico y un subexperimento mal condicionado dedicado.
- La reconstrucción de sensores es viable con Lagrange/splines; la confiabilidad de Newton **no está garantizada** en el estado actual del código.

### Prioridades de corrección (orden sugerido)

1. **F4** — Corregir coeficientes de Newton (diferencias divididas) y añadir test con \(y=x^2\) y \(\sin t\).
2. **F1–F3** — EDO de detención por tramos + detener en \(v\le 0\) + manejar \(v_0=0\) sin excepción.
3. **F6** — Referencia de alta precisión para integrales en viento (y detención).
4. **F5** — Definir parámetros distintos para escenario ESTRÉS en sensores (más ruido, más puntos ocultos, etc.).
5. Ampliar `math.test.js` y cerrar el ciclo de persistencia (P2).

---

## 12. Referencias

[1] T. Sauer, *Numerical Analysis*, 3.ª ed., Pearson, 2018.  
[2] R. L. Burden, J. D. Faires, A. M. Burden, *Numerical Analysis*, 10.ª ed., Cengage Learning, 2016.  
[3] Consigna oficial *Desafío Integrador SIMTELE-RISK: Métodos Numéricos* (secciones 3–13).  
[4] Código y aplicación: repositorio del proyecto y despliegue en GitHub Pages.

---

*Valores numéricos obtenidos ejecutando de forma reproducible las funciones `simulate`, `simulateDetencion`, `simulateViento` y `simulateSensores` de `math.js`, más pruebas manuales de interpolación. Los fallos F1–F9 y P1–P4 se verificaron en las corridas documentadas en este informe.*
