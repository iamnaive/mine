# 🚀 Инструкция по деплою Crypto Mine Game на Vercel

## ✅ Подготовка проекта

Проект уже готов к деплою! Все файлы проверены и работают корректно.

## 🔧 Настройка Vercel

### 1. Создание проекта на Vercel

1. Зайди на [vercel.com](https://vercel.com)
2. Войди в аккаунт или зарегистрируйся
3. Нажми "New Project"
4. Подключи GitHub репозиторий или загрузи файлы

### 2. Настройка Environment Variables

В настройках проекта Vercel (Settings → Environment Variables) добавь:

```
VITE_WALLETCONNECT_PROJECT_ID=твой_project_id_здесь
POSTGRES_URL=postgresql://username:password@host:port/database
```

#### Получение WalletConnect Project ID:
1. Зайди на [cloud.walletconnect.com](https://cloud.walletconnect.com/)
2. Создай новый проект
3. Скопируй Project ID

#### Настройка PostgreSQL:
1. В Vercel Dashboard → Storage → Create Database → Postgres
2. Или используй [Neon](https://neon.tech/) (бесплатно)
3. Скопируй connection string

### 3. Настройка Build Settings

Vercel автоматически определит настройки из `package.json`:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## 🎮 Настройка Monad Testnet

### Для пользователей:

1. **Добавь Monad Testnet в кошелек:**
   - Network Name: `Monad Testnet`
   - RPC URL: `https://testnet-rpc.monad.xyz`
   - Chain ID: `10143`
   - Currency Symbol: `MON`
   - Block Explorer: `http://testnet.monadexplorer.com`

2. **Получи тестовые токены:**
   - Зайди на [Monad Testnet Faucet](https://testnet.monad.xyz/)
   - Подключи кошелек
   - Запроси тестовые MON токены

## 🚀 Деплой

### Автоматический деплой (рекомендуется):
1. Подключи GitHub репозиторий к Vercel
2. При каждом push в main ветку будет автоматический деплой

### Ручной деплой:
```bash
npm install -g vercel
vercel --prod
```

## 📱 Тестирование

После деплоя проверь:

1. **Подключение кошелька** - должен работать только с Monad Testnet
2. **Смена сети** - кнопка "Switch to Monad Testnet" должна работать
3. **Игра** - должна запускаться и работать корректно
4. **API** - проверь endpoints:
   - `GET /api/players` - получить данные игрока
   - `POST /api/players` - обновить данные игрока
   - `GET /api/leaderboard` - получить таблицу лидеров

## 🔍 Возможные проблемы

### Ошибка "Wrong Network":
- Убедись, что кошелек подключен к Monad Testnet (Chain ID: 10143)
- Используй кнопку "Switch to Monad Testnet"

### Ошибка подключения к базе данных:
- Проверь `POSTGRES_URL` в Environment Variables
- Убедись, что база данных активна

### Ошибка WalletConnect:
- Проверь `VITE_WALLETCONNECT_PROJECT_ID` в Environment Variables
- Убедись, что Project ID корректный

## 📊 Мониторинг

В Vercel Dashboard можно отслеживать:
- Логи деплоя
- Производительность
- Ошибки в реальном времени
- Использование базы данных

## 🎯 Готово!

Твой Crypto Mine Game теперь работает на Monad Testnet с полной интеграцией кошельков и базой данных!

---

**Поддержка**: Если возникли проблемы, проверь логи в Vercel Dashboard или создай issue в репозитории.
