# AGENT.md — Инструкция для ИИ-агента

> Читай этот файл ПЕРВЫМ делом перед любой работой с фото товаров.

---

## Что это за репо

`zafarovpolat/bito-cat` — инструментарий для работы с фото товаров магазина **Dekor House**.

Фото генерируются через GPT Image API (gpt-image-2), затем:
1. Хранятся в `edited/` и публикуются через **GitHub Pages**
2. Загружаются как обложка в **Bito ERP** (товароучётная система)
3. Ссылки на фото записываются в **Supabase** (PostgreSQL БД сайта)

---

## Структура репо

```
edited/          ← PNG файлы. Имя: {SKU}-{название}-{N}.png
                   Пример: 6502-B-19-blue-1.png
                   SKU = первые цифры до первого дефиса
                   N=1 — главное фото, N=2,3... — галерея

lib/
  config.mjs     ← читает .env, экспортирует config
  bito.mjs       ← Bito API: getProductBySku, uploadFile, updateProduct
  supabase.mjs   ← Supabase: findProductBySku, updateProductImage, createProductIfMissing

scripts/
  make-square.py    ← делает PNG квадратными (1:1, белые поля)
  upload-bito.mjs   ← загружает фото на Bito ERP
  update-supabase.mjs ← обновляет ссылки на фото в Supabase

.env             ← секреты (не в git). Файл уже создан на Mac пользователя.
.env.example     ← шаблон с описанием переменных
package.json     ← npm скрипты
```

---

## Переменные окружения (.env)

| Переменная | Описание | Истекает |
|------------|----------|----------|
| `BITO_API_KEY` | Integration API ключ Bito | Никогда |
| `BITO_JWT` | Bearer токен для back-office API | **Каждые 30 дней** |
| `BITO_ORG_ID` | ID организации в Bito | Никогда |
| `BITO_PRICE_ID` | ID прайс-листа в Bito | Никогда |
| `SUPABASE_DSN` | PostgreSQL строка подключения | Никогда |
| `GITHUB_BASE` | Base URL для GitHub Pages фото | Никогда |

### Как обновить BITO_JWT (раз в 30 дней)
1. Открыть `https://dekor-house.bito.uz` в браузере
2. DevTools → Network → любой запрос к `api.bito.uz` → Headers → Authorization
3. Скопировать значение (начинается с `Bearer eyJ...`)
4. Заменить в `.env` строку `BITO_JWT=...`

---

## Команды

```bash
cd ~/Documents/bito-cat

npm run square      # PNG → квадрат 1:1 (белые поля)
npm run bito        # загрузить все фото на Bito ERP
npm run supabase    # обновить ссылки в Supabase
npm run sync        # всё сразу: square → bito → supabase
```

### Один файл:
```bash
node scripts/upload-bito.mjs 6502-B-19-blue-1.png
node scripts/update-supabase.mjs 6502-B-19-blue-1.png
```

---

## Типичные задачи

### 📸 Добавить новое фото товара
1. Сохранить PNG в `edited/` с именем `{SKU}-{название}-1.png`
2. Запустить `npm run sync`
3. Сделать git push

### 🔄 Перегенерировать фото через GPT Image
Скрипт генерации: `/Users/sarvaribrokhimov/Documents/Codex/2026-05-09/files-mentioned-by-the-user-image/scripts/process-vetka-with-gpt-image.mjs`

```bash
cd /Users/sarvaribrokhimov/Documents/Codex/2026-05-09/files-mentioned-by-the-user-image
node scripts/process-vetka-with-gpt-image.mjs --offset {N} --limit 1 --force
```

Индексы SKU → offset смотреть в `output/vetka-batch/prompts.jsonl`

### 📋 Найти индекс по SKU/имени
```bash
node -e "
const fs = require('fs');
const jobs = fs.readFileSync('output/vetka-batch/prompts.jsonl','utf8').trim().split('\n').map(JSON.parse);
jobs.forEach((j,i) => {
  const f = require('path').basename(j.editedPath||'');
  if(f.toLowerCase().includes('ПОИСК')) console.log('offset='+i, f);
});
"
```

### 🚀 Push на GitHub
```bash
cd ~/Documents/bito-cat
git add edited/
git commit -m "fix: описание изменений"
git push
```

---

## API: Bito ERP

**Base URL:** `https://api.bito.uz`

| Endpoint | Метод | Auth | Назначение |
|----------|-------|------|-----------|
| `/integration-api/integration/api/v2/product/get-paging` | POST | `api-key` header | Список товаров |
| `/upload-api/public/upload` | POST multipart | `Authorization: Bearer JWT` | Загрузка файла |
| `/back-api/admin/product/update` | POST JSON | `Authorization: Bearer JWT` | Обновление товара |
| `/back-api/admin/settings/organization/get-all` | POST | `Authorization: Bearer JWT` | Список организаций |

**Важно:** Integration API использует header `api-key`, back-office API — `Authorization: Bearer JWT`

### Структура запроса product/update:
```json
{
  "_id": "...",
  "name": "B-19 blue",
  "sku": "6502",
  "image": "/uploads/file-xxx.png",
  "images": ["/uploads/file-xxx.png"],
  "is_product": true,
  "is_semi_product": false,
  "is_material": false,
  "is_marked": false,
  "is_variant": false,
  "is_compound": false,
  "is_service": false,
  "box_item": 0,
  "measure_id": "...",
  "category_ids": ["..."],
  "organizations": [{"organization_id": "6701170d334dc069f51e4c82", "is_available": true, "is_available_for_sale": true, "prices": []}],
  "supplier_ids": [], "materials": [], "barcodes": [], "attachments": []
}
```

---

## API: Supabase (PostgreSQL)

**Подключение:** используй `SUPABASE_DSN` из `.env` через `pg` (Node.js) или `psycopg2` (Python)

### Таблицы для фото:

**`products`** — товары
| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | text (cuid) | Primary key |
| `bitoSku` | text | SKU из Bito (для поиска) |
| `bitoProductId` | text | `_id` из Bito |
| `code` | text | Название/артикул |

**`product_images`** — фото товаров
| Колонка | Тип | Описание |
|---------|-----|----------|
| `id` | text (cuid) | Primary key |
| `productId` | text | FK → products.id |
| `url` | text | URL изображения |
| `isMain` | boolean | Главное фото |
| `sortOrder` | int | Порядок (0 = главное) |

### Типичные запросы:
```sql
-- Найти товар по SKU
SELECT id, code FROM products WHERE "bitoSku" = '6502';

-- Обновить главное фото
UPDATE product_images SET url = 'https://...' WHERE "productId" = '...' AND "isMain" = true;

-- Добавить фото
INSERT INTO product_images (id, "productId", url, alt, "sortOrder", "isMain", "createdAt")
VALUES ('cuid...', 'product-id', 'https://...', 'alt text', 0, true, NOW());
```

---

## Генерация ID (cuid)

Supabase использует cuid формат для ID. В Node.js:
```js
import crypto from 'crypto';
const cuid = () => 'c' + crypto.randomBytes(11).toString('base64url').toLowerCase().slice(0,24);
```

---

## Важные пути на Mac пользователя

```
~/Documents/bito-cat/               ← этот репо (основная рабочая папка)
~/Documents/bito-cat/edited/        ← PNG файлы товаров
~/Documents/bito-cat/.env           ← секреты

/Users/sarvaribrokhimov/Documents/Codex/2026-05-09/files-mentioned-by-the-user-image/
  output/vetka-batch/
    edited/          ← оригинальные сгенерированные PNG (источник)
    originals/       ← оригинальные фото товаров
    prompts.jsonl    ← промпты для GPT Image по каждому товару
  scripts/
    process-vetka-with-gpt-image.mjs  ← генерация через GPT Image API
  .env                                ← OPENAI_API_KEY
```

---

## Если что-то не работает

**`BITO_JWT` истёк** → обновить из браузера (см. выше). Признак: ошибка 401 от api.bito.uz

**Товар не найден в Supabase** → его нет в БД. Запустить sync.py:
```bash
cd /tmp/salarbaza-sync/backend/scripts/bito-sync
export SUPABASE_DSN="..." BITO_API_KEY="..." BITO_BASE_URL="..." BITO_PRICE_ID="..."
python3 sync.py --apply --skip-customers --skip-employees
```

**Desktop Commander зависает** → команда работает в фоне. Спросить пользователя запустить вручную в терминале.
