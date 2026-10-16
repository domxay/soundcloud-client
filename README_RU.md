<div align="center">

# SoundCloud Desktop Client

[![SoundCloud](https://img.shields.io/badge/SoundCloud-FF5500?style=for-the-badge&logo=soundcloud&logoColor=white)](https://soundcloud.com)
[![Electron](https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org)
[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Author](https://img.shields.io/badge/Автор-domxay-ff0055?style=for-the-badge)](https://t.me/codesand)
[![Telegram](https://img.shields.io/badge/Telegram-@codesand-229ED9?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/codesand)

[English](README.md) | [Русский](README_RU.md)

Премиальный, сверхбыстрый и стильный десктопный клиент для SoundCloud. Разработан в современном безрамочном дизайне с 11 эстетичными темами, поддержкой живых анимированных фонов (GIF и видео), синхронизированным караоке-текстом, интерактивными комментариями на звуковой волне и бесплатным скачиванием музыки.

</div>

---

## Основные возможности

- **Современный безрамочный интерфейс (Frameless)**: Чистый вид без стандартных оконных рамок Windows с кастомными кнопками управления и плавным перетаскиванием за шапку.
- **Аутентичный раздел Home (Главная)**:
  - Большой Spotlight-баннер с главным трендом дня и быстрым запуском
  - Чарты SoundCloud Top 50 Global с нумерацией треков и статистикой прослушиваний
  - Подборки авторских плейлистов и миксов (Phonk, Cyberpunk, Lo-Fi, Club)
  - Фильтрация трендов по жанрам (Phonk, Electronic, Hip-Hop, Synthwave, Rock, Lo-Fi)
- **11 дизайнерских тем оформления**:
  - **Tokyo Red (Красный Токио)** — глубокий обсидиановый фон и неоновый алый акцент
  - **Tokyo Blood Moon (Кровавая Луна)** — тёмно-бордовый нуар
  - **Cyberpunk 2077 (Найт-Сити)** — яркий неоновый жёлтый на тёмно-сером фоне
  - **SoundCloud Classic (Оригинал)** — фирменный оранжевый стиль SoundCloud
  - **Synthwave 80s (Майами Неон)** — ретровейв закат в фиолетово-розовых тонах
  - **Matrix Emerald (Терминал Матрицы)** — хакерский зелёный фосфор
  - **Nordic Frost (Северный Лёд)** — ледяной полярный циан
  - **Sakura Night (Токийская Сакура)** — пастельные лепестки ночной сакуры
  - **Catppuccin Mocha (Каппучино)** — мягкая трендовая тёмная тема
  - **Dracula Vampire (Дракула)** — классическая готическая палитра
  - **OLED Pure Black (Чистый Чёрный)** — абсолютный глубокий чёрный контраст
- **Студия живого фона (Custom Live Background)**:
  - Установка любого анимированного GIF, MP4 / WebM видео или статичного фото
  - Нативная кнопка выбора файла с компьютера через проводник Windows
  - Возможность вставки прямой ссылки на медиафайл
  - Плавная регулировка затемнения (10% - 95%) и размытия (0px - 30px) для идеальной читаемости
- **Синхронизированные караоке-тексты песен (LRCLIB)**:
  - Автоматическая подгрузка текстов из открытой базы LRCLIB
  - Плавная автопрокрутка к активной строчке в такт музыке
  - Клик по любой строчке песни мгновенно перематывает трек к этой секунде
- **Живая звуковая волна (Dual-Tone Waveform) с метками комментариев**:
  - Реалистичная звуковая волна с верхним пиком (72%) и нижним отражением (28%)
  - Аватарки комментаторов на таймлайне звуковой волны в точный момент их комментария
  - Всплывающая подсказка с текстом комментария при наведении и перемотка при клике
- **Реальные комментарии в реальном времени**:
  - Отправка комментария с привязкой к текущей секунде воспроизведения
  - Чипы быстрых реакций для мгновенного ответа
  - Отображение бейджа автора domxay и времени комментария
- **Моментальная синхронизация лайков**:
  - Глобальный кэш треков синхронизирует статус лайка на всех экранах (Home, Stream, Library, Playlists, Profile)
  - Раздел рекомендаций для быстрого добавления любимых треков в коллекцию
- **Бесплатный загрузчик треков и плейлистов**:
  - Диалог выбора папки или сохранения файла через нативное окно Windows
  - Сборка и скачивание потоков fMP4 / MP3 в высоком качестве напрямую на диск
  - Возможность скачивать отдельные треки или целые плейлисты

---

## Стек технологий

- **Платформа**: Electron 44, Node.js
- **Фронтенд**: React 18, TypeScript, Vite
- **Стилизация**: Tailwind CSS, CSS Custom Variables
- **Аудиодвижок**: HLS.js, HTML5 Audio, Web Audio API
- **База текстов**: LRCLIB Open API
- **Иконки**: Lucide React

---

## Быстрый старт

### Требования
- Установленный Node.js 18+ на компьютере.

### Установка

```bash
git clone https://github.com/domxay/soundcloud-client.git
cd soundcloud-client
npm install
```

### Режим разработки

```bash
npm run dev
```

### Сборка и запуск приложения

```bash
npm run build
npm start
```

---

## Горячие клавиши и управление

| Действие | Управление |
| --- | --- |
| Воспроизведение / Пауза | Пробел / Центральная кнопка плеера |
| Следующий трек | Кнопка «Вперёд» / Автоматически по завершении песни |
| Предыдущий трек | Кнопка «Назад» |
| Перемотка трека | Клик в любую точку звуковой волны Waveform |
| Перемотка к комментарию | Клик по бейджу времени или аватарке на волне |
| Перемотка по тексту песни | Клик по любой строчке в окне Lyrics |
| Поиск музыки | Ввод запроса в шапке и клавиша Enter |

---

## Автор и сообщество

- **Автор**: domxay
- **Telegram канал**: [@codesand](https://t.me/codesand)

---

## Хештеги

`#soundcloud` `#music-player` `#electron` `#react` `#typescript` `#desktop-app` `#lrclib` `#lyrics` `#tokyo-red` `#cyberpunk` `#downloader` `#audiophile`
