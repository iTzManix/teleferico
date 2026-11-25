# SIMTELE-RISK

Laboratorio académico de métodos numéricos inspirado en el transporte por cable de La Paz y El Alto. Datos, umbrales y escenarios sintéticos; no diagnostica equipos reales.

## Revisión local de semana 3

Esta versión se prepara para revisión local antes de actualizar GitHub Pages.

```sh
npm test
npm run evidence
npm start
```

Puedes abrir `validacion.html` directamente desde el explorador: los paquetes clásicos de `assets/` permiten ejecutar cálculos sin un servidor. También puedes abrir http://127.0.0.1:8000/validacion.html. Node.js ejecuta los tests; Python 3 sirve la aplicación. Los cálculos y el historial local no requieren paquetes npm ni conexión externa. Supabase y las fuentes de las páginas originales sí requieren Internet. Cada simulador incluye un ejemplo inicial, una vista explicativa con control de tiempo y un botón para restaurar sus entradas.

## Qué incluye

- Cuatro módulos y tres escenarios por módulo, con entradas centralizadas en `experiments.js`.
- Pestaña `validacion.html`: matriz 3 × 4, valores de referencia, comparación, tablas completas de iteraciones/refinamiento, gráficos, sensibilidad y dos conclusiones diferenciadas por caso.
- Conclusión integradora, exportación JSON/CSV e informe imprimible.
- Historial local normalizado con IndexedDB: guardar, recargar, recuperar los resultados originales y repetir entradas con versión identificada.
- Esquema SQL del DER propuesto para revisar en un entorno de pruebas.

## Modelos y correcciones

| Caso | Modelo y validación |
| --- | --- |
| Detención | Reacción a velocidad constante + frenado uniforme hasta velocidad cero. Referencias analíticas por magnitud; se maneja v0 = 0. |
| Deterioro | D = D0 + αt + βt²; sesgo calibrado independientemente. LU, Jacobi, Gauss-Seidel y gradiente conjugado comparados con calibración directa. |
| Viento | Oscilador lineal con fuerza constante. Solución analítica en los tres regímenes de amortiguamiento; cuadraturas comparadas con Simpson adaptativo independiente. |
| Sensores | Lagrange, Newton corregido y spline natural corregido. Los datos ocultos se retiran del entrenamiento. Error relativo de norma 2 sobre los valores verdaderos ocultos. |

En MAL de deterioro se conserva la curva normal y se acorta la ventana de observaciones. En detención y viento se conserva la dinámica normal y se estudia por separado una identificación de parámetros con observaciones casi dependientes. En sensores se agrupan los nodos hacia el inicio y se mide amplificación de perturbaciones. El estrés físico y el mal condicionamiento no se confunden.

Jacobi diverge en las matrices escogidas: se muestra el desbordamiento. Un residuo pequeño no asegura parámetros precisos en MAL. La comparación incluye errores y referencias; las normas de parámetros de unidades distintas deben interpretarse por coeficiente. En viento, el máximo de referencia está muestreado con paso 0,005 s y no es el extremo continuo exacto.

## Archivos y evidencia

| Archivo | Función |
| --- | --- |
| `math.js` | Calibración de deterioro, sistemas lineales y exportaciones públicas. |
| `numerics.js` | Raíces, interpolación, cuadratura, EDO y modelos corregidos. |
| `experiments.js` | Fuente común de los doce experimentos, referencias, sensibilidad y conclusiones. |
| `validacion.html`, `validacion.js`, `validacion.css` | Comparación para semana 3 y ensayo de defensa. |
| `history-store.js` | Siete entidades del DER con transacciones locales atómicas. |
| `schema_der.sql` | Esquema PostgreSQL/Supabase propuesto, pendiente de aplicar y verificar. |
| `informe_Semana_3.html` | Informe completo imprimible desde navegador, con tablas y gráficos. |
| `informe_Semana_3.md` | Informe y metodología reproducibles. |
| `evidencia/experimentos-s3.json` | Entradas, salidas, referencias e historiales completos. |
| `DEFENSA_SEMANA3.md` | Lista de revisión local, video y ensayo presencial. |

`npm run build` regenera los paquetes de las cinco páginas a partir de las fuentes ES; ejecutar después de editar JavaScript. Los HTML cargan esos paquetes y conservan opciones estáticas en los filtros. `npm test` también los reconstruye y verifica su arranque.

`npm run evidence` regenera los tres archivos de evidencia con el mismo núcleo que la aplicación. No editar sus cifras manualmente. Los informes de semana 1 y 2 se conservan como antecedentes; los fallos y entradas de semana 2 no representan el estado corregido de semana 3.

## DER y persistencia

Se mantiene el DER propuesto: `usuario`, `caso_estudio`, `escenario`, `simulacion`, `ejecucion_metodo`, `iteracion_resultado`, `resultado_resumen`. En local, IndexedDB almacena las entidades en una transacción y conserva snapshots versionados. Un participante local permite ensayar sin autenticación; no representa una cuenta de Supabase.

Supabase ya utiliza las siete tablas del DER. La migración `20261125145755_simtele_der_normalizado_conserva_historial` se aplicó tras autorización expresa. Se importaron 18 simulaciones, 86 ejecuciones, 8326 iteraciones y 86 resultados resumidos sin alterar los registros originales. La tabla anterior se conserva para compatibilidad. La documentación y las comprobaciones están en `MIGRACION_SUPABASE.md` y `evidencia/verificacion-supabase.json`.

## Estado de validación

29 tests automatizados locales pasan. Además, la suite SQL real de Supabase obtuvo PASS en los doce escenarios: guardado y recuperación exacta, reintentos sin duplicados, reversión de fallos parciales y aislamiento entre dos usuarios y anon. Los datos de prueba se revirtieron; los originales y sus copias mantienen sus conteos y contenido.

El DOM en memoria comprueba lógica, no apariencia. La suite SQL usa contextos de rol/JWT y no equivale al ciclo de iniciar sesión, cerrar y recuperar desde navegador. Esa comprobación de interfaz sigue pendiente de ensayo.

Para completar la entrega: revisar visualmente en el equipo, comprobar los dos historiales por separado, exportar el informe a PDF (o preparar Word), grabar el video ≤ 3 min, ensayar a los cuatro integrantes y, tras revisar, publicar GitHub.

## Referencias y portada

Sauer, Numerical Analysis, 3.ª ed., 2018. Burden, Faires y Burden, Numerical Analysis, 10.ª ed., 2016. Consigna académica SIMTELE-RISK de semana 3.

Fotografía original: Línea Roja de Mi Teleférico en La Paz, EEJCC, CC BY-SA 4.0; atribución y enlace conservados en la portada.

## Historial de Supabase y revisión de migración

Los cuatro módulos usan `cloud-history.js`: guardar conserva la versión, Ver guardado recupera los valores originales sin recalcular y Repetir entradas compara con el modelo actual. Una versión diferente se indica explícitamente. Los reintentos usan una solicitud estable; los errores de permisos o conexión no provocan una segunda escritura alternativa.

La base conserva 18 registros anteriores, verificados mediante su huella de contenido. La migración copió 86 ejecuciones y 8326 iteraciones sin borrar el origen. Documentación y pruebas: `MIGRACION_SUPABASE.md`, `schema_der.sql` y `pruebas_supabase_der.sql`.
