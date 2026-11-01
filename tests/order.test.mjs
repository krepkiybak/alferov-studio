import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { normalizePhone, normalizeTelegram, prepareOrder, formatPhone } from '../dist/order.js';
import { products } from '../dist/catalog.js';

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

test('All local HTML assets and product photos exist', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const references = [...html.matchAll(/(?:href|src)="([^"#:]+)"/g)].map((match) => match[1]);
  await Promise.all([...references, ...products.map((p) => p.image)].map((relative) => access(new URL(`../dist/${relative}`, import.meta.url))));
});
