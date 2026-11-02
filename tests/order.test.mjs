import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { normalizePhone, normalizeTelegram, prepareOrder, formatPhone } from '../dist/order.js';
import { products } from '../dist/catalog.js';
import { printFormats, getPrintPreview, formatCentimetres } from '../dist/print-guide.js';
import { keepShortWords } from '../dist/typography.js';

test('Print formats use verified dimensions and preserve their proportions in either orientation', () => {
  assert.deepEqual(printFormats.map(({id,widthMm,heightMm})=>[id,widthMm,heightMm]), [['A6',105,148],['A5',148,210],['A4',210,297],['A3',297,420],['A3+',329,483]]);
  for (const format of printFormats) for (const side of ['front','back']) {
    const portrait = getPrintPreview(format.id, side);
    const landscape = getPrintPreview(format.id, side, 'landscape');
    assert.equal(portrait.widthMm, landscape.heightMm);
    assert.equal(portrait.heightMm, landscape.widthMm);
    for (const preview of [portrait,landscape]) {
      assert.ok(preview.x >= 138 && preview.x + preview.width <= 462);
      assert.ok(preview.y >= 107 && preview.y + preview.height <= 504);
      assert.ok(Math.abs(preview.width / preview.height - preview.widthMm / preview.heightMm) < 1e-10);
    }
  }
  assert.equal(formatCentimetres(329), '32,9');
  assert.throws(()=>getPrintPreview('A0'), /формат/);
});

test('Typography binds short Russian words and measurement units without changing fields or hyphenated words', () => {
  assert.equal(keepShortWords('Идея в печати и на одежде'), 'Идея в печати и на одежде');
  assert.equal(keepShortWords('по-своему, Хогвартс-экспресс'), 'по-своему, Хогвартс-экспресс');
  assert.equal(keepShortWords('Ширина 54 см'), 'Ширина 54 см');
  const once = keepShortWords('Обо мне и студии');
  assert.equal(keepShortWords(once), once);
});

test('Phone formatting adds the country prefix and spacing while preserving a complete number', () => {
  for (const raw of ['9991234567', '89991234567', '+7 (999) 123-45-67', '7 999 123 45 67']) {
    const formatted = formatPhone(raw);
    assert.equal(formatted, '+7 999 123 45 67');
    assert.equal(normalizePhone(formatted), '+79991234567');
  }
  assert.equal(formatPhone(''), '');
  assert.equal(formatPhone('+'), '+');
  assert.equal(formatPhone('9'), '+7 9');
  assert.equal(formatPhone('+79991'), '+7 999 1');
  assert.equal(normalizePhone(formatPhone('+49 151 12345678')), '+4915112345678');
  assert.equal(normalizePhone(formatPhone('+7 999 123 45 678')), null);
});

test('Russian phones and international phones normalize; incomplete phones are rejected', () => {
  assert.equal(normalizePhone('8 (999) 123-45-67'), '+79991234567');
  assert.equal(normalizePhone('+7 999 123 45 67'), '+79991234567');
  assert.equal(normalizePhone('+49 151 12345678'), '+4915112345678');
  for (const value of ['', '123', '9991234567', '+7', '+79991234567abc']) assert.equal(normalizePhone(value), null);
});

test('Telegram handles and profile links normalize without allowing arbitrary destinations', () => {
  assert.equal(normalizeTelegram('@test_person'), '@test_person');
  assert.equal(normalizeTelegram('https://t.me/test_person'), '@test_person');
  for (const value of ['', '@ab', '@user name', 'https://evil.test/user', '@12345']) assert.equal(normalizeTelegram(value), null);
});

test('Every product produces an encoded order for Igor with the selected item, size, contacts and price', () => {
  for (const product of products) {
    const result = prepareOrder({ productId: product.id, size: 'XL', phone: '89991234567', telegram: '@test_person', comment: 'Подарок & размер?' });
    const url = new URL(result.url);
    assert.equal(url.origin, 'https://t.me');
    assert.equal(url.pathname, '/ig_alferov');
    assert.equal(url.searchParams.get('text'), result.text);
    assert.ok(result.text.includes(product.name));
    assert.ok(result.text.includes(product.color));
    assert.ok(result.text.includes('Размер: XL'));
    assert.ok(result.text.includes('+79991234567'));
    assert.ok(result.text.includes('@test_person'));
    assert.ok(result.text.includes('1 990'));
    assert.ok(result.text.includes('Подарок & размер?'));
  }
});

test('Invalid product, missing size and invalid contacts cannot produce an order', () => {
  const valid = { productId: products[0].id, size: 'M', phone: '89991234567', telegram: '@test_person' };
  assert.throws(() => prepareOrder({ ...valid, productId: 'unknown' }), /каталога/);
  assert.throws(() => prepareOrder({ ...valid, size: '' }), /размер/);
  assert.throws(() => prepareOrder({ ...valid, phone: '' }), /телефона/);
  assert.throws(() => prepareOrder({ ...valid, telegram: '' }), /Telegram/);
});

test('Orders include the selected quantity, unit price and correct total', () => {
  const valid = { productId: products[0].id, size: 'L', quantity: 3, phone: '89991234567', telegram: '@test_person' };
  const order = prepareOrder(valid);
  assert.ok(order.text.includes('Количество: 3 шт.'));
  assert.ok(order.text.includes('Цена за штуку: 1 990 ₽'));
  assert.ok(order.text.includes('Итого: 5 970 ₽'));
  assert.equal(new URL(order.url).searchParams.get('text'), order.text);
  for (const quantity of [0, -1, 1.5, 100, NaN, Infinity, '3', null]) {
    assert.throws(() => prepareOrder({ ...valid, quantity }), /количество/);
  }
});

test('All local HTML assets and product photos exist', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const references = [...html.matchAll(/(?:href|src)="([^"#:]+)"/g)].map((match) => match[1]);
  await Promise.all([...references, ...products.map((p) => p.image)].map((relative) => access(new URL(`../dist/${relative}`, import.meta.url))));
});
