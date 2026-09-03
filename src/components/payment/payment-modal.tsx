'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Accent } from '@/components/accent';
import {
  Tariff,
  getTariffsForCourse,
  getCoursePaymentConfig,
  getDefaultTariff,
  parseTestRub,
} from '@/lib/payments/tariffs';
import { clientAuth } from '@/lib/firebase/client';
import { track } from '@/lib/analytics/track-client';
import { EVENTS } from '@/lib/analytics/events';
import { useVibePriceTimer } from '@/lib/payments/vibe-timer-client';
import { Clock } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseSlug?: string;
  courseTitle?: string;
  defaultTariffId?: string;
}

export function PaymentModal({
  isOpen,
  onClose,
  courseSlug,
  courseTitle,
  defaultTariffId,
}: PaymentModalProps) {
  // Тестовая цена в рублях из ?test_rub=N (null — обычный режим)
  const [testRub, setTestRub] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('test_rub');
      const fromQuery = parseTestRub(q);
      if (fromQuery) {
        document.cookie = `test_rub=${fromQuery}; path=/; max-age=86400; SameSite=Lax`;
        localStorage.setItem('test_rub', String(fromQuery));
        setTestRub(fromQuery);
      } else if (q === '0') {
        document.cookie = 'test_rub=; path=/; max-age=0;';
        localStorage.removeItem('test_rub');
        setTestRub(null);
      } else {
        const fromCookie = document.cookie.match(/(?:^|;\s*)test_rub=(\d+)/)?.[1];
        setTestRub(parseTestRub(fromCookie) ?? parseTestRub(localStorage.getItem('test_rub')));
      }
    }
  }, []);

  const vibeTimer = useVibePriceTimer();
  const courseConfig = getCoursePaymentConfig(courseSlug);
  const tariffs = getTariffsForCourse(courseSlug, {
    isVibeTimerExpired: vibeTimer.isExpired,
    testRub,
  });

  const getTariffPrice = (t: Tariff) => {
    if (testRub) return testRub;
    if (t.id === 'vibecoding_stream' && vibeTimer.mounted) {
      return vibeTimer.currentPrice;
    }
    return t.price;
  };

  const displayTitle = courseConfig?.courseTitle || courseTitle || 'Доступ ко всем курсам';
  const modalTitle = courseSlug === 'claude-code-agents' ? 'Claude Code с нуля' : displayTitle;

  const [selectedTariff, setSelectedTariff] = useState<Tariff>(() => {
    if (defaultTariffId) {
      const found = tariffs.find((t) => t.id === defaultTariffId);
      if (found) return found;
    }
    return getDefaultTariff(courseSlug, {
      isVibeTimerExpired: vibeTimer.isExpired,
      testRub,
    });
  });
  const [email, setEmail] = useState('');
  const [telegram, setTelegram] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [isOpen]);

  // Re-sync tariffs and selectedTariff when modal opens or courseSlug changes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setLoading(false);

      if (defaultTariffId) {
        const found = tariffs.find((t) => t.id === defaultTariffId);
        if (found) {
          setSelectedTariff(found);
        } else {
          setSelectedTariff(getDefaultTariff(courseSlug, { isVibeTimerExpired: vibeTimer.isExpired, testRub }));
        }
      } else {
        setSelectedTariff(getDefaultTariff(courseSlug, { isVibeTimerExpired: vibeTimer.isExpired, testRub }));
      }

      // Pre-fill email and telegram
      const userEmail = clientAuth.currentUser?.email;
      if (userEmail) {
        setEmail(userEmail);
      } else {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('gelato_user_email') : '';
        if (saved) setEmail(saved);
      }
      const savedTg = typeof window !== 'undefined' ? localStorage.getItem('gelato_user_tg') : '';
      if (savedTg) setTelegram(savedTg);
    }
  }, [isOpen, courseSlug, defaultTariffId, tariffs, testRub, vibeTimer.isExpired]);

  if (!isOpen) return null;

  const specialOffer = selectedTariff.specialOffer;
  const reservedSpecialOffer = specialOffer ?? tariffs.find((tariff) => tariff.specialOffer)?.specialOffer;

  const handleStartPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Пожалуйста, введите корректный адрес электронной почты');
      return;
    }

    const cleanTg = telegram.trim();
    if (selectedTariff.hasSupport && !cleanTg) {
      setError('Для тарифа с поддержкой укажите ваш Telegram (@username) для связи и добавления в закрытый чат');
      return;
    }

    if (!agreed) {
      setError('Необходимо согласие с условиями');
      return;
    }

    try {
      setLoading(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('gelato_user_email', cleanEmail);
        if (cleanTg) localStorage.setItem('gelato_user_tg', cleanTg);
      }

      const effectivePrice = testRub
        ? testRub
        : selectedTariff.id === 'vibecoding_stream' && vibeTimer.mounted
          ? vibeTimer.currentPrice
          : selectedTariff.price;

      track(EVENTS.subscribeClicked, {
        tariffId: selectedTariff.id,
        price: effectivePrice,
        email: cleanEmail,
        telegram: cleanTg || undefined,
        courseSlug,
        courseTitle: displayTitle,
      });

      const res = await fetch('/api/payments/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tariffId: selectedTariff.id,
          email: cleanEmail,
          telegram: cleanTg || null,
          courseTitle: displayTitle,
          courseSlug,
          testRub,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка при создании платежа');
      }

      if (!data.paymentUrl) {
        throw new Error('Банк не вернул ссылку для оплаты');
      }
      window.location.assign(data.paymentUrl);
    } catch (err: any) {
      console.error('Payment initialization error:', err);
      setError(err?.message || 'Не удалось инициализировать оплату. Попробуйте снова');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-brand-navy/60 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        className="relative my-auto flex max-h-[92vh] w-full max-w-lg animate-rise flex-col overflow-hidden rounded-2xl border-2 border-brand-navy/20 bg-brand-cream text-brand-charcoal shadow-xl transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-5 px-5 pt-5 pb-2 sm:px-6 sm:pt-6">
          <div className="min-w-0">
            <p className="font-heading text-xl font-extrabold tracking-tight text-brand-navy sm:text-2xl">
              {courseSlug === 'claude-code-agents' ? (
                <>Claude Code <Accent color="var(--color-brand-red)" stroke="double">с нуля</Accent></>
              ) : modalTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-rotate-2 cursor-pointer pt-0.5 font-marker text-base leading-none text-brand-charcoal/50 underline decoration-brand-charcoal/30 underline-offset-4 transition-all hover:rotate-0 hover:text-brand-charcoal/75"
            aria-label="Закрыть"
          >
            закрыть
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <form onSubmit={handleStartPayment} className="space-y-5">
              {/* Tariffs List */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-navy/60">Выберите формат</p>
                <div className="grid grid-cols-1 gap-2">
                  {tariffs.map((t) => {
                    const isSelected = selectedTariff.id === t.id;
                    const isVibeStream = t.id === 'vibecoding_stream';
                    const displayPrice = getTariffPrice(t);
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => setSelectedTariff(t)}
                        className={`relative flex cursor-pointer flex-col rounded-xl border-2 px-4 py-3 text-left transition-all duration-150 ${
                          isSelected
                            ? 'border-brand-navy bg-brand-yellow/45'
                            : 'border-brand-navy/15 bg-white/50 hover:border-brand-navy/40'
                        }`}
                        aria-pressed={isSelected}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="font-heading font-extrabold text-base text-brand-navy">
                              {t.title}
                            </span>
                            {t.popular && (
                              <span className="text-[11px] font-bold text-brand-red">
                                Выбор большинства
                              </span>
                            )}
                            {isVibeStream && vibeTimer.mounted && (
                              !vibeTimer.isExpired ? (
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-brand-red bg-brand-red/10 border border-brand-red/25 px-1.5 py-0.5 rounded">
                                  <Clock className="size-3" aria-hidden />
                                  <span>{vibeTimer.formattedTime}</span>
                                </span>
                              ) : (
                                <span className="text-[11px] font-bold text-brand-charcoal/50">
                                  Спеццена истекла
                                </span>
                              )
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-heading font-bold text-lg text-brand-navy">
                              {displayPrice.toLocaleString('ru-RU')} ₽
                            </span>
                            {t.oldPrice && (
                              <span className="text-xs text-muted-foreground line-through ml-1.5">
                                {t.oldPrice.toLocaleString('ru-RU')} ₽
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="mt-1 text-xs text-brand-charcoal/65">
                          {t.description}
                        </p>

                        <div
                          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
                            isSelected ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                          }`}
                          aria-hidden={!isSelected}
                        >
                          <div className="min-h-0 overflow-hidden">
                            <ul className="mt-2.5 space-y-1 border-t border-brand-navy/10 pt-2.5 text-xs text-brand-charcoal/85">
                              {t.features.map((f, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="font-bold text-brand-green" aria-hidden>✓</span>
                                  <span>{f}</span>
                                </li>
                              ))}
                              {t.excludedFeatures?.map((feature) => (
                                <li key={feature} className="flex items-start gap-2 font-bold text-brand-red">
                                  <span aria-hidden>×</span>
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Email Input */}
              <div className="space-y-1">
                <label
                  htmlFor="payment-email"
                  className="block text-xs font-bold uppercase tracking-wider text-brand-navy/60"
                >
                  Email для доступа
                </label>
                <input
                  id="payment-email"
                  type="email"
                  required
                  placeholder="example@mail.ru"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full rounded-lg border-2 border-brand-navy/20 bg-white/70 px-3 text-base font-medium text-brand-navy outline-none placeholder:text-brand-navy/30 focus:border-brand-navy"
                />
                <p className="text-[11px] text-brand-charcoal/60">
                  Сюда придут доступ и данные для входа
                </p>
              </div>

              {/* Telegram Input */}
              <div className="space-y-1">
                <label
                  htmlFor="payment-telegram"
                  className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-brand-navy/60"
                >
                  <span>Telegram для связи</span>
                  {selectedTariff.hasSupport ? (
                    <span className="font-extrabold text-brand-red lowercase text-[11px]">обязательно для поддержки</span>
                  ) : (
                    <span className="text-[11px] text-brand-charcoal/50 font-normal lowercase">необязательно</span>
                  )}
                </label>
                <input
                  id="payment-telegram"
                  type="text"
                  required={Boolean(selectedTariff.hasSupport)}
                  placeholder="@username или телефон"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  className="h-11 w-full rounded-lg border-2 border-brand-navy/20 bg-white/70 px-3 text-base font-medium text-brand-navy outline-none placeholder:text-brand-navy/30 focus:border-brand-navy"
                />
                <p className="text-[11px] text-brand-charcoal/60">
                  {selectedTariff.hasSupport
                    ? 'Напишем вам в Telegram перед стартом и добавим в закрытый чат'
                    : 'Можно указать для оперативной связи'}
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-lg border border-brand-red/30 bg-brand-red/10 px-3 py-2 text-sm font-medium text-brand-red">
                  {error}
                </div>
              )}

              {reservedSpecialOffer && (
                <div
                  className={`-rotate-[0.45deg] border-2 border-dashed border-brand-navy bg-brand-yellow px-2.5 py-1.5 text-left shadow-[3px_3px_0_0_var(--color-brand-red)] transition-opacity duration-200 ${
                    specialOffer ? 'opacity-100' : 'pointer-events-none opacity-0'
                  }`}
                  aria-hidden={!specialOffer}
                >
                  <p className="text-xs leading-tight text-brand-navy">
                    <span className="mr-2 font-marker text-base leading-none text-brand-red drop-shadow-[1px_1px_0_var(--color-brand-cream)]">
                      {reservedSpecialOffer.label}
                    </span>
                    <span className="font-extrabold">{reservedSpecialOffer.title}</span>
                  </p>
                </div>
              )}

              {/* Terms Checkbox */}
              <label className="flex cursor-pointer items-start gap-2 text-left text-[11px] text-brand-charcoal/65">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(event) => setAgreed(event.target.checked)}
                  className="mt-0.5 accent-brand-navy"
                />
                <span className="leading-snug">
                  Я согласен с условиями оферты и обработкой персональных данных
                </span>
              </label>

              {/* Submit / Pay Button */}
              <button
                type="submit"
                disabled={loading || !email}
                className="group relative flex h-13 w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-brand-navy font-heading text-base font-extrabold text-brand-cream transition-colors hover:bg-brand-navy/90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {loading ? (
                  <span className="animate-pulse">Готовим оплату…</span>
                ) : (
                  <>
                    <Image
                      src="/payments/sbp.webp"
                      alt="СБП"
                      width={32}
                      height={20}
                      className="h-6 w-auto object-contain"
                    />
                    <span>Перейти к оплате {getTariffPrice(selectedTariff).toLocaleString('ru-RU')} ₽</span>
                    <span className="text-lg leading-none transition-transform group-hover:translate-x-1" aria-hidden>→</span>
                  </>
                )}
              </button>

              {/* Logos banner */}
              <div className="flex items-center justify-center gap-3 pt-1 grayscale opacity-60">
                <Image src="/payments/sbp.webp" alt="СБП" width={24} height={14} className="h-3.5 w-auto" />
                <Image src="/payments/mir.svg" alt="МИР" width={28} height={14} className="h-3 w-auto" />
                <Image src="/payments/tpay.svg" alt="Т-Банк" width={24} height={14} className="h-3.5 w-auto" />
                <Image src="/payments/SberPay.webp" alt="SberPay" width={28} height={14} className="h-3 w-auto" />
              </div>
          </form>
        </div>
      </div>
    </div>
  );
}
