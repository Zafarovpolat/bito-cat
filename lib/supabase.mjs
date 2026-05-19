/**
 * Supabase module — обновление изображений товаров
 */
import { createRequire } from 'module';
import crypto from 'crypto';
import { config } from './config.mjs';

const require = createRequire(import.meta.url);
const { Client } = require('pg');

function cuid() {
  return 'c' + crypto.randomBytes(11).toString('base64url').toLowerCase().slice(0,24);
}

let _client = null;
async function getClient() {
  if (_client) return _client;
  _client = new Client({ connectionString: config.SUPABASE_DSN, ssl: { rejectUnauthorized: false } });
  await _client.connect();
  return _client;
}

export async function disconnect() {
  if (_client) { await _client.end(); _client = null; }
}

/**
 * Найти товар по bitoSku
 */
export async function findProductBySku(sku) {
  const db = await getClient();
  const r = await db.query('SELECT id, code FROM products WHERE "bitoSku"=$1 LIMIT 1', [String(sku)]);
  return r.rows[0] || null;
}

/**
 * Обновить или создать главное изображение товара
 */
export async function updateProductImage(sku, imageUrl, isMain = true) {
  const db = await getClient();
  const product = await findProductBySku(sku);
  if (!product) return { status: 'not_found', sku };

  const existing = await db.query(
    'SELECT id FROM product_images WHERE "productId"=$1 AND "isMain"=$2 LIMIT 1',
    [product.id, isMain]
  );
  if (existing.rows.length) {
    await db.query('UPDATE product_images SET url=$1 WHERE id=$2', [imageUrl, existing.rows[0].id]);
    return { status: 'updated', sku, product: product.code };
  } else {
    await db.query(
      'INSERT INTO product_images (id,"productId",url,alt,"sortOrder","isMain","createdAt") VALUES ($1,$2,$3,$4,$5,$6,NOW())',
      [cuid(), product.id, imageUrl, product.code, isMain ? 0 : 1, isMain]
    );
    return { status: 'inserted', sku, product: product.code };
  }
}

/**
 * Создать товар в Supabase по данным из Bito (если не существует)
 */
export async function createProductIfMissing(bitoProduct, categoryMap = {}) {
  const db = await getClient();
  const sku = String(bitoProduct.sku);
  const existing = await findProductBySku(sku);
  if (existing) return { status: 'exists', id: existing.id };

  const id = cuid();
  const name = bitoProduct.name || sku;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')
    + '-' + bitoProduct._id.slice(-6);
  const stock = Object.values(bitoProduct._warehouses||{}).reduce((s,w)=>s+(w?.amount||0),0);
  const catId = bitoProduct.category?._id ? (categoryMap[bitoProduct.category._id] || null) : null;
  const now = new Date().toISOString();

  await db.query(`
    INSERT INTO products (id,code,slug,"nameRu","nameUz","categoryId",price,
      "inStock","stockQuantity","setQuantity","isActive","isFeatured","isNew","viewCount",
      "bitoProductId","bitoSku","bitoNumber","createdAt","updatedAt")
    VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,1,true,false,false,0,$9,$10,$11,$12,$12)
  `, [id, name, slug, name, name, catId, stock>0, stock, bitoProduct._id, sku, bitoProduct.number||null, now]);

  return { status: 'created', id };
}
