// Solo los parámetros del modelo disparan el cálculo. El control de tiempo
// de la animación y los campos de la cuenta se manejan por separado.
export function bindSimulationInputs(ids, calculate) {
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
