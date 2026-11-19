import type { BlogPost } from '@/lib/blog';

export const CLAUDE_AGE_POST: BlogPost = {
  slug: 'kak-claude-proveryaet-vozrast',
  title: 'Как Claude проверяет возраст?',
  lead: 'При регистрации вы подтверждаете совершеннолетие. При признаках несовершеннолетнего пользователя Anthropic предлагает отдельную проверку через Yoti.',
  seoTitle: 'Как Claude проверяет возраст: селфи и документы — GELATO',
  seoDescription: 'Простой ответ по официальной справке Anthropic: когда Claude просит проверить возраст, чем оценка по селфи отличается от проверки документа и что делать при ошибке в мобильном приложении.',
  published: '2026-11-19',
  updated: '2026-11-19',
  topic: 'Claude',
  body: `При создании аккаунта Claude вы подтверждаете, что вам 18 лет или больше. Если системы Anthropic замечают признаки того, что пользователь может быть младше, аккаунт могут отключить и предложить отдельную проверку возраста через Yoti по ссылке из письма. Можно выбрать оценку возраста по селфи, проверку документа или подтверждение через приложение Yoti. Селфи используется для оценки возраста, документ — для проверки.

## Когда Claude просит проверить возраст?

По [официальной справке Anthropic](https://support.claude.com/en/articles/15171100-age-assurance-on-claude), при регистрации нужно подтвердить, что вам уже исполнилось 18 лет. Отдельная проверка появляется, когда системы замечают признаки несовершеннолетнего пользователя. В этой справке не перечислены сами признаки, поэтому по ней нельзя сказать, как именно Claude определяет возраст конкретного человека.

## Как проходит отдельная проверка?

Anthropic указывает, что ссылку на Yoti присылают в письме об ограничении аккаунта. Yoti — сторонний сервис проверки возраста. В справке перечислены варианты:

- **Оценка по селфи.** Вы делаете селфи, технология Yoti оценивает возраст. Для этого варианта документ не нужен.
- **Проверка документа.** Вы загружаете фотографию удостоверения личности, например паспорта. Поддерживаемые документы зависят от страны; справка отсылает к списку Yoti.
- **Yoti Digital ID.** Если приложение Yoti у вас уже есть, можно передать из него подтверждённый признак «старше 18».

Оценка возраста по внешности и проверка документа — разные способы. Справка разрешает выбрать подходящий вариант; она не говорит, что всем обязательно нужен паспорт. После успешной проверки аккаунт восстанавливают.

Anthropic также пишет, что не получает документ или фотографию: компания получает только результат «пройдено / не пройдено».

## Что делать, если возраст неверно определён в мобильном приложении?

Это отдельный случай. Если сообщение об ограничении связано с возрастом из App Store или Play Store, [справка Anthropic для мобильного приложения](https://support.claude.com/en/articles/13117299-minimum-age-requirement-access-restriction) советует обратиться в поддержку Apple или Google Play. Anthropic не имеет доступа к данным вашего аккаунта магазина и не может их исправить. Это сообщение не следует путать с письмом о проверке через Yoti.

## Официальные источники и дословные фрагменты

Сверено **19 ноября 2026 года**. Ниже цитаты на языке первоисточника, подтверждающие правила и способы проверки.

**[Anthropic: Age assurance on Claude](https://support.claude.com/en/articles/15171100-age-assurance-on-claude)** — подтверждение возраста при регистрации и повод для отдельной проверки:

> You’ll need to confirm you’re 18 or over while setting up an account. When we detect signals that you may be under 18, we'll ask you to verify your age before you can continue using Claude.

Ссылка из письма и восстановление аккаунта:

> A link for verification will be provided in the notification email. If you pass the age verification process, your account will be reinstated.

Оценка по селфи и проверка документа:

> Facial age estimation: Take a selfie and Yoti's technology estimates your age. No ID document needed.

> ID verification: Take a photo of your ID (such as a passport, driving license, or national ID card) and upload it from your device. See Yoti's full list of supported documents for country-specific options.

Подтверждение через приложение Yoti:

> Yoti’s Digital ID app: If you already have the Yoti app, share a verified "over 18" attribute from it.

Какие данные получает Anthropic:

> Anthropic never sees your ID or image; we receive only a pass/fail result and do not process or store any personal data from the verification.

**[Anthropic: Minimum age requirement access restriction](https://support.claude.com/en/articles/13117299-minimum-age-requirement-access-restriction)** — отдельное ограничение в мобильном приложении:

> If you're seeing this message, it means the app store on your device (App Store or Play Store) has identified you as under 18 based on your account information.

> Anthropic does not have access to your app store account information and cannot change it.`,
  faq: [
    {
      question: 'С какого возраста можно пользоваться Claude?',
      answer: 'По справке Anthropic, при создании аккаунта нужно подтвердить, что вам 18 лет или больше. Если системы замечают признаки несовершеннолетнего пользователя, потребуется отдельная проверка возраста.',
    },
    {
      question: 'Для проверки возраста обязательно нужен паспорт?',
      answer: 'Справка Anthropic перечисляет оценку возраста по селфи без документа, проверку документа и Yoti Digital ID. Оценка по селфи определяет возраст по внешности; проверка документа использует фотографию удостоверения личности.',
    },
    {
      question: 'Anthropic увидит моё селфи или документ?',
      answer: 'По официальной справке, Anthropic не получает ваше удостоверение личности или изображение. Проверку проводит Yoti, а Anthropic получает только результат «пройдено / не пройдено».',
    },
    {
      question: 'Что делать, если в мобильном приложении указан неверный возраст?',
      answer: 'Если ограничение связано с возрастом из App Store или Play Store, Anthropic советует обратиться в поддержку Apple или Google Play. Компания не имеет доступа к данным вашего аккаунта магазина и не может изменить их.',
    },
  ],
  lessonPath: null,
  cover: '/blog/ii-agent-prostymi-slovami.webp',
};
