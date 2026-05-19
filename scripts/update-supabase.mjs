/**
 * update-supabase.mjs — обновляет ссылки на фото в Supabase
 * Использует GitHub Pages URL (не нужна загрузка файлов)
 *
 * Запуск: node scripts/update-supabase.mjs
 * Только один файл: node scripts/update-supabase.mjs 6502-B-19-blue-1.png
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../lib/config.mjs';
import { updateProductImage, createProductIfMissing, findProductBySku, disconnect } from '../lib/supabase.mjs';
import { getAllProducts } from '../lib/bito.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const EDITED_DIR = path.join(ROOT, 'edited');

const targetFile = process.argv[2];
const files = targetFile
  ? [targetFile]
  : fs.readdirSync(EDITED_DIR).filter(f => f.endsWith('.png')).sort();

// Только -1 файлы как главное фото, остальные как галерея
console.log(`\n🚀 Supabase update: ${files.length} file(s)\n`);

const bitoMap = await getAllProducts();
let ok=0, created=0, skipped=0, failed=0;

for (const file of files) {
  const sku = file.split('-')[0];
  const isMain = file.includes('-1.png');
  const githubUrl = `${config.GITHUB_BASE}/${file}`;

  try {
    // Проверяем есть ли продукт в Supabase
    let product = await findProductBySku(sku);

    if (!product) {
      // Создаём из Bito данных
      const bitoProduct = bitoMap[sku];
      if (!bitoProduct) {
        console.log(`⚠️  SKIP  ${file} — SKU ${sku} not found in Bito or Supabase`);
        skipped++;
        continue;
      }
      const result = await createProductIfMissing(bitoProduct);
      if (result.status === 'created') {
        console.log(`🆕 CREATED product SKU ${sku}`);
        created++;
        product = await findProductBySku(sku);
      }
    }

    const result = await updateProductImage(sku, githubUrl, isMain);
    console.log(`✅ ${result.status.toUpperCase().padEnd(8)} ${result.product || sku} — ${file}`);
    ok++;
  } catch(e) {
    console.error(`❌ ERR   ${file}: ${e.message}`);
    failed++;
  }
}

await disconnect();
console.log(`\n${'─'.repeat(50)}`);
console.log(`✅ ${ok} updated   🆕 ${created} created   ⚠️  ${skipped} skipped   ❌ ${failed} failed\n`);
