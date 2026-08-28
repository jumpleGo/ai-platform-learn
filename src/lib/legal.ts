// Реквизиты для юр. документов. Заполнить перед публикацией: пустые поля
// страницы не показывают, вместо них выводится приписка «запросить в личке».
export const LEGAL_ENTITY = {
  name: '',
  inn: '',
  ogrnip: '',
  address: '',
  email: '',
};

export const LEGAL_UPDATED = '26 августа 2026';

export type LegalEntityField = { label: string; value: string };

export function legalRequisites(): LegalEntityField[] {
  return [
    { label: 'Исполнитель', value: LEGAL_ENTITY.name },
    { label: 'ИНН', value: LEGAL_ENTITY.inn },
    { label: 'ОГРНИП', value: LEGAL_ENTITY.ogrnip },
    { label: 'Адрес', value: LEGAL_ENTITY.address },
    { label: 'Почта', value: LEGAL_ENTITY.email },
  ].filter((f) => f.value.trim().length > 0);
}
