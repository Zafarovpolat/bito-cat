/**
 * upload-bito.mjs — загружает все PNG из edited/ на Bito
 * Использует: lib/bito.mjs + lib/config.mjs
 *
 * Запуск: node scripts/upload-bito.mjs
 * Только один файл: node scripts/upload-bito.mjs 6502-B-19-blue-1.png
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAllProducts, uploadFile, updateProduct } from '../lib/bito.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const EDITED_DIR = path.join(ROOT, 'edited');

const targetFile = process.argv[2]; // опционально: один файл
const files = targetFile
  ? [targetFile]
  : fs.readdirSync(EDITED_DIR).filter(f => f.endsWith('.png')).sort();

console.log(`\n🚀 Bito upload: ${files.length} file(s)\n`);

const skuMap = await getAllProducts();
let ok=0, skipped=0, failed=0;

for (const file of files) {
  const sku = file.split('-')[0];
  const product = skuMap[sku];

  if (!product) {
    console.log(`⚠️  SKIP  ${file} — SKU ${sku} not in Bito`);
    skipped++;
    continue;
  }

  try {
    const filePath = path.join(EDITED_DIR, file);
    if (!fs.existsSync(filePath)) { console.log(`⚠️  SKIP  ${file} — file not found`); skipped++; continue; }

    const imagePath = await uploadFile(filePath);
    await updateProduct(product, imagePath);
    console.log(`✅ OK    ${product.name} (${sku}) → ${imagePath}`);
    ok++;
    await new Promise(r => setTimeout(r, 250));
  } catch(e) {
    console.error(`❌ ERR   ${file}: ${e.message}`);
    failed++;
  }
}

console.log(`\n${'─'.repeat(50)}`);
console.log(`✅ ${ok} uploaded   ⚠️  ${skipped} skipped   ❌ ${failed} failed\n`);
