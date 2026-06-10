// Разбор атрибуционных cookies (partner, utm) в структуру для профиля
export function resolveAttribution(input: { partner: string | null; utm: string | null }) {
  let utm: Record<string, string> | null = null;
  if (input.utm) {
    try { utm = JSON.parse(input.utm); } catch { utm = null; }
  }
  return { partnerId: input.partner, utm };
}
