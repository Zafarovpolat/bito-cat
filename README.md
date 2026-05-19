# Bito + Supabase Photo Toolkit

Полный набор инструментов для загрузки фото товаров в Bito ERP и Supabase.

## Быстрый старт

```bash
cp .env.example .env   # заполни ключи
npm install
```

## Команды

| Команда | Что делает |
|---------|-----------|
| `npm run square` | Приводит все PNG в `edited/` к квадрату 1:1 |
| `npm run bito` | Загружает все фото на Bito (обложка товара) |
| `npm run supabase` | Обновляет ссылки на фото в Supabase |
| `npm run sync` | Всё сразу: square → bito → supabase |

## Структура папок

```
edited/          ← PNG файлы с именем {SKU}-{name}-{N}.png
lib/
  bito.mjs       ← Bito API: upload, updateProduct, getProducts
  supabase.mjs   ← Supabase: updateImage, createProduct
scripts/
  make-square.py ← добавляет белые поля для 1:1
  upload-bito.mjs
  update-supabase.mjs
```

## Формат имён файлов

```
{SKU}-{название}-{номер}.png
Пример: 6502-B-19-blue-1.png
         ^    ^         ^
         SKU  имя       номер фото (1=главное)
```

## Переменные окружения (.env)

```
BITO_API_KEY=dekor-house:...    ← из Bito → Настройки → Интеграции
BITO_JWT=Bearer eyJ...          ← из браузера DevTools (истекает через 30 дней)
BITO_ORG_ID=6701170d...         ← ID организации в Bito
BITO_PRICE_ID=6706187e...       ← ID прайса в Bito
SUPABASE_DSN=postgresql://...   ← строка подключения к БД
GITHUB_BASE=https://zafarovpolat.github.io/bito-cat/edited
```

## Обновление JWT токена Bito

JWT истекает через 30 дней. Чтобы получить новый:
1. Открой https://dekor-house.bito.uz в браузере
2. DevTools → Network → любой запрос → Headers → Authorization
3. Скопируй значение в .env как BITO_JWT

## Для ИИ-агентов

Все API функции инкапсулированы в `lib/`. Чтобы загрузить фото:

```js
import { uploadFile, updateProduct, getProductBySku } from './lib/bito.mjs';
import { updateProductImage } from './lib/supabase.mjs';

const product = await getProductBySku('6502');
const imagePath = await uploadFile('./edited/6502-B-19-blue-1.png');
await updateProduct(product, imagePath);
await updateProductImage('6502', 'https://...github.io/.../6502-B-19-blue-1.png');
```
