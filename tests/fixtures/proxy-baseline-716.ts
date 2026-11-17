// Ответ прежнего proxy (main 49e9b65, src/proxy.ts без trackCrawlerVisit) на фиксированный запрос
// https://gelato.education/llms.txt с cookie `vid=fixedvisitor0001`. Снят запуском прежнего proxy
// на чистой main (#716); тест git не читает. Результат не зависит от user-agent.
export const BASELINE_COOKIE = 'vid=fixedvisitor0001';
export const BASELINE_STATUS = 200;
export const BASELINE_HEADERS = (ua: string): [string, string][] => [
  ['x-middleware-next', '1'],
  ['x-middleware-override-headers', 'cookie,user-agent'],
  ['x-middleware-request-cookie', BASELINE_COOKIE],
  ['x-middleware-request-user-agent', ua],
];
// Тот же путь без cookie: свежий vid (randomUUID замокан), Expires вырезается из set-cookie.
export const BASELINE_UUID = '00000000-0000-4000-8000-000000000000';
export const BASELINE_NEW_VID_SET_COOKIE = `vid=${BASELINE_UUID}; Path=/; Max-Age=31536000; SameSite=lax`;
export const BASELINE_NEW_VID_HEADERS = (ua: string): [string, string][] => [
  ['set-cookie', BASELINE_NEW_VID_SET_COOKIE],
  ['x-middleware-next', '1'],
  ['x-middleware-override-headers', 'cookie,user-agent'],
  ['x-middleware-request-cookie', `vid=${BASELINE_UUID}`],
  ['x-middleware-request-user-agent', ua],
  ['x-middleware-set-cookie', BASELINE_NEW_VID_SET_COOKIE],
];
