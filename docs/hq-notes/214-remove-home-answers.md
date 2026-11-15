# #214: убраны ответы Q1–Q3 с обеих главных

Решение Эмиля: на главных блок ответов из #164 не нужен (на gelateria он заслонял витрину).

- Убран `<BeginnerQuestions>` из `src/app/gelateria/page.tsx` и `src/app/(app)/(home)/page.tsx`,
  вместе с обёрткой, чтением каталога на gelateria и импортами. JSON-LD для этих ответов на главной #164 не добавлял.
- Компонент `beginner-questions.tsx` оставлен: его использует лендинг claude-code-agents.
- Лендинг, home_offer и agents_landing_blocks не тронуты.

Правка теста `tests/beginner-questions.test.tsx`:
- для control/offer/classic проверка «блок виден в начале страницы» заменена на «блока нет» (красная на старом main);
- проверки для лендинга агентов (agents-control, core) прежние; из тех, что шли по главным, убраны порядок относительно сцены/about,
  ссылка из каталога для главных и равенство control/offer.
