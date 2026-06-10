// Hungarian locale strings — centralised for future i18n extraction

export const MONTHS = [
  "január",
  "február",
  "március",
  "április",
  "május",
  "június",
  "július",
  "augusztus",
  "szeptember",
  "október",
  "november",
  "december",
] as const;

export const DAY_NAMES = [
  "Vasárnap",
  "Hétfő",
  "Kedd",
  "Szerda",
  "Csütörtök",
  "Péntek",
  "Szombat",
] as const;

export function formatDateHu(date: Date): string {
  return `${date.getFullYear()}. ${MONTHS[date.getMonth()]} ${date.getDate()}.`;
}

export function formatAmount(amount: number | string, currency = "RON"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `${num.toLocaleString("hu-HU")} ${currency}`;
}
