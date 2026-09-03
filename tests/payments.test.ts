import { describe, expect, it } from 'vitest';
import { generateTBankToken } from '../src/lib/payments/token';
import {
  TARIFFS,
  getTariffById,
  getDefaultTariff,
  getTariffsForCourse,
  getCoursePaymentConfig,
  parseTestRub,
} from '../src/lib/payments/tariffs';

describe('T-Bank Token Generation', () => {
  it('generates deterministic SHA256 signature based on sorted keys', () => {
    const params = {
      TerminalKey: '1747506700234',
      Amount: 199000,
      OrderId: '123456',
      Description: 'Подписка 1 месяц',
    };
    const password = 'test_password';

    const token = generateTBankToken(params, password);
    expect(typeof token).toBe('string');
    expect(token.length).toBe(64); // SHA-256 is 64 hex chars

    // Calling again with same params produces identical token
    const token2 = generateTBankToken(params, password);
    expect(token2).toBe(token);
  });

  it('signs all primitive notification fields and ignores Token and nested objects', () => {
    const notification = {
      TerminalKey: 'terminal',
      PaymentId: '42',
      Status: 'CONFIRMED',
      Success: true,
      ErrorCode: '0',
      Token: 'incoming-token',
      DATA: { ignored: true },
    };
    const token = generateTBankToken(notification, 'password');
    const withoutIgnoredFields = generateTBankToken({
      TerminalKey: 'terminal',
      PaymentId: '42',
      Status: 'CONFIRMED',
      Success: true,
      ErrorCode: '0',
    }, 'password');
    expect(token).toBe(withoutIgnoredFields);
    expect(generateTBankToken({ ...notification, Status: 'REJECTED' }, 'password')).not.toBe(token);
  });
});

describe('Tariffs configuration', () => {
  it('contains expected plans with prices and periodDays', () => {
    expect(TARIFFS.length).toBeGreaterThanOrEqual(3);
    const month = getTariffById('month');
    expect(month).toBeDefined();
    expect(month?.periodDays).toBe(30);
    expect(month?.price).toBe(1990);

    const defaultTariff = getDefaultTariff();
    expect(defaultTariff).toBeDefined();
    expect(defaultTariff.popular).toBe(true);
  });

  it('supports course-specific tariffs and configurations', () => {
    const vibeTariffs = getTariffsForCourse('it-vibecoding');
    expect(vibeTariffs.length).toBe(2);
    expect(vibeTariffs[0].id).toBe('vibecoding_month');
    expect(vibeTariffs[0].price).toBe(7900);

    const vibeConfig = getCoursePaymentConfig('it-vibecoding');
    expect(vibeConfig?.courseTitle).toContain('ИИ для вайбкодеров');

    const cartoonsTariffs = getTariffsForCourse('ai-cartoons');
    expect(cartoonsTariffs.length).toBe(3);
    expect(cartoonsTariffs[0].id).toBe('cartoons_month');

    // Finding tariff by ID with or without courseSlug
    const found = getTariffById('vibecoding_stream');
    expect(found?.price).toBe(19900);
    expect(getTariffById('cartoons_month', 'vibecoding')).toBeUndefined();

    const agentsTariffs = getTariffsForCourse('claude-code-agents');
    expect(agentsTariffs.map((tariff) => tariff.price)).toEqual([7990, 15990, 27990]);
    expect(agentsTariffs[0].specialOffer).toBeUndefined();
    expect(agentsTariffs[0].excludedFeatures).toContain('Поддержка не входит');
    expect(agentsTariffs[1].specialOffer?.title).toContain('Claude Pro');
    expect(agentsTariffs[2].specialOffer?.title).toContain('Claude Pro');
    expect(agentsTariffs.every((tariff) =>
      tariff.features.every((feature) => !feature.includes('Claude Pro'))
    )).toBe(true);
  });

  it('меняет цену тарифа с поддержкой вайбкодинга после истечения 24-часового таймера', () => {
    const promoTariff = getTariffById('vibecoding_stream', 'it-vibecoding');
    expect(promoTariff?.price).toBe(19900);
    expect(promoTariff?.features).toContain('Старт потока 14 сентября');

    const expiredTariff = getTariffById('vibecoding_stream', 'it-vibecoding', { isVibeTimerExpired: true });
    expect(expiredTariff?.price).toBe(24900);

    const expiredList = getTariffsForCourse('it-vibecoding', { isVibeTimerExpired: true });
    expect(expiredList.find((t) => t.id === 'vibecoding_stream')?.price).toBe(24900);
  });
});

describe('Vibe Price Timer utilities', () => {
  it('форматирует время таймера в HH:MM:SS', async () => {
    const { formatVibeTimer, checkIsVibeTimerExpired } = await import('../src/lib/payments/vibe-timer');
    expect(formatVibeTimer(0)).toBe('00:00:00');
    expect(formatVibeTimer(1000)).toBe('00:00:01');
    expect(formatVibeTimer(65000)).toBe('00:01:05');
    expect(formatVibeTimer(3665000)).toBe('01:01:05');
    expect(formatVibeTimer(24 * 3600 * 1000)).toBe('24:00:00');

    expect(checkIsVibeTimerExpired(Date.now() - 1000)).toBe(true);
    expect(checkIsVibeTimerExpired(Date.now() + 10000)).toBe(false);
  });
});

describe('Tariff Support and Enrollment logic', () => {
  it('корректно размечает тарифы с личной поддержкой и самостоятельные', () => {
    const stream = getTariffById('vibecoding_stream', 'it-vibecoding');
    expect(stream?.hasSupport).toBe(true);
    expect(stream?.startDate).toBe('14 сентября');

    const selfPaced = getTariffById('vibecoding_month', 'it-vibecoding');
    expect(selfPaced?.hasSupport).toBe(false);

    const defaultPlans = getTariffsForCourse();
    expect(defaultPlans.every((p) => !p.hasSupport)).toBe(true);
  });

  it('генерирует читаемый и безопасный пароль для новых пользователей', async () => {
    const { generateRandomPassword } = await import('../src/lib/payments/password');
    const pwd1 = generateRandomPassword();
    const pwd2 = generateRandomPassword();
    expect(pwd1.startsWith('g-')).toBe(true);
    expect(pwd1.length).toBe(8);
    expect(pwd1).not.toBe(pwd2);
  });
});

describe('parseTestRub', () => {
  it('принимает целые рубли от 1 до 100', () => {
    expect(parseTestRub('1')).toBe(1);
    expect(parseTestRub('10')).toBe(10);
    expect(parseTestRub('100')).toBe(100);
  });

  it('отклоняет ноль, мусор и суммы вне диапазона', () => {
    expect(parseTestRub('0')).toBeNull();
    expect(parseTestRub('101')).toBeNull();
    expect(parseTestRub('1.5')).toBeNull();
    expect(parseTestRub('abc')).toBeNull();
    expect(parseTestRub(null)).toBeNull();
  });

  it('подставляет тестовую сумму в цену тарифов', () => {
    const list = getTariffsForCourse('vibecoding', { testRub: 10 });
    expect(list.every((t) => t.price === 10)).toBe(true);
  });
});
