export function previewWarnConversion(activeWarns: number, warnsPerStrike: number) {
  return { willGenerateStrike: activeWarns + 1 >= warnsPerStrike };
}

export function validateFineInput(input: { fineAmount: number; appliesToWeek: string }) {
  if (!Number.isInteger(input.fineAmount) || input.fineAmount <= 0) throw new Error("El monto de la multa debe ser positivo.");
  const date = new Date(`${input.appliesToWeek}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.appliesToWeek) || Number.isNaN(date.getTime()) || date.getUTCDay() !== 1) throw new Error("La semana de bono debe iniciar en lunes.");
  return input;
}
