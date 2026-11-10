# Activ QR — веб-версия

Веб-версия Flutter-приложения мерчанта ActivBank ([Kast69ro/app-prod](https://github.com/Kast69ro/app-prod)):
те же экраны, тексты, запросы к API и логика; дизайн перенесён из Flutter один в один
(цвета, отступы, шрифты Montserrat/Lato, светлая и тёмная темы).

Стек: React 19 + Vite 6 + Tailwind CSS 4, `react-router-dom`, `qrcode`, `pdf-lib` (+ `@pdf-lib/fontkit`), `@noble/hashes`.

## Запуск

```sh
npm install
npm run dev          # http://localhost:5173, запросы /pos проксируются на тестовый сервер
npm run build        # сборка в dist/
npm run preview      # проверить сборку локально (тоже с прокси)
```

Тестовый сервер `http://10.64.20.101:8888` — во внутренней сети банка (нужен VPN / Wi-Fi банка).
Другой адрес бэка для прокси: `API_PROXY_TARGET=http://host:port npm run dev`.

## Как устроены запросы

Бэк не отдаёт CORS-заголовки, поэтому браузер ходит на **свой же origin** (`/pos/...`),
а dev-сервер Vite (в проде — nginx) проксирует их на бэк. Если бэк когда-нибудь будет на
отдельном домене с CORS, задайте `VITE_API_BASE_URL` (см. `.env.example`).

Ручки, параметры и разбор ответов — те же, что во Flutter (`/pos/otp/request`, `/pos/otp/verify`,
`/pos/terminal`, `/pos/summary`, `/pos/history`), GET-запросы получают `?phone=+992…`
(см. `src/core/api/apiClient.js` — при переходе на токены меняется только он).

## Деплой (nginx)

```nginx
server {
    listen 443 ssl;
    server_name qr.example.tj;
    root /var/www/activ-qr-web/dist;

    location /pos/ {
        proxy_pass http://10.64.20.101:8888;
        proxy_set_header Host $host;
    }

    # SPA: все пути приложения отдают index.html
    location / {
        try_files $uri /index.html;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Структура

```
src/
  app/        App.jsx (роутинг по состоянию сессии), MainShell.jsx (вкладки), routes.js, env.js
  core/       api/ storage/ security/ pdf/ utils/ i18n/ widgets/
  features/   auth, pin, home, history, payment, receipt, settings
```

Соответствие Flutter: `*_repository.dart` → `*Repository.js`, контроллеры Riverpod → хуки
(`useLoginController`, `useHistory`, `SessionContext`), `l10n/app_ru.arb` → `core/i18n/ru.js`,
`app_colors.dart` → CSS-переменные в `src/index.css`.

## Отличия от мобильного приложения (ограничения браузера)

- **Хранилище.** Сессия, соль+хеш кода и счётчик попыток — в `localStorage` (аналога Keychain
  в браузере нет). Сам код не хранится: PBKDF2-HMAC-SHA256, 25 000 итераций, как во Flutter.
  5 неверных вводов стирают сессию. Тема — отдельно, при выходе не стирается.
- **Автоблокировка** — если вкладка была скрыта дольше 30 с; после перезагрузки страницы
  всегда спрашивается код.
- **«Поделиться чеком» / отчёт в PDF** — на телефоне открывается системное окно «Поделиться»
  (Web Share API), на компьютере файл скачивается.
- **Полноэкранный QR** — экран не гаснет (Screen Wake Lock API, где поддерживается);
  яркость браузер менять не умеет.
- **SMS-код** — автоподстановка через `autocomplete="one-time-code"` (iOS Safari);
  SMS User Consent API Android в вебе недоступен.
- **Календарь периода** — свой, в стиле Material 3 (во Flutter — системный).
- Сайт открывается по http (тестовый сервер), поэтому хеширование сделано на чистом JS,
  а не на WebCrypto (`crypto.subtle` доступен только на HTTPS). В проде — только HTTPS.
