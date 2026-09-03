import crypto from 'node:crypto';

export function generateTBankToken(params: Record<string, any>, password?: string): string {
  const pwd = password || process.env.T_TERMINAL_PASSWORD || '';
  const merged: Record<string, any> = { ...params, Password: pwd };
  const sortedKeys = Object.keys(merged)
    .filter((key) => {
      if (key === 'Token') return false;
      const value = merged[key];
      return value !== null && value !== undefined && typeof value !== 'object';
    })
    .sort();
  const concatenated = sortedKeys.map((k) => String(merged[k])).join('');
  return crypto.createHash('sha256').update(concatenated).digest('hex');
}
