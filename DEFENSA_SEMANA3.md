# Revisión de presentación de semana 3

Esta lista distingue evidencia disponible y comprobaciones que debe completar el equipo. Los cambios permanecen locales hasta revisar el resultado.

## Ejecutar localmente

1. En esta carpeta, ejecutar `npm test` y `npm run evidence`.
2. Ejecutar `npm start` en una terminal abierta.
3. Abrir http://127.0.0.1:8000/validacion.html. Si el puerto está ocupado por este mismo proyecto, reutilizar el servidor existente.
4. Verificar las doce celdas de cobertura. Abrir cada caso y escenario; revisar entradas, referencia, estado, errores, tablas, gráficos y las dos conclusiones.
5. Visitar cada simulador desde la comparación, cambiar un parámetro y ejecutar. Comprobar que el valor mostrado y las conclusiones se actualicen.
6. En un ancho de móvil, comprobar navegación, filtros y desplazamiento horizontal de tablas. Verificar tema claro y oscuro.

## Referencias útiles para interpretar

| Caso | Resultado o lección |
| --- | --- |
| Detención normal | v0 = 10 m/s, tr = 1 s, a = 2 m/s²: 6 s y 35 m; reacción aporta 10 m. |
| Detención estrés | v0 = 15 m/s, tr = 1,5 s, a = 1,5 m/s²: 11,5 s y 97,5 m. |
| Deterioro normal | [D0, α, β, s] = [10, 2, 0,5, 3]; umbral de 60 en 8,198 meses. |
| Deterioro estrés | [15, 4, 1, 3]; umbral de 60 en 5 meses. |
| Deterioro MAL | Misma curva normal, observaciones más próximas: κ₂(A) ≈ 6,14 × 10⁷; residuo pequeño puede coexistir con error apreciable. |
| Viento | Referencia analítica; refinar h reduce el error de trayectoria. Cada integral se compara con una integral de sus mismas unidades. |
| Sensores | Los puntos ausentes se retiran del entrenamiento. Newton y Lagrange representan el mismo polinomio; el spline natural responde a otra construcción. |

No afirmar que un algoritmo falló físicamente porque diverge, que un error cero prueba reconstrucción de datos nuevos, ni que el modelo predice una falla real. En MAL de detención y viento abrir también el subexperimento de identificación.

## Comprobar persistencia local

- Guardar un experimento con parámetros modificados. Anotar su identificador, entradas y resultado.
- Cerrar la pestaña y volver a abrir la aplicación usando el mismo navegador, perfil y origen (127.0.0.1 y localhost son orígenes distintos).
- Pulsar Recuperar historial, abrir el registro y comprobar parámetros, versión y número de resultados originales.
- Repetir y confirmar valores idénticos; revisar diferencias si cambió la versión del modelo.
- Abrir Ver entidades guardadas y comprobar simulación, ejecuciones, iteraciones y resultados resumidos.
- Anotar fecha, participante, ID y resultado de esta prueba. Estado actual: **pendiente de verificación real en navegador**.

## Comprobar persistencia Supabase

- Iniciar sesión con una cuenta existente del equipo; guardar y anotar el registro.
- Cerrar sesión y la pestaña, volver a entrar y recuperar el registro desde el historial del caso correcto.
- Repetir con sus parámetros. Con otra cuenta, verificar que no se pueden consultar registros ajenos.
- Supabase ya tiene el DER y conserva la tabla anterior por compatibilidad. La suite SQL real pasó para los doce escenarios, reintentos, recuperación, atomicidad e aislamiento entre usuarios. Evidencia en `evidencia/verificacion-supabase.json`.
- Estado actual: **base de datos comprobada; ciclo de sesión real en navegador pendiente**. Las pruebas SQL con roles/JWT no sustituyen ese ensayo.

## Informe y entrega

- `npm run evidence` genera informe HTML imprimible, informe Markdown y JSON con todas las ejecuciones.
- Abrir `informe_Semana_3.html` y usar Imprimir o guardar PDF. Revisar saltos, tablas y gráficos antes de entregar.
- El informe incluye dos conclusiones por caso y escenario, más la integradora. No copiar conclusiones antiguas de S2 después de corregir los algoritmos.
- Si se entrega Word en lugar de PDF, conservar referencias, tablas, unidades y conclusiones sin transcribir cifras manualmente.
- Confirmar nombres, formato exigido por el docente y enlace final de GitHub Pages.

## Video de menos de tres minutos

| Tiempo | Evidencia |
| --- | --- |
| 0:00–0:20 | Problema, alcance y modelos sintéticos. |
| 0:20–1:20 | Un resultado verificado de cada caso. |
| 1:20–2:00 | Comparación, refinamiento y diferencia entre estrés y mal condicionamiento. |
| 2:00–2:35 | Guardar, cerrar o recargar, recuperar y repetir. |
| 2:35–2:55 | Conclusión integradora y limitaciones. |

## Ensayo presencial

Cada integrante debe completar la secuencia entera, aunque exponga principalmente un caso:

1. Explicar qué representa un parámetro y su unidad.
2. Cambiarlo, anticipar el efecto y ejecutar.
3. Comparar el resultado con la referencia y comentar el error.
4. Recuperar un experimento anterior e identificar su versión.
5. Dar una conclusión sobre el método y otra sobre el problema aplicado.

Preguntas para ensayar: ¿por qué Jacobi diverge?, ¿por qué residuo y error no son lo mismo?, ¿cómo se obtiene la referencia?, ¿por qué RK2 y RK4 casi coinciden en frenado uniforme?, ¿qué observaciones fueron retiradas en sensores?, ¿qué cambia en MAL sin cambiar el fenómeno físico?, ¿qué prueba demuestra persistencia realmente?

Al recuperar en nube, Ver guardado muestra los valores originales sin recalcular. Repetir entradas recalcula con el modelo actual e indica explícitamente si cambió la versión.
