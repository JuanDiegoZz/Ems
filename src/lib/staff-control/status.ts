export type StaffStatusLevel = "normal" | "attention" | "risk" | "critical";
export type StaffStatusInput = { activeStrikes: number; activeWarns: number; inactivityDays: number; weeklyGoalMet: boolean; warnsPerStrike: number; criticalStrikes: number; inactivityThreshold: number };
export type StaffStatusReason = { code: string; level: StaffStatusLevel; label: string };

const levelWeight: Record<StaffStatusLevel, number> = { normal: 0, attention: 1, risk: 2, critical: 3 };
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
const formatMinutes = (minutes: number) => minutes % 60 === 0 ? `${Math.floor(minutes / 60)}h` : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
const inactivityLevels = (threshold: number) => ({ attention: threshold, risk: threshold + 2, critical: threshold + 4 });

export function staffStatus(input: StaffStatusInput) {
  const reasons: StaffStatusReason[] = [];
  const inactivity = inactivityLevels(input.inactivityThreshold);
  if (input.activeStrikes >= input.criticalStrikes) reasons.push({ code: "critical-strikes", level: "critical", label: `Strikes ${input.activeStrikes}/${input.criticalStrikes} · Límite alcanzado` });
  else if (input.activeStrikes >= 2) reasons.push({ code: "risk-strikes", level: "risk", label: `Strikes ${input.activeStrikes}/${input.criticalStrikes}` });
  else if (input.activeStrikes === 1) reasons.push({ code: "attention-strike", level: "attention", label: `Strikes 1/${input.criticalStrikes}` });
  if (input.inactivityDays >= inactivity.critical) reasons.push({ code: "critical-inactivity", level: "critical", label: `Inactivo · ${input.inactivityDays} días` });
  else if (input.inactivityDays >= inactivity.risk) reasons.push({ code: "risk-inactivity", level: "risk", label: `Inactivo · ${input.inactivityDays} días` });
  else if (input.inactivityDays >= inactivity.attention) reasons.push({ code: "attention-inactivity", level: "attention", label: `Inactivo · ${input.inactivityDays} días` });
  if (!input.weeklyGoalMet) reasons.push({ code: "goal-missed", level: "attention", label: "No cumplió meta semanal" });
  if (input.warnsPerStrike > 1 && input.activeWarns >= input.warnsPerStrike - 1) reasons.push({ code: "warn-near-strike", level: "attention", label: "Próximo warn → Strike" });
  const level = reasons.reduce<StaffStatusLevel>((current, reason) => levelWeight[reason.level] > levelWeight[current] ? reason.level : current, "normal");
  return { level, label: level === "critical" ? "CRÍTICO" : level === "risk" ? "Riesgo" : level === "attention" ? "Atención" : "Normal", reviewLabel: level === "critical" ? "Revisión administrativa requerida" : undefined, reasons };
}

export function attentionPriority(input: StaffStatusInput) {
  const levels = inactivityLevels(input.inactivityThreshold);
  if (input.activeStrikes >= input.criticalStrikes) return 1;
  if (input.inactivityDays >= levels.critical) return 2;
  if (input.activeStrikes >= 2) return 3;
  if (!input.weeklyGoalMet) return 4;
  if (input.inactivityDays >= levels.attention) return 5;
  if (input.warnsPerStrike > 1 && input.activeWarns >= input.warnsPerStrike - 1) return 6;
  return 7;
}

export function compareStaffAttention(left: StaffStatusInput & { rpName: string; id: string }, right: StaffStatusInput & { rpName: string; id: string }) {
  return attentionPriority(left) - attentionPriority(right) || normalize(left.rpName).localeCompare(normalize(right.rpName)) || left.id.localeCompare(right.id);
}

export function inactivityLabel(days: number) { return days === 0 ? "Activo hoy" : `Inactivo · ${days} ${days === 1 ? "día" : "días"}`; }
export function warningProgress(activeWarns: number, warnsPerStrike: number) { return { label: `Warns ${activeWarns}/${warnsPerStrike}`, detail: warnsPerStrike > 1 && activeWarns >= warnsPerStrike - 1 ? "Próximo warn → Strike" : undefined }; }
export function strikeProgress(activeStrikes: number, criticalStrikes: number) { return { label: `Strikes ${activeStrikes}/${criticalStrikes}`, detail: activeStrikes >= criticalStrikes ? "Límite alcanzado" : undefined }; }
export function weeklyGoalLabel(currentMinutes: number, targetMinutes: number) { return `${formatMinutes(currentMinutes)} / ${formatMinutes(targetMinutes)} · ${currentMinutes >= targetMinutes ? "Meta semanal cumplida" : "No cumplió meta semanal"}`; }
