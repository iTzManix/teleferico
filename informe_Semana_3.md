# SIMTELE RISK Validación de semana 3

Versión 3.0.0. Generado 2026-11-25T15:05:25.580Z. Fuente base: GitHub main 7218e87; ajustes locales S3.

Equipo: Gabriel Efrain Cruz Quino, Melanny Vania Ramos Paco, Edwin Alvaro Mamani Choque y Adriana Valeria Fernandez Flores.

## Propósito y alcance

Se validan cuatro modelos hipotéticos de transporte por cable en tres escenarios. Las referencias son analíticas o de cuadratura adaptativa independiente. La divergencia, la sensibilidad del problema y el error de discretización se presentan por separado. Todos los datos son sintéticos.

## Modelos y supuestos

- Detención: reacción a velocidad constante y frenado uniforme; no se incluyen pendiente ni fricción variable. t = tr + v0/a y d = v0 tr + v0²/(2a). Si v0 = 0, t = d = 0.
- Deterioro: D(t) = D0 + αt + βt², lectura y = D + s. Sesgo constante con calibración independiente. Umbral educativo de 60 puntos; no es un límite de falla.
- Viento: m x'' + c x' + k x = F, fuerza constante, sistema lineal y parámetros constantes. Referencia analítica en los tres regímenes de amortiguamiento.
- Sensores: señal sin(t) o exp(-t), ruido determinista; los datos ocultos se retiran antes de interpolar. Spline natural en los extremos.

## Teoría de errores y validación

Error absoluto = |aproximación − referencia|; error relativo = error absoluto / |referencia| cuando la referencia no es cero. En sistemas se usa norma 2 de vectores. En sensores se usa MAE y error relativo de norma 2 sobre valores verdaderos ocultos. Residuo y error son métricas diferentes. Las normas de parámetros de distintas unidades requieren interpretar también cada coeficiente.

Para viento, las cuadraturas integran la solución analítica y se comparan con Simpson adaptativo segmentado (tolerancia 10^-11). Esto separa el error de cuadratura del error de la EDO. El máximo de referencia se muestrea en 6001 puntos (paso 0,005 s); no es el extremo continuo exacto. Los órdenes RK2 y RK4 se estudian con el error máximo de trayectoria en sus nodos.

En detención y viento el escenario mal condicionado conserva la dinámica normal y modifica un subexperimento de identificación de parámetros. En sensores se agrupan nodos mediante u^5; no se atribuye mal condicionamiento a nodos de Chebyshev. En deterioro se conserva la curva normal usando observaciones temporales más próximas.

## Cobertura y resultados

Se ejecutaron 12 experimentos y 12 controles definidos por el programa se satisfacen. Esto no significa que cada método entregue una aproximación precisa: Jacobi diverge y el criterio de residuo admite errores de parámetros en MAL.

## Detención de emergencia Normal

Entradas: {"v0":10,"tr":1,"a":2,"tolerance":0.000001,"h":0.1,"scenario":"normal"}

Referencia: Solución analítica por tramos: reacción + frenado uniforme. Valores: {"kind":"Solución analítica por tramos: reacción + frenado uniforme","tTotal":6,"dTotal":35}

| Método | Valor | Unidad | Error absoluto | Error relativo | Estado |
|---|---|---|---|---|---|
| RK2 (distancia) | 35 | m | 3.553e-14 | 1.015e-15 | Calculado / criterio satisfecho |
| RK4 (distancia) | 35 | m | 3.553e-14 | 1.015e-15 | Calculado / criterio satisfecho |
| Trapecio (distancia) | 35 | m | 0 | 0 | Calculado / criterio satisfecho |
| Simpson 1/3 (distancia) | 35 | m | 0 | 0 | Calculado / criterio satisfecho |
| Romberg (distancia) | 35 | m | 0 | 0 | Calculado / criterio satisfecho |
| Bisección (tiempo) | 6 | s | 2.980e-7 | 4.967e-8 | Calculado / criterio satisfecho |
| Newton (tiempo) | 6 | s | 0 | 0 | Calculado / criterio satisfecho |
| Secante (tiempo) | 6 | s | 0 | 0 | Calculado / criterio satisfecho |

### Sensibilidad

Identificación de [tᵣ, q], q = 1/(2a), desde d(v) = v·tᵣ + v²q. Solo cambia la separación de velocidades del experimento, no el frenado físico. κ∞ de la matriz de observaciones. Perturbación 0.0001; cambio 0.00001339983416147294; amplificación absoluta 0.1339983416147294.

### Iteraciones y refinamiento

RK2 (distancia): 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"h":0.1,"value":35.000000000000036,"error":3.552713678800501e-14},{"iteration":2,"h":0.05,"value":35.00000000000002,"error":2.1316282072803006e-14},{"iteration":3,"h":0.025,"value":34.99999999999987,"error":1.2789769243681803e-13}]
```

RK4 (distancia): 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"h":0.1,"value":35.000000000000036,"error":3.552713678800501e-14},{"iteration":2,"h":0.05,"value":35.00000000000002,"error":2.1316282072803006e-14},{"iteration":3,"h":0.025,"value":34.999999999999865,"error":1.3500311979441904e-13}]
```

Trapecio (distancia): 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":13,"value":35,"error":0},{"iteration":2,"n":25,"value":35,"error":0},{"iteration":3,"n":50,"value":35,"error":0}]
```

Simpson 1/3 (distancia): 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":14,"value":35,"error":0},{"iteration":2,"n":26,"value":35,"error":0},{"iteration":3,"n":50,"value":35,"error":0}]
```

Romberg (distancia): 2 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":1,"value":35,"error":0},{"iteration":2,"n":2,"value":35,"error":0}]
```

Bisección (tiempo): 23 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"a":1,"b":7.5,"c":4.25,"fc":3.5,"residual":3.5,"width":3.25,"error":1.75},{"iteration":2,"a":4.25,"b":7.5,"c":5.875,"fc":0.25,"residual":0.25,"width":1.625,"error":0.125},{"iteration":3,"a":5.875,"b":7.5,"c":6.6875,"fc":-1.375,"residual":1.375,"width":0.8125,"error":0.6875},{"iteration":4,"a":5.875,"b":6.6875,"c":6.28125,"fc":-0.5625,"residual":0.5625,"width":0.40625,"error":0.28125},{"iteration":20,"a":5.999994277954102,"b":6.000006675720215,"c":6.000000476837158,"fc":-9.5367431640625e-7,"residual":9.5367431640625e-7,"width":0.000006198883056640625,"error":4.76837158203125e-7},{"iteration":21,"a":5.999994277954102,"b":6.000000476837158,"c":5.99999737739563,"fc":0.000005245208740234375,"residual":0.000005245208740234375,"width":0.0000030994415283203125,"error":0.0000026226043701171875},{"iteration":22,"a":5.99999737739563,"b":6.000000476837158,"c":5.999998927116394,"fc":0.0000021457672119140625,"residual":0.0000021457672119140625,"width":0.0000015497207641601562,"error":0.0000010728836059570312},{"iteration":23,"a":5.999998927116394,"b":6.000000476837158,"c":5.999999701976776,"fc":5.960464477539062e-7,"residual":5.960464477539062e-7,"width":7.748603820800781e-7,"error":2.980232238769531e-7}]
```

Newton (tiempo): 1 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"x":6,"fx":0,"residual":0,"step":5,"error":0}]
```

Secante (tiempo): 1 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"x":6,"fx":0,"residual":0,"step":1.5,"error":0}]
```

### Conclusión numérica

Raíces, cuadraturas y RK se comparan con la referencia de su propia magnitud. Al separar la reacción del frenado se elimina el sesgo anterior. Para aceleración constante, RK2/RK4 y las cuadraturas pueden ser exactos salvo redondeo; eso no prueba su exactitud en una dinámica general.

### Conclusión del problema

La cabina se detiene a los 6.0000 s tras recorrer 35.000 m. La reacción aporta 10.000 m. Velocidad inicial y capacidad de frenado determinan el margen de parada bajo estos supuestos.

## Detención de emergencia Estrés

Entradas: {"v0":15,"tr":1.5,"a":1.5,"tolerance":0.000001,"h":0.1,"scenario":"estres"}

Referencia: Solución analítica por tramos: reacción + frenado uniforme. Valores: {"kind":"Solución analítica por tramos: reacción + frenado uniforme","tTotal":11.5,"dTotal":97.5}

| Método | Valor | Unidad | Error absoluto | Error relativo | Estado |
|---|---|---|---|---|---|
| RK2 (distancia) | 97.5 | m | 1.421e-14 | 1.458e-16 | Calculado / criterio satisfecho |
| RK4 (distancia) | 97.5 | m | 4.263e-14 | 4.373e-16 | Calculado / criterio satisfecho |
| Trapecio (distancia) | 97.5 | m | 0 | 0 | Calculado / criterio satisfecho |
| Simpson 1/3 (distancia) | 97.5 | m | 0 | 0 | Calculado / criterio satisfecho |
| Romberg (distancia) | 97.5 | m | 0 | 0 | Calculado / criterio satisfecho |
| Bisección (tiempo) | 11.5 | s | 1.788e-7 | 1.555e-8 | Calculado / criterio satisfecho |
| Newton (tiempo) | 11.5 | s | 0 | 0 | Calculado / criterio satisfecho |
| Secante (tiempo) | 11.5 | s | 0 | 0 | Calculado / criterio satisfecho |

### Sensibilidad

Identificación de [tᵣ, q], q = 1/(2a), desde d(v) = v·tᵣ + v²q. Solo cambia la separación de velocidades del experimento, no el frenado físico. κ∞ de la matriz de observaciones. Perturbación 0.0001; cambio 0.000015033296376028406; amplificación absoluta 0.15033296376028404.

### Iteraciones y refinamiento

RK2 (distancia): 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"h":0.1,"value":97.50000000000001,"error":1.4210854715202004e-14},{"iteration":2,"h":0.05,"value":97.50000000000017,"error":1.7053025658242404e-13},{"iteration":3,"h":0.025,"value":97.4999999999998,"error":1.9895196601282805e-13}]
```

RK4 (distancia): 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"h":0.1,"value":97.50000000000004,"error":4.263256414560601e-14},{"iteration":2,"h":0.05,"value":97.50000000000017,"error":1.7053025658242404e-13},{"iteration":3,"h":0.025,"value":97.4999999999998,"error":1.9895196601282805e-13}]
```

Trapecio (distancia): 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":25,"value":97.5,"error":0},{"iteration":2,"n":50,"value":97.5,"error":0},{"iteration":3,"n":100,"value":97.5,"error":0}]
```

Simpson 1/3 (distancia): 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":26,"value":97.49999999999999,"error":1.4210854715202004e-14},{"iteration":2,"n":50,"value":97.5,"error":0},{"iteration":3,"n":100,"value":97.5,"error":0}]
```

Romberg (distancia): 2 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":1,"value":97.5,"error":0},{"iteration":2,"n":2,"value":97.5,"error":0}]
```

Bisección (tiempo): 24 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"a":1.5,"b":14.5,"c":8,"fc":5.25,"residual":5.25,"width":6.5,"error":3.5},{"iteration":2,"a":8,"b":14.5,"c":11.25,"fc":0.375,"residual":0.375,"width":3.25,"error":0.25},{"iteration":3,"a":11.25,"b":14.5,"c":12.875,"fc":-2.0625,"residual":2.0625,"width":1.625,"error":1.375},{"iteration":4,"a":11.25,"b":12.875,"c":12.0625,"fc":-0.84375,"residual":0.84375,"width":0.8125,"error":0.5625},{"iteration":21,"a":11.499988555908203,"b":11.500000953674316,"c":11.49999475479126,"fc":0.000007867813110351562,"residual":0.000007867813110351562,"width":0.000006198883056640625,"error":0.000005245208740234375},{"iteration":22,"a":11.49999475479126,"b":11.500000953674316,"c":11.499997854232788,"fc":0.0000032186508178710938,"residual":0.0000032186508178710938,"width":0.0000030994415283203125,"error":0.0000021457672119140625},{"iteration":23,"a":11.499997854232788,"b":11.500000953674316,"c":11.499999403953552,"fc":8.940696716308594e-7,"residual":8.940696716308594e-7,"width":0.0000015497207641601562,"error":5.960464477539062e-7},{"iteration":24,"a":11.499999403953552,"b":11.500000953674316,"c":11.500000178813934,"fc":-2.682209014892578e-7,"residual":2.682209014892578e-7,"width":7.748603820800781e-7,"error":1.7881393432617188e-7}]
```

Newton (tiempo): 1 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"x":11.5,"fx":0,"residual":0,"step":10,"error":0}]
```

Secante (tiempo): 1 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"x":11.5,"fx":0,"residual":0,"step":3,"error":0}]
```

### Conclusión numérica

Raíces, cuadraturas y RK se comparan con la referencia de su propia magnitud. Al separar la reacción del frenado se elimina el sesgo anterior. Para aceleración constante, RK2/RK4 y las cuadraturas pueden ser exactos salvo redondeo; eso no prueba su exactitud en una dinámica general.

### Conclusión del problema

La cabina se detiene a los 11.500 s tras recorrer 97.500 m. La reacción aporta 22.500 m. Velocidad inicial y capacidad de frenado determinan el margen de parada bajo estos supuestos.

## Detención de emergencia Mal condicionado

Entradas: {"v0":10,"tr":1,"a":2,"tolerance":0.000001,"h":0.1,"scenario":"mal"}

Referencia: Solución analítica por tramos: reacción + frenado uniforme. Valores: {"kind":"Solución analítica por tramos: reacción + frenado uniforme","tTotal":6,"dTotal":35}

| Método | Valor | Unidad | Error absoluto | Error relativo | Estado |
|---|---|---|---|---|---|
| RK2 (distancia) | 35 | m | 3.553e-14 | 1.015e-15 | Calculado / criterio satisfecho |
| RK4 (distancia) | 35 | m | 3.553e-14 | 1.015e-15 | Calculado / criterio satisfecho |
| Trapecio (distancia) | 35 | m | 0 | 0 | Calculado / criterio satisfecho |
| Simpson 1/3 (distancia) | 35 | m | 0 | 0 | Calculado / criterio satisfecho |
| Romberg (distancia) | 35 | m | 0 | 0 | Calculado / criterio satisfecho |
| Bisección (tiempo) | 6 | s | 2.980e-7 | 4.967e-8 | Calculado / criterio satisfecho |
| Newton (tiempo) | 6 | s | 0 | 0 | Calculado / criterio satisfecho |
| Secante (tiempo) | 6 | s | 0 | 0 | Calculado / criterio satisfecho |

### Sensibilidad

Identificación de [tᵣ, q], q = 1/(2a), desde d(v) = v·tᵣ + v²q. Solo cambia la separación de velocidades del experimento, no el frenado físico. κ∞ de la matriz de observaciones. Perturbación 0.0001; cambio 0.10048870734490348; amplificación absoluta 1004.8870734490347.

### Iteraciones y refinamiento

RK2 (distancia): 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"h":0.1,"value":35.000000000000036,"error":3.552713678800501e-14},{"iteration":2,"h":0.05,"value":35.00000000000002,"error":2.1316282072803006e-14},{"iteration":3,"h":0.025,"value":34.99999999999987,"error":1.2789769243681803e-13}]
```

RK4 (distancia): 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"h":0.1,"value":35.000000000000036,"error":3.552713678800501e-14},{"iteration":2,"h":0.05,"value":35.00000000000002,"error":2.1316282072803006e-14},{"iteration":3,"h":0.025,"value":34.999999999999865,"error":1.3500311979441904e-13}]
```

Trapecio (distancia): 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":13,"value":35,"error":0},{"iteration":2,"n":25,"value":35,"error":0},{"iteration":3,"n":50,"value":35,"error":0}]
```

Simpson 1/3 (distancia): 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":14,"value":35,"error":0},{"iteration":2,"n":26,"value":35,"error":0},{"iteration":3,"n":50,"value":35,"error":0}]
```

Romberg (distancia): 2 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":1,"value":35,"error":0},{"iteration":2,"n":2,"value":35,"error":0}]
```

Bisección (tiempo): 23 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"a":1,"b":7.5,"c":4.25,"fc":3.5,"residual":3.5,"width":3.25,"error":1.75},{"iteration":2,"a":4.25,"b":7.5,"c":5.875,"fc":0.25,"residual":0.25,"width":1.625,"error":0.125},{"iteration":3,"a":5.875,"b":7.5,"c":6.6875,"fc":-1.375,"residual":1.375,"width":0.8125,"error":0.6875},{"iteration":4,"a":5.875,"b":6.6875,"c":6.28125,"fc":-0.5625,"residual":0.5625,"width":0.40625,"error":0.28125},{"iteration":20,"a":5.999994277954102,"b":6.000006675720215,"c":6.000000476837158,"fc":-9.5367431640625e-7,"residual":9.5367431640625e-7,"width":0.000006198883056640625,"error":4.76837158203125e-7},{"iteration":21,"a":5.999994277954102,"b":6.000000476837158,"c":5.99999737739563,"fc":0.000005245208740234375,"residual":0.000005245208740234375,"width":0.0000030994415283203125,"error":0.0000026226043701171875},{"iteration":22,"a":5.99999737739563,"b":6.000000476837158,"c":5.999998927116394,"fc":0.0000021457672119140625,"residual":0.0000021457672119140625,"width":0.0000015497207641601562,"error":0.0000010728836059570312},{"iteration":23,"a":5.999998927116394,"b":6.000000476837158,"c":5.999999701976776,"fc":5.960464477539062e-7,"residual":5.960464477539062e-7,"width":7.748603820800781e-7,"error":2.980232238769531e-7}]
```

Newton (tiempo): 1 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"x":6,"fx":0,"residual":0,"step":5,"error":0}]
```

Secante (tiempo): 1 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"x":6,"fx":0,"residual":0,"step":1.5,"error":0}]
```

### Conclusión numérica

Raíces, cuadraturas y RK se comparan con la referencia de su propia magnitud. Al separar la reacción del frenado se elimina el sesgo anterior. Para aceleración constante, RK2/RK4 y las cuadraturas pueden ser exactos salvo redondeo; eso no prueba su exactitud en una dinámica general.

### Conclusión del problema

La cabina se detiene a los 6.0000 s tras recorrer 35.000 m. La reacción aporta 10.000 m. Velocidad inicial y capacidad de frenado determinan el margen de parada bajo estos supuestos.

## Deterioro mecánico Normal

Entradas: {"y0":13,"y1":15.5,"y2":19,"bias":3,"threshold":60,"tolerance":0.000001,"scenario":"normal"}

Referencia: Diferencias finitas de las tres lecturas y calibración independiente. Valores: {"kind":"Diferencias finitas de las tres lecturas y calibración independiente","parameters":[10,2,0.5,3],"crossing":8.19803902718557,"condition":211.0159161850436}

| Método | Valor | Unidad | Error absoluto | Error relativo | Estado |
|---|---|---|---|---|---|
| LU (pivoteo) | 10; 2; 0.5; 3 | vector de parámetros | 9.486e-16 | 8.914e-17 | Calculado / criterio satisfecho |
| Jacobi | 1.254e+307; 1.000e+307; 5.207e+306; 1.018e+307 | vector de parámetros | 1.970e+307 | 1.851e+306 | No convergió |
| Gauss-Seidel | 10; 2.00001; 0.499997; 3 | vector de parámetros | 7.426e-6 | 6.978e-7 | Calculado / criterio satisfecho |
| Gradiente conjugado | 10; 2; 0.5; 3 | vector de parámetros | 4.101e-11 | 3.854e-12 | Calculado / criterio satisfecho |

### Sensibilidad

Cambio en β al aumentar y₂ en 0,0001 puntos. κ₂ corresponde a CᵀC; las ecuaciones normales elevan al cuadrado κ₂(C). Perturbación 0.0001; cambio 0.00004999999999988347; amplificación absoluta 0.4999999999988347.

### Iteraciones y refinamiento

Jacobi: 846 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"x":[15.833333333333334,10.7,5.382352941176471,12.625],"residual":309.1351705709327,"error":15.039806282661765},{"iteration":2,"x":[-16.46225490196078,-16.063235294117646,-8.652450980392157,-14.002941176470586],"residual":702.0314363331328,"error":37.40853874967592},{"iteration":3,"x":[60.32026143790849,44.5535294117647,22.846770472895038,47.834681372549014],"residual":1619.6855774627447,"error":82.77957707625494},{"iteration":4,"x":[-114.63282823913876,-95.31715253748557,-50.0150869857747,-94.58880622837368],"residual":3723.3463211356348,"error":192.55991059187357},{"iteration":843,"x":[4.479144792251522e+305,3.570897608529951e+305,1.8591389108720436e+305,3.634673476460005e+305],"residual":1.364663268661142e+307,"error":7.034294319330063e+305},{"iteration":844,"x":[-1.0304135936443361e+306,-8.214741000796596e+305,-4.276892342372188e+305,-8.361455439176159e+305],"residual":3.139366213854226e+307,"error":1.6182179466204255e+306},{"iteration":845,"x":[2.37043503439264e+306,1.889776104164165e+306,9.838860346192174e+305,1.92352731308952e+306],"residual":7.222016193312415e+307,"error":3.7226610145789585e+306},{"iteration":846,"x":[-5.453113474952381e+306,-4.347372270803887e+306,-2.263399804405193e+306,-4.425015897191625e+306],"residual":1.6614027909930432e+308,"error":8.563868086130347e+306}]
```

Gauss-Seidel: 328 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"x":[15.833333333333334,1.2,0.09019607843137244,-0.26274509803921653],"residual":3.5173759923539403,"error":6.743976764987387},{"iteration":2,"x":[14.745751633986929,1.8478431372549011,0.14437524029219495,-0.0006651287966157327],"residual":3.5133799707134035,"error":5.628123174492833},{"iteration":3,"x":[13.745529924388057,2.1932056901191856,0.17863675358647746,0.4476523471364722],"residual":3.777911249391763,"error":4.547974904328764},{"iteration":4,"x":[12.894747373433546,2.3730140112023292,0.2018161939017029,0.9219087191459643],"residual":3.5500500058629583,"error":3.595285630146025},{"iteration":325,"x":[9.999997978863819,2.000007280241303,0.49999667602307674,3.0000002106423125],"residual":0.0000010754445226569105,"error":0.000008257124055303589},{"iteration":326,"x":[9.999998049077924,2.0000070273263204,0.4999967914977612,3.000000203324614],"residual":0.0000010380836655621438,"error":0.000007970272246063273},{"iteration":327,"x":[9.999998116852797,2.0000067831975827,0.4999969029608643,3.0000001962611336],"residual":0.0000010020207259357925,"error":0.000007693385644423219},{"iteration":328,"x":[9.999998182273176,2.0000065475498587,0.4999970105517478,3.000000189443039],"residual":9.672106083518577e-7,"error":0.000007426118062468244}]
```

Gradiente conjugado: 4 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"x":[1.9180831440606125,2.160367330678795,3.694833845927285,2.039225237369704],"residual":19.138306101936916,"error":8.74489274917972},{"iteration":2,"x":[5.749860809788732,1.767436813558687,0.9400559341682571,6.206447386026724],"residual":2.298212446369376,"error":5.3472163633438035},{"iteration":3,"x":[9.86746944690432,2.491102198528755,0.2729274936253291,3.0150686161757005],"residual":0.06714873742927445,"error":0.557256407094929},{"iteration":4,"x":[10.000000000011378,2.000000000017983,0.5000000000329948,3.000000000011848],"residual":1.0419858967786756e-9,"error":4.101055806359447e-11}]
```

### Conclusión numérica

Jacobi diverge en esta matriz. Gauss-Seidel y gradiente conjugado deben evaluarse por error y residuo: GC termina con error relativo 3.8537e-10 %. κ₂(A) = 211.02. Las normas de parámetros mezclan unidades; los errores por coeficiente se obtienen de los vectores de la tabla.

### Conclusión del problema

Con D₀ = 10.000, α = 2.0000 y β = 0.50000, el umbral hipotético 60 se alcanza en 8.1980 meses. Es una proyección del índice, no el instante de falla del rodamiento.

## Deterioro mecánico Estrés

Entradas: {"y0":18,"y1":23,"y2":30,"bias":3,"threshold":60,"tolerance":0.000001,"scenario":"estres"}

Referencia: Diferencias finitas de las tres lecturas y calibración independiente. Valores: {"kind":"Diferencias finitas de las tres lecturas y calibración independiente","parameters":[15,4,1,3],"crossing":5,"condition":211.0159161850436}

| Método | Valor | Unidad | Error absoluto | Error relativo | Estado |
|---|---|---|---|---|---|
| LU (pivoteo) | 15; 4; 1; 3 | vector de parámetros | 1.897e-15 | 1.197e-16 | Calculado / criterio satisfecho |
| Jacobi | -8.273e+306; -6.596e+306; -3.434e+306; -6.714e+306 | vector de parámetros | 1.299e+307 | 8.201e+305 | No convergió |
| Gauss-Seidel | 15; 4.00001; 0.999997; 3 | vector de parámetros | 7.586e-6 | 4.788e-7 | Calculado / criterio satisfecho |
| Gradiente conjugado | 15; 4; 1; 3 | vector de parámetros | 4.925e-11 | 3.109e-12 | Calculado / criterio satisfecho |

### Sensibilidad

Cambio en β al aumentar y₂ en 0,0001 puntos. κ₂ corresponde a CᵀC; las ecuaciones normales elevan al cuadrado κ₂(C). Perturbación 0.0001; cambio 0.00004999999999988347; amplificación absoluta 0.4999999999988347.

### Iteraciones y refinamiento

Jacobi: 845 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"x":[23.666666666666668,16.6,8.411764705882353,18.5],"residual":467.8599069977383,"error":23.001203602561205},{"iteration":2,"x":[-25.452941176470592,-23.84117647058823,-12.77843137254902,-22.214705882352945],"residual":1065.5708584753759,"error":56.89638056076179},{"iteration":3,"x":[91.01993464052288,68.20176470588235,35.05346020761245,71.44362745098039],"residual":2457.2386507880537,"error":125.4793423032608},{"iteration":4,"x":[-174.40115916955017,-143.9743656286044,-75.4784525182622,-144.7330997693195],"residual":5649.090731200179,"error":292.3067471766551},{"iteration":842,"x":[-2.9540775797237667e+305,-2.3550720180101718e+305,-1.2261359766042513e+305,-2.397133364610422e+305],"residual":9.000202835144374e+306,"error":4.639245235799986e+305},{"iteration":843,"x":[6.79576534362768e+305,5.417771324488166e+305,2.820688404927205e+305,5.514532169055768e+305],"residual":2.0704692027219218e+307,"error":1.0672442122182673e+306},{"iteration":844,"x":[-1.5633450835089277e+306,-1.2463417636479037e+306,-6.488907616694749e+305,-1.268601300724589e+306],"residual":4.763051231112821e+307,"error":2.4551627487245347e+306},{"iteration":845,"x":[3.596427667154951e+306,2.867171201545165e+306,1.4927533996469836e+306,2.9183785874544674e+306],"residual":1.0957254037094861e+308,"error":5.648026996741243e+306}]
```

Gauss-Seidel: 347 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"x":[23.666666666666668,2.4,0.18039215686274487,-1.275490196078433],"residual":7.9877811218796735,"error":9.829683847632436},{"iteration":2,"x":[22.241503267973858,3.6956862745098022,0.2887504805843916,-1.313830257593235],"residual":4.402934552654577,"error":8.464454134425543},{"iteration":3,"x":[20.803559848776114,4.386411380238369,0.3572735071729583,-0.8390703057270628],"residual":4.953686953294989,"error":6.998726943523443},{"iteration":4,"x":[19.523869746867096,4.746028022404654,0.40363238780340915,-0.20696381170807499],"residual":5.06222216483456,"error":5.626919807080479},{"iteration":344,"x":[14.999997935246746,4.000007437352346,0.9999966042900869,3.000000215188072],"residual":0.000001098653111395482,"error":0.000008435316689022382},{"iteration":345,"x":[14.999998006976105,4.000007178979338,0.9999967222567685,3.000000207712457],"residual":0.0000010604859969600895,"error":0.000008142274482014243},{"iteration":346,"x":[14.999998076213592,4.000006929582187,0.9999968361252978,3.000000200496544],"residual":0.000001023644800821427,"error":0.00000785941253717113},{"iteration":347,"x":[14.999998143045772,4.000006688849075,0.9999969460380435,3.00000019353131],"residual":9.880834693193348e-7,"error":0.000007586377195137976}]
```

Gradiente conjugado: 4 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"x":[2.847654929749076,3.328948720692581,5.73541767541011,2.967978377484952],"residual":25.19977723610126,"error":13.059670993972514},{"iteration":2,"x":[8.177146498192402,2.8921041409954866,2.0426262643845035,8.324762518553143],"residual":3.830804073039977,"error":8.78743014468396},{"iteration":3,"x":[14.91823335720763,4.295515964275985,0.8635349524609077,3.010520704787968],"residual":0.040434158219321115,"error":0.3357809754059673},{"iteration":4,"x":[15.000000000013728,4.000000000021556,1.000000000039589,3.0000000000143214],"residual":1.2512737785899317e-9,"error":4.9249432920240654e-11}]
```

### Conclusión numérica

Jacobi diverge en esta matriz. Gauss-Seidel y gradiente conjugado deben evaluarse por error y residuo: GC termina con error relativo 3.1086e-10 %. κ₂(A) = 211.02. Las normas de parámetros mezclan unidades; los errores por coeficiente se obtienen de los vectores de la tabla.

### Conclusión del problema

Con D₀ = 15.000, α = 4.0000 y β = 1.0000, el umbral hipotético 60 se alcanza en 5.0000 meses. Es una proyección del índice, no el instante de falla del rodamiento.

## Deterioro mecánico Mal condicionado

Entradas: {"y0":13,"y1":13.0402,"y2":13.0808,"bias":3,"threshold":60,"tolerance":0.000001,"scenario":"mal"}

Referencia: Diferencias finitas de las tres lecturas y calibración independiente. Valores: {"kind":"Diferencias finitas de las tres lecturas y calibración independiente","parameters":[10,2.000000000000046,0.4999999999988347,3],"crossing":8.198039027193213,"condition":61433862.20220833}

| Método | Valor | Unidad | Error absoluto | Error relativo | Estado |
|---|---|---|---|---|---|
| LU (pivoteo) | 10; 2; 0.5; 3 | vector de parámetros | 9.636e-12 | 9.055e-13 | Calculado / criterio satisfecho |
| Jacobi | 3.488e+305; 1.390e+307; no finito; 2.830e+305 | vector de parámetros | no finito | no finito | No convergió |
| Gauss-Seidel | 10; 1.99833; 0.538209; 3 | vector de parámetros | 0.0382455 | 0.00359386 | Calculado / criterio satisfecho |
| Gradiente conjugado | 9.99994; 2.01683; 0.0794055; 3 | vector de parámetros | 0.420931 | 0.0395541 | Calculado / criterio satisfecho |

### Sensibilidad

Cambio en β al aumentar y₂ en 0,0001 puntos. κ₂ corresponde a CᵀC; las ecuaciones normales elevan al cuadrado κ₂(C). Perturbación 0.0001; cambio 0.12499999999970868; amplificación absoluta 1249.9999999970867.

### Iteraciones y refinamiento

Jacobi: 842 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"x":[13.040333333333331,392.01800000000003,9612.264705882353,10.530249999999999],"residual":110.60053491300175,"error":9619.677788255776},{"iteration":2,"x":[-11.738453137254902,-661.1410294117647,-18095.993627450975,-9.936402352941176],"residual":263.9150457037862,"error":18108.657530146007},{"iteration":3,"x":[48.26355202614379,1693.7194352941176,43050.45040369089,38.29920210784313],"residual":602.9869471720327,"error":43083.20849868404},{"iteration":4,"x":[-87.83355774951941,-3754.6808385524796,-98870.56897395232,-72.59843075086505],"residual":1388.9355411014653,"error":98942.48944463918},{"iteration":839,"x":[1.2453564239249797e+304,4.964162225403008e+305,1.2922615214564027e+307,1.0105643315236294e+304],"residual":1.81699545786612e+305,"error":1.2932156442951498e+307},{"iteration":840,"x":[-2.864904457575166e+304,-1.1419903743588878e+306,-2.9728082033777146e+307,-2.3247724124823875e+304],"residual":4.179942614523389e+305,"error":2.975003133858087e+307},{"iteration":841,"x":[6.590625296785307e+304,2.6271140142332435e+306,6.838854571874669e+307,5.348068006408563e+304],"residual":9.615830455199734e+305,"error":6.84390394247772e+307},{"iteration":842,"x":[-1.5161532416124831e+305,-6.043595636833043e+306,-1.5732576290024668e+308,-1.230306727987618e+305],"residual":2.2120924584437105e+306,"error":1.5744192213041339e+308}]
```

Gauss-Seidel: 139 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"x":[13.040333333333331,0.8080000000001419,2.3960784313715844,0.7366819607843116],"residual":2.2637534581310317,"error":4.402523451650614},{"iteration":2,"x":[12.285893986928102,1.2544627450982726,3.634848135330768,1.2951951445597825],"residual":1.705136300036088,"error":4.302879215670266},{"iteration":3,"x":[11.717625701781364,1.5025200768937763,4.241493301969695,1.7173721758595857],"residual":1.2828790680770297,"error":4.340694712746535},{"iteration":4,"x":[11.290083093734557,1.6416481533048644,4.503968299179157,2.0358109732499194],"residual":0.964378898146126,"error":4.330606545845028},{"iteration":136,"x":[10.00001033305047,1.998138989803666,0.5424845461132775,2.9999989230920345],"residual":0.0000010822864503179903,"error":0.04252528806995792},{"iteration":137,"x":[10.000009974081149,1.9982036411445026,0.5410086364818395,2.9999989605037287],"residual":0.0000010446879070740493,"error":0.04104796306634434},{"iteration":138,"x":[10.000009627582392,1.99826604650305,0.539583999832381,2.9999989966157434],"residual":0.0000010083955370194436,"error":0.039621960214621686},{"iteration":139,"x":[10.000009293120973,1.9983262839045612,0.5382088549419081,2.99999903147323],"residual":9.733639597399442e-7,"error":0.03824549658364038}]
```

Gradiente conjugado: 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"x":[5.991142749467458,0.12007033554156256,0.004004002556075165,6.450574467685356],"residual":2.44185391566617,"error":5.635383588095812},{"iteration":2,"x":[10.036283326338602,0.20428619919165597,0.0068334003442206736,2.9999696490516037],"residual":0.0014532252494212044,"error":1.8625567991661311},{"iteration":3,"x":[9.999943875817763,2.01682602114924,0.07940551529092005,2.99999999991756],"residual":4.483393828716977e-8,"error":0.4209309191593713}]
```

### Conclusión numérica

Jacobi diverge en esta matriz. Gauss-Seidel y gradiente conjugado deben evaluarse por error y residuo: GC termina con error relativo 3.9554 %. κ₂(A) = 6.1434e+7. Las normas de parámetros mezclan unidades; los errores por coeficiente se obtienen de los vectores de la tabla.

### Conclusión del problema

Con D₀ = 10.000, α = 2.0000 y β = 0.50000, el umbral hipotético 60 se alcanza en 8.1980 meses. Es una proyección del índice, no el instante de falla del rodamiento.

## Oscilaciones por viento Normal

Entradas: {"m":500,"c":50,"k":200,"F":100,"x0":0,"v0":0,"tolerance":0.000001,"h":0.4,"scenario":"normal"}

Referencia: Solución analítica e integración adaptativa independiente. Valores: {"kind":"Solución analítica e integración adaptativa independiente","xMax":0.8897333177419291,"integrals":[{"name":"Romberg ∫|x|","value":14.89153070565694,"unit":"m·s"},{"name":"Romberg ∫x²","value":8.609621946334693,"unit":"m²·s"}]}

| Método | Valor | Unidad | Error absoluto | Error relativo | Estado |
|---|---|---|---|---|---|
| RK2 (ampl. máx.) | 0.888809 | m | 9.246e-4 | 0.00103918 | Calculado / criterio satisfecho |
| RK4 (ampl. máx.) | 0.887113 | m | 0.00262029 | 0.00294503 | Calculado / criterio satisfecho |
| Trapecio ∫|x| | 14.8916 | m·s | 6.055e-5 | 4.066e-6 | Calculado / criterio satisfecho |
| Simpson ∫|x| | 14.8915 | m·s | 1.882e-6 | 1.264e-7 | Calculado / criterio satisfecho |
| Romberg ∫|x| | 14.8915 | m·s | 1.612e-10 | 1.083e-11 | Calculado / criterio satisfecho |
| Trapecio ∫x² | 8.60967 | m²·s | 4.752e-5 | 5.519e-6 | Calculado / criterio satisfecho |
| Simpson ∫x² | 8.60962 | m²·s | 6.936e-7 | 8.056e-8 | Calculado / criterio satisfecho |
| Romberg ∫x² | 8.60962 | m²·s | 2.381e-11 | 2.766e-12 | Calculado / criterio satisfecho |

### Sensibilidad

Identificación [c, k] a partir de F−m·x″ = c·v + k·x. Filas [v, x] sintéticas; casi dependientes en MAL. κ∞ mide sensibilidad del problema inverso, no inestabilidad física. Perturbación 0.0001; cambio 0.00014142135620180986; amplificación absoluta 1.4142135620180984.

### Iteraciones y refinamiento

RK2 (ampl. máx.): 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"h":0.4,"error":0.024951247537125854},{"iteration":2,"h":0.2,"error":0.006206177267126967},{"iteration":3,"h":0.1,"error":0.0015510702697241197}]
```

RK4 (ampl. máx.): 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"h":0.4,"error":0.0000800833113141497},{"iteration":2,"h":0.2,"error":0.000004988943249850664},{"iteration":3,"h":0.1,"error":3.1102123732029696e-7}]
```

Trapecio ∫|x|: 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":19,"value":14.892357069110899,"error":0.0008263634539584785},{"iteration":2,"n":38,"value":14.891760981453595,"error":0.00023027579665502174},{"iteration":3,"n":75,"value":14.891591256825684,"error":0.00006055116874392752}]
```

Simpson ∫|x|: 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":20,"value":14.892018431618544,"error":0.0004877259616034024},{"iteration":2,"n":38,"value":14.891562285567828,"error":0.0000315799108872028},{"iteration":3,"n":76,"value":14.891532588012092,"error":0.0000018823551517499482}]
```

Romberg ∫|x|: 8 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":1,"value":5.821443957192862,"error":9.070086748464078},{"iteration":2,"n":2,"value":16.67379460783585,"error":1.782263902178908},{"iteration":3,"n":4,"value":14.697100957388576,"error":0.19442974826836412},{"iteration":4,"n":8,"value":15.003036462546408,"error":0.11150575688946773},{"iteration":5,"n":16,"value":14.88437804229439,"error":0.007152663362550271},{"iteration":6,"n":32,"value":14.89161956008712,"error":0.00008885443017980776},{"iteration":7,"n":64,"value":14.891530458529854,"error":2.471270867943076e-7},{"iteration":8,"n":128,"value":14.891530705818148,"error":1.6120793588925153e-10}]
```

Trapecio ∫x²: 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":19,"value":8.610439538498467,"error":0.0008175921637736394},{"iteration":2,"n":38,"value":8.609809121914004,"error":0.00018717557931147155},{"iteration":3,"n":75,"value":8.60966946615611,"error":0.00004751982141648625}]
```

Simpson ∫x²: 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":20,"value":8.608159773062688,"error":0.0014621732720048186},{"iteration":2,"n":38,"value":8.609598983052516,"error":0.000022963282177101974},{"iteration":3,"n":76,"value":8.609621252736213,"error":6.935984799838479e-7}]
```

Romberg ∫x²: 9 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":1,"value":2.2592806497824864,"error":6.350341296552207},{"iteration":2,"n":2,"value":11.606619573182131,"error":2.9969976268474383},{"iteration":3,"n":4,"value":8.038978262057691,"error":0.5706436842770017},{"iteration":4,"n":8,"value":8.730150276106274,"error":0.1205283297715809},{"iteration":6,"n":32,"value":8.610638759700366,"error":0.0010168133656733858},{"iteration":7,"n":64,"value":8.60960936799541,"error":0.000012578339282143247},{"iteration":8,"n":128,"value":8.609621982089593,"error":3.575489948559607e-8},{"iteration":9,"n":256,"value":8.609621946310883,"error":2.3810287075320957e-11}]
```

### Conclusión numérica

La trayectoria se valida con la solución analítica: error máximo RK2 = 0.024951 m y RK4 = 0.000080083 m. Las tablas refinan h; cada integral usa una referencia adaptativa independiente con sus unidades. El máximo muestreado añade error de localización del pico.

### Conclusión del problema

El máximo de desplazamiento de referencia muestreado en 30 s es 0.88973 m. La fuerza constante desplaza el equilibrio a 0.50000 m. El caso mal condicionado estudia la identificación de parámetros, manteniendo la misma dinámica normal.

## Oscilaciones por viento Estrés

Entradas: {"m":500,"c":20,"k":200,"F":200,"x0":0,"v0":0,"tolerance":0.000001,"h":0.4,"scenario":"estres"}

Referencia: Solución analítica e integración adaptativa independiente. Valores: {"kind":"Solución analítica e integración adaptativa independiente","xMax":1.9053844647222722,"integrals":[{"name":"Romberg ∫|x|","value":29.85542568943246,"unit":"m·s"},{"name":"Romberg ∫x²","value":38.508119179635706,"unit":"m²·s"}]}

| Método | Valor | Unidad | Error absoluto | Error relativo | Estado |
|---|---|---|---|---|---|
| RK2 (ampl. máx.) | 1.90659 | m | 0.00120626 | 6.331e-4 | Calculado / criterio satisfecho |
| RK4 (ampl. máx.) | 1.90014 | m | 0.00524441 | 0.00275242 | Calculado / criterio satisfecho |
| Trapecio ∫|x| | 29.856 | m·s | 5.299e-4 | 1.775e-5 | Calculado / criterio satisfecho |
| Simpson ∫|x| | 29.8554 | m·s | 1.158e-6 | 3.880e-8 | Calculado / criterio satisfecho |
| Romberg ∫|x| | 29.8554 | m·s | 5.678e-11 | 1.902e-12 | Calculado / criterio satisfecho |
| Trapecio ∫x² | 38.5086 | m²·s | 4.785e-4 | 1.243e-5 | Calculado / criterio satisfecho |
| Simpson ∫x² | 38.5081 | m²·s | 3.980e-6 | 1.033e-7 | Calculado / criterio satisfecho |
| Romberg ∫x² | 38.5081 | m²·s | 2.330e-11 | 6.050e-13 | Calculado / criterio satisfecho |

### Sensibilidad

Identificación [c, k] a partir de F−m·x″ = c·v + k·x. Filas [v, x] sintéticas; casi dependientes en MAL. κ∞ mide sensibilidad del problema inverso, no inestabilidad física. Perturbación 0.0001; cambio 0.00014142135620180986; amplificación absoluta 1.4142135620180984.

### Iteraciones y refinamiento

RK2 (ampl. máx.): 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"h":0.4,"error":0.10761262835787666},{"iteration":2,"h":0.2,"error":0.026783550623849406},{"iteration":3,"h":0.1,"error":0.006678702653068358}]
```

RK4 (ampl. máx.): 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"h":0.4,"error":0.00034410723104594254},{"iteration":2,"h":0.2,"error":0.000021408220128416033},{"iteration":3,"h":0.1,"error":0.0000013345424643151915}]
```

Trapecio ∫|x|: 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":19,"value":29.863751539251016,"error":0.008325849818554332},{"iteration":2,"n":38,"value":29.857493215292443,"error":0.0020675258599816004},{"iteration":3,"n":75,"value":29.855955562217982,"error":0.0005298727855205243}]
```

Simpson ∫|x|: 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":20,"value":29.855182840166616,"error":0.00024284926584527966},{"iteration":2,"n":38,"value":29.85540710730626,"error":0.000018582126202204563},{"iteration":3,"n":76,"value":29.855424531123102,"error":0.0000011583093595390892}]
```

Romberg ∫|x|: 8 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":1,"value":6.792054985473226,"error":23.063370703959237},{"iteration":2,"n":2,"value":37.08290799041396,"error":7.227482300981496},{"iteration":3,"n":4,"value":29.75053286879579,"error":0.10489282063667105},{"iteration":4,"n":8,"value":29.839254461117218,"error":0.01617122831524398},{"iteration":5,"n":16,"value":29.85474593619353,"error":0.0006797532389306582},{"iteration":6,"n":32,"value":29.855445042369556,"error":0.000019352937094652134},{"iteration":7,"n":64,"value":29.855425616691853,"error":7.274060820350314e-8},{"iteration":8,"n":128,"value":29.855425689489245,"error":5.6783022728268406e-11}]
```

Trapecio ∫x²: 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":19,"value":38.51534095385408,"error":0.007221774218372445},{"iteration":2,"n":38,"value":38.50997142987541,"error":0.0018522502397004814},{"iteration":3,"n":75,"value":38.508597710265406,"error":0.0004785306296994918}]
```

Simpson ∫x²: 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":20,"value":38.5084548401809,"error":0.00033566054519695854},{"iteration":2,"n":38,"value":38.508181588549164,"error":0.00006240891345754562},{"iteration":3,"n":76,"value":38.50812315927946,"error":0.000003979643750540163}]
```

Romberg ∫x²: 9 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":1,"value":3.0754673950461133,"error":35.432651784589595},{"iteration":2,"n":2,"value":61.642909662806694,"error":23.13479048317099},{"iteration":3,"n":4,"value":34.741924239025664,"error":3.766194940610042},{"iteration":4,"n":8,"value":38.584534339877536,"error":0.07641516024182948},{"iteration":6,"n":32,"value":38.50849802232119,"error":0.000378842685485381},{"iteration":7,"n":64,"value":38.50811073811603,"error":0.000008441519675272957},{"iteration":8,"n":128,"value":38.508119210001446,"error":3.0365740144588926e-8},{"iteration":9,"n":256,"value":38.50811917961241,"error":2.3298696305573685e-11}]
```

### Conclusión numérica

La trayectoria se valida con la solución analítica: error máximo RK2 = 0.10761 m y RK4 = 0.00034411 m. Las tablas refinan h; cada integral usa una referencia adaptativa independiente con sus unidades. El máximo muestreado añade error de localización del pico.

### Conclusión del problema

El máximo de desplazamiento de referencia muestreado en 30 s es 1.9054 m. La fuerza constante desplaza el equilibrio a 1.0000 m. El caso mal condicionado estudia la identificación de parámetros, manteniendo la misma dinámica normal.

## Oscilaciones por viento Mal condicionado

Entradas: {"m":500,"c":50,"k":200,"F":100,"x0":0,"v0":0,"tolerance":0.000001,"h":0.4,"scenario":"mal"}

Referencia: Solución analítica e integración adaptativa independiente. Valores: {"kind":"Solución analítica e integración adaptativa independiente","xMax":0.8897333177419291,"integrals":[{"name":"Romberg ∫|x|","value":14.89153070565694,"unit":"m·s"},{"name":"Romberg ∫x²","value":8.609621946334693,"unit":"m²·s"}]}

| Método | Valor | Unidad | Error absoluto | Error relativo | Estado |
|---|---|---|---|---|---|
| RK2 (ampl. máx.) | 0.888809 | m | 9.246e-4 | 0.00103918 | Calculado / criterio satisfecho |
| RK4 (ampl. máx.) | 0.887113 | m | 0.00262029 | 0.00294503 | Calculado / criterio satisfecho |
| Trapecio ∫|x| | 14.8916 | m·s | 6.055e-5 | 4.066e-6 | Calculado / criterio satisfecho |
| Simpson ∫|x| | 14.8915 | m·s | 1.882e-6 | 1.264e-7 | Calculado / criterio satisfecho |
| Romberg ∫|x| | 14.8915 | m·s | 1.612e-10 | 1.083e-11 | Calculado / criterio satisfecho |
| Trapecio ∫x² | 8.60967 | m²·s | 4.752e-5 | 5.519e-6 | Calculado / criterio satisfecho |
| Simpson ∫x² | 8.60962 | m²·s | 6.936e-7 | 8.056e-8 | Calculado / criterio satisfecho |
| Romberg ∫x² | 8.60962 | m²·s | 2.381e-11 | 2.766e-12 | Calculado / criterio satisfecho |

### Sensibilidad

Identificación [c, k] a partir de F−m·x″ = c·v + k·x. Filas [v, x] sintéticas; casi dependientes en MAL. κ∞ mide sensibilidad del problema inverso, no inestabilidad física. Perturbación 0.0001; cambio 14.142135620088338; amplificación absoluta 141421.35620088337.

### Iteraciones y refinamiento

RK2 (ampl. máx.): 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"h":0.4,"error":0.024951247537125854},{"iteration":2,"h":0.2,"error":0.006206177267126967},{"iteration":3,"h":0.1,"error":0.0015510702697241197}]
```

RK4 (ampl. máx.): 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"h":0.4,"error":0.0000800833113141497},{"iteration":2,"h":0.2,"error":0.000004988943249850664},{"iteration":3,"h":0.1,"error":3.1102123732029696e-7}]
```

Trapecio ∫|x|: 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":19,"value":14.892357069110899,"error":0.0008263634539584785},{"iteration":2,"n":38,"value":14.891760981453595,"error":0.00023027579665502174},{"iteration":3,"n":75,"value":14.891591256825684,"error":0.00006055116874392752}]
```

Simpson ∫|x|: 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":20,"value":14.892018431618544,"error":0.0004877259616034024},{"iteration":2,"n":38,"value":14.891562285567828,"error":0.0000315799108872028},{"iteration":3,"n":76,"value":14.891532588012092,"error":0.0000018823551517499482}]
```

Romberg ∫|x|: 8 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":1,"value":5.821443957192862,"error":9.070086748464078},{"iteration":2,"n":2,"value":16.67379460783585,"error":1.782263902178908},{"iteration":3,"n":4,"value":14.697100957388576,"error":0.19442974826836412},{"iteration":4,"n":8,"value":15.003036462546408,"error":0.11150575688946773},{"iteration":5,"n":16,"value":14.88437804229439,"error":0.007152663362550271},{"iteration":6,"n":32,"value":14.89161956008712,"error":0.00008885443017980776},{"iteration":7,"n":64,"value":14.891530458529854,"error":2.471270867943076e-7},{"iteration":8,"n":128,"value":14.891530705818148,"error":1.6120793588925153e-10}]
```

Trapecio ∫x²: 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":19,"value":8.610439538498467,"error":0.0008175921637736394},{"iteration":2,"n":38,"value":8.609809121914004,"error":0.00018717557931147155},{"iteration":3,"n":75,"value":8.60966946615611,"error":0.00004751982141648625}]
```

Simpson ∫x²: 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":20,"value":8.608159773062688,"error":0.0014621732720048186},{"iteration":2,"n":38,"value":8.609598983052516,"error":0.000022963282177101974},{"iteration":3,"n":76,"value":8.609621252736213,"error":6.935984799838479e-7}]
```

Romberg ∫x²: 9 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"n":1,"value":2.2592806497824864,"error":6.350341296552207},{"iteration":2,"n":2,"value":11.606619573182131,"error":2.9969976268474383},{"iteration":3,"n":4,"value":8.038978262057691,"error":0.5706436842770017},{"iteration":4,"n":8,"value":8.730150276106274,"error":0.1205283297715809},{"iteration":6,"n":32,"value":8.610638759700366,"error":0.0010168133656733858},{"iteration":7,"n":64,"value":8.60960936799541,"error":0.000012578339282143247},{"iteration":8,"n":128,"value":8.609621982089593,"error":3.575489948559607e-8},{"iteration":9,"n":256,"value":8.609621946310883,"error":2.3810287075320957e-11}]
```

### Conclusión numérica

La trayectoria se valida con la solución analítica: error máximo RK2 = 0.024951 m y RK4 = 0.000080083 m. Las tablas refinan h; cada integral usa una referencia adaptativa independiente con sus unidades. El máximo muestreado añade error de localización del pico.

### Conclusión del problema

El máximo de desplazamiento de referencia muestreado en 30 s es 0.88973 m. La fuerza constante desplaza el equilibrio a 0.50000 m. El caso mal condicionado estudia la identificación de parámetros, manteniendo la misma dinámica normal.

## Reconstrucción de sensores Normal

Entradas: {"funcion":"sin","nNodos":7,"a":0,"b":6.283185307179586,"ruido":0,"puntosOcultar":2,"umbral":0.5,"tolerance":0.000001,"scenario":"normal"}

Referencia: Señal analítica conocida; observaciones ocultas retiradas antes de interpolar. Valores: {"kind":"Señal analítica conocida; observaciones ocultas retiradas antes de interpolar","signal":"sin","withheld":[{"t":2.0943951023931953,"value":0.8660254037844387},{"t":4.1887902047863905,"value":-0.8660254037844385}],"trainingNodes":[0,1.0471975511965976,3.141592653589793,5.235987755982989,6.283185307179586]}

| Método | Valor | Unidad | Error absoluto | Error relativo | Estado |
|---|---|---|---|---|---|
| Lagrange | 0.173205 | señal | 0.173205 | 0.2 | Calculado / criterio satisfecho |
| Newton (dif. divididas) | 0.173205 | señal | 0.173205 | 0.2 | Calculado / criterio satisfecho |
| Spline cúbico | 0.108253 | señal | 0.108253 | 0.125 | Calculado / criterio satisfecho |

### Sensibilidad

Cambio máximo del interpolante de Lagrange en una malla de 121 puntos al aumentar únicamente la primera lectura de entrenamiento en 10⁻⁸. No se perturban los datos ocultos. Perturbación 1e-8; cambio 1e-8; amplificación absoluta 1.

### Iteraciones y refinamiento

Lagrange: 2 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"t":2.0943951023931953,"value":0.6928203230275511,"reference":0.8660254037844387,"error":0.17320508075688756},{"iteration":2,"t":4.1887902047863905,"value":-0.6928203230275507,"reference":-0.8660254037844385,"error":0.17320508075688779}]
```

Newton (dif. divididas): 2 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"t":2.0943951023931953,"value":0.692820323027551,"reference":0.8660254037844387,"error":0.17320508075688767},{"iteration":2,"t":4.1887902047863905,"value":-0.6928203230275509,"reference":-0.8660254037844385,"error":0.17320508075688756}]
```

Spline cúbico: 2 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"t":2.0943951023931953,"value":0.7577722283113839,"reference":0.8660254037844387,"error":0.1082531754730548},{"iteration":2,"t":4.1887902047863905,"value":-0.7577722283113836,"reference":-0.8660254037844385,"error":0.10825317547305491}]
```

### Conclusión numérica

Newton y Lagrange representan el mismo polinomio para los mismos datos; sus discrepancias numéricas deben observarse en nodos agrupados. El menor MAE oculto de esta ejecución es 0.10825 (Spline cúbico). El spline natural conserva continuidad de primera y segunda derivadas. El error relativo se calcula como ||predicción−verdad||₂ / ||verdad||₂ en datos ocultos.

### Conclusión del problema

Se reconstruyen 2 observaciones retiradas, usando 5 lecturas disponibles. El ruido y la distribución de observaciones afectan la precisión. El error en nodos de entrenamiento no sustituye la validación en datos ausentes.

## Reconstrucción de sensores Estrés

Entradas: {"funcion":"sin","nNodos":7,"a":0,"b":6.283185307179586,"ruido":0.08,"puntosOcultar":3,"umbral":0.5,"tolerance":0.000001,"scenario":"estres"}

Referencia: Señal analítica conocida; observaciones ocultas retiradas antes de interpolar. Valores: {"kind":"Señal analítica conocida; observaciones ocultas retiradas antes de interpolar","signal":"sin","withheld":[{"t":2.0943951023931953,"value":0.8660254037844387},{"t":3.141592653589793,"value":1.2246467991473532e-16},{"t":5.235987755982989,"value":-0.8660254037844386}],"trainingNodes":[0,1.0471975511965976,4.1887902047863905,6.283185307179586]}

| Método | Valor | Unidad | Error absoluto | Error relativo | Estado |
|---|---|---|---|---|---|
| Lagrange | 0.190295 | señal | 0.190295 | 0.270285 | Calculado / criterio satisfecho |
| Newton (dif. divididas) | 0.190295 | señal | 0.190295 | 0.270285 | Calculado / criterio satisfecho |
| Spline cúbico | 0.203176 | señal | 0.203176 | 0.295031 | Calculado / criterio satisfecho |

### Sensibilidad

Cambio máximo del interpolante de Lagrange en una malla de 121 puntos al aumentar únicamente la primera lectura de entrenamiento en 10⁻⁸. No se perturban los datos ocultos. Perturbación 1e-8; cambio 9.999999994736442e-9; amplificación absoluta 0.9999999994736442.

### Iteraciones y refinamiento

Lagrange: 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"t":2.0943951023931953,"value":0.6560546115973389,"reference":0.8660254037844387,"error":0.2099707921870998},{"iteration":2,"t":3.141592653589793,"value":-0.16695996763152107,"reference":1.2246467991473532e-16,"error":0.16695996763152118},{"iteration":3,"t":5.235987755982989,"value":-1.0599785170091285,"reference":-0.8660254037844386,"error":0.1939531132246899}]
```

Newton (dif. divididas): 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"t":2.0943951023931953,"value":0.6560546115973389,"reference":0.8660254037844387,"error":0.2099707921870998},{"iteration":2,"t":3.141592653589793,"value":-0.1669599676315212,"reference":1.2246467991473532e-16,"error":0.16695996763152132},{"iteration":3,"t":5.235987755982989,"value":-1.0599785170091283,"reference":-0.8660254037844386,"error":0.19395311322468967}]
```

Spline cúbico: 3 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"t":2.0943951023931953,"value":0.6613927797858448,"reference":0.8660254037844387,"error":0.20463262399859394},{"iteration":2,"t":3.141592653589793,"value":-0.26041445476379377,"reference":1.2246467991473532e-16,"error":0.2604144547637939},{"iteration":3,"t":5.235987755982989,"value":-0.7215442046455984,"reference":-0.8660254037844386,"error":0.14448119913884017}]
```

### Conclusión numérica

Newton y Lagrange representan el mismo polinomio para los mismos datos; sus discrepancias numéricas deben observarse en nodos agrupados. El menor MAE oculto de esta ejecución es 0.19029 (Newton (dif. divididas)). El spline natural conserva continuidad de primera y segunda derivadas. El error relativo se calcula como ||predicción−verdad||₂ / ||verdad||₂ en datos ocultos.

### Conclusión del problema

Se reconstruyen 3 observaciones retiradas, usando 4 lecturas disponibles. El ruido y la distribución de observaciones afectan la precisión. El error en nodos de entrenamiento no sustituye la validación en datos ausentes.

## Reconstrucción de sensores Mal condicionado

Entradas: {"funcion":"sin","nNodos":9,"a":0,"b":6.283185307179586,"ruido":0,"puntosOcultar":2,"umbral":0.5,"tolerance":0.000001,"scenario":"mal"}

Referencia: Señal analítica conocida; observaciones ocultas retiradas antes de interpolar. Valores: {"kind":"Señal analítica conocida; observaciones ocultas retiradas antes de interpolar","signal":"sin","withheld":[{"t":0.04659466643202635,"value":0.04657780826988894},{"t":0.5992112452678285,"value":0.563991310449007}],"trainingNodes":[0,0.00019174759848570515,0.006135923151542565,0.19634954084936207,1.4910293258248433,3.2227018877492464,6.283185307179586]}

| Método | Valor | Unidad | Error absoluto | Error relativo | Estado |
|---|---|---|---|---|---|
| Lagrange | 1.283e-5 | señal | 1.283e-5 | 4.531e-5 | Calculado / criterio satisfecho |
| Newton (dif. divididas) | 1.283e-5 | señal | 1.283e-5 | 4.531e-5 | Calculado / criterio satisfecho |
| Spline cúbico | 0.00229086 | señal | 0.00229086 | 0.00806808 | Calculado / criterio satisfecho |

### Sensibilidad

Cambio máximo del interpolante de Lagrange en una malla de 121 puntos al aumentar únicamente la primera lectura de entrenamiento en 10⁻⁸. No se perturban los datos ocultos. Perturbación 1e-8; cambio 1.642949079381651; amplificación absoluta 164294907.9381651.

### Iteraciones y refinamiento

Lagrange: 2 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"t":0.04659466643202635,"value":0.046577820728900356,"reference":0.04657780826988894,"error":1.2459011412835341e-8},{"iteration":2,"t":0.5992112452678285,"value":0.5639656715482805,"reference":0.563991310449007,"error":0.00002563890072648789}]
```

Newton (dif. divididas): 2 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"t":0.04659466643202635,"value":0.04657782072890041,"reference":0.04657780826988894,"error":1.2459011468346493e-8},{"iteration":2,"t":0.5992112452678285,"value":0.5639656715482814,"reference":0.563991310449007,"error":0.00002563890072559971}]
```

Spline cúbico: 2 registros. Muestra (primeros y últimos, si supera 8):

```json
[{"iteration":1,"t":0.04659466643202635,"value":0.04656187778657828,"reference":0.04657780826988894,"error":0.00001593048331065966},{"iteration":2,"t":0.5992112452678285,"value":0.5685571005869736,"reference":0.563991310449007,"error":0.004565790137966652}]
```

### Conclusión numérica

Newton y Lagrange representan el mismo polinomio para los mismos datos; sus discrepancias numéricas deben observarse en nodos agrupados. El menor MAE oculto de esta ejecución es 0.000012826 (Newton (dif. divididas)). El spline natural conserva continuidad de primera y segunda derivadas. El error relativo se calcula como ||predicción−verdad||₂ / ||verdad||₂ en datos ocultos.

### Conclusión del problema

Se reconstruyen 2 observaciones retiradas, usando 7 lecturas disponibles. El ruido y la distribución de observaciones afectan la precisión. El error en nodos de entrenamiento no sustituye la validación en datos ausentes.

## Conclusión integradora

La confiabilidad depende de un modelo coherente, una referencia independiente y una métrica con unidades correctas. La convergencia del algoritmo no garantiza precisión de los parámetros ni validez física. El estrés cambia la exigencia del fenómeno; el mal condicionamiento amplifica incertidumbres del problema matemático. Los cuatro casos permiten evaluar estas diferencias sin inferir fallas reales de Mi Teleférico.

## DER y persistencia

usuario 1:N simulacion; caso_estudio 1:N escenario; escenario 1:N simulacion; simulacion 1:N ejecucion_metodo; ejecucion_metodo 1:N iteracion_resultado y 1:1 resultado_resumen. JSON se representa con objetos en IndexedDB y jsonb en el esquema SQL instalado. El usuario local es un participante de ensayo, independiente de Supabase Auth. Los tiempos por método no medidos se guardan nulos.

La persistencia normalizada local usa IndexedDB y la nube usa las siete entidades del DER en Supabase. La migración del 25 de noviembre de 2026 conservó 18 experimentos, 86 ejecuciones y 8326 iteraciones sin cambios en los originales. Las pruebas SQL reales pasaron en los doce escenarios: recuperación exacta, reintentos sin duplicados, atomicidad e aislamiento entre dos usuarios y anon. Los datos de prueba se revirtieron. La prueba de cerrar y reabrir una sesión desde navegador sigue pendiente; SQL con roles/JWT no sustituye ese ensayo. Entrega de semana 3 autorizada para la rama main de GitHub. Video y ensayo de defensa pendientes.

## Defensa y video

Cada integrante debe modificar un parámetro, ejecutar, recuperar un experimento anterior e interpretar método y resultado aplicado. Guion de video: 0:00 contexto; 0:20 cuatro casos; 1:20 comparación y sensibilidad; 2:00 persistencia; 2:35 conclusiones; finalizar antes de 3:00.

## Referencias

Sauer, Numerical Analysis, 3.ª ed., 2018. Burden, Faires y Burden, Numerical Analysis, 10.ª ed., 2016. Consigna SIMTELE-RISK semana 3 proporcionada por el equipo. Código: https://github.com/iTzManix/teleferico.
