/**
 * Bito API module — все функции для работы с Bito ERP
 * Использует два типа auth:
 *   - api-key: для GET (Integration API)
 *   - JWT Bearer: для POST/upload (Back-office API)
 */

import fs from 'fs';
import path from 'path';
import { config } from './config.mjs';

const INT_BASE = 'https://api.bito.uz/integration-api/integration/api/v2';
const UPLOAD_URL = 'https://api.bito.uz/upload-api/public/upload';
const UPDATE_URL = 'https://api.bito.uz/back-api/admin/product/update';

const intH = () => ({ 'api-key': config.BITO_API_KEY, 'Content-Type': 'application/json' });
const jwtH = () => ({ 'Authorization': config.BITO_JWT, 'Content-Type': 'application/json' });

/**
 * Получить все товары из Bito (кэшируется в памяти за сессию)
 */
let _cache = null;
export async function getAllProducts() {
  if (_cache) return _cache;
  const map = {};
  let page = 1, total = 9999;
  process.stdout.write('Loading Bito products');
  while ((page-1)*100 < total) {
    const d = await (await fetch(`${INT_BASE}/product/get-paging`, {
      method: 'POST', headers: intH(),
      body: JSON.stringify({ page, limit: 100, is_product: true })
    })).json();
    if (!d.data) throw new Error('Bito API error: ' + JSON.stringify(d).slice(0,100));
    total = d.data.total;
    for (const p of d.data.data) map[String(p.sku)] = p;
    process.stdout.write('.');
    page++;
    await new Promise(r => setTimeout(r, 150));
  }
  console.log(` ${Object.keys(map).length} products`);
  _cache = map;
  return map;
}

/**
 * Найти товар по SKU
 */
export async function getProductBySku(sku) {
  const map = await getAllProducts();
  return map[String(sku)] || null;
}

/**
 * Загрузить файл на Bito
 * Возвращает путь вида /uploads/file-xxx.png
 */
export async function uploadFile(filePath) {
  const buf = fs.readFileSync(filePath);
  const name = path.basename(filePath);
  const bnd = 'B' + Date.now();
  const body = Buffer.concat([
    Buffer.from(`--${bnd}\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\nContent-Type: image/png\r\n\r\n`),
    buf,
    Buffer.from(`\r\n--${bnd}--\r\n`)
  ]);
  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: { 'Authorization': config.BITO_JWT, 'Content-Type': `multipart/form-data; boundary=${bnd}` },
    body
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error('Upload failed: ' + JSON.stringify(data).slice(0,100));
  return data.data; // /uploads/file-xxx.png
}

/**
 * Обновить товар в Bito с новым изображением
 */
export async function updateProduct(product, imagePath) {
  const body = {
    _id: product._id,
    name: product.name,
    sku: product.sku,
    image: imagePath,
    images: [imagePath],
    is_product: true,
    is_semi_product: false,
    is_material: false,
    is_marked: false,
    is_variant: false,
    is_compound: false,
    is_service: false,
    box_item: product.box_item ?? 0,
    measure_id: product.measure?._id || product.measure_id,
    category_ids: product.category ? [product.category._id] : [],
    organizations: [{ organization_id: config.BITO_ORG_ID, is_available: true, is_available_for_sale: true, prices: [] }],
    supplier_ids: [], materials: [], barcodes: [], attachments: []
  };
  const res = await fetch(UPDATE_URL, {
    method: 'POST', headers: jwtH(), body: JSON.stringify(body)
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error('Update failed: ' + JSON.stringify(data).slice(0,120));
  return data;
}
