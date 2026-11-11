import { products, studio, formatPrice } from './catalog.js?v=20261111-cat1';

export function formatPhone(raw) {
  const value = String(raw).trim();
  let digits = value.replace(/\D/g, '');
  if (!digits) return value.startsWith('+') ? '+' : '';
  if (!value.startsWith('+')) {
    if (digits.startsWith('8')) digits = `7${digits.slice(1)}`;
    else if (!digits.startsWith('7')) digits = `7${digits}`;
  }
  if (digits.startsWith('7')) {
    const parts = [digits.slice(0, 1), digits.slice(1, 4), digits.slice(4, 7), digits.slice(7, 9), digits.slice(9, 11), digits.slice(11)];
    return `+${parts.filter(Boolean).join(' ')}`;
  }
  return `+${digits.match(/.{1,3}/g).join(' ')}`;
}

export function normalizePhone(raw) {
  const value = String(raw).trim();
  if (!/^\+?[\d\s().-]+$/.test(value)) return null;
  const digits = value.replace(/\D/g, '');
  if (!value.startsWith('+') && /^8\d{10}$/.test(digits)) return `+7${digits.slice(1)}`;
  if (digits.startsWith('7')) return /^7\d{10}$/.test(digits) ? `+${digits}` : null;
  if (value.startsWith('+') && /^\d{10,15}$/.test(digits)) return `+${digits}`;
  return null;
}

export function normalizeTelegram(raw) {
  const value = String(raw).trim().replace(/^https?:\/\/(?:www\.)?t\.me\//i, '').replace(/^@/, '').replace(/\/$/, '');
  return /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(value) ? `@${value}` : null;
}

export function prepareOrder({ productId, size, quantity = 1, phone, telegram, comment = '' }) {
  const product = products.find((item) => item.id === productId);
  if (!product) throw new Error('Выберите футболку из каталога.');
  if (!studio.sizes.includes(size)) throw new Error('Пожалуйста, выберите размер.');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > studio.maxQuantity) throw new Error(`Укажите количество от 1 до ${studio.maxQuantity}.`);
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) throw new Error('Проверьте номер телефона. Например: +7 999 123-45-67.');
  const normalizedTelegram = normalizeTelegram(telegram);
  if (!normalizedTelegram) throw new Error('Укажите ник в Telegram: от 5 до 32 латинских букв, цифр или знаков _.');
  const lines = [
    `Здравствуйте, Игорь! Хочу оформить заказ ${studio.name}.`, '',
    `Модель: ${product.name}`, `Цвет: ${product.color}`, `Размер: ${size}`,
    `Количество: ${quantity} шт.`, `Цена за штуку: ${formatPrice(product.price)}`,
    `Итого: ${formatPrice(product.price * quantity)}`, '',
    `Телефон: ${normalizedPhone}`, `Telegram: ${normalizedTelegram}`,
  ];
  if (comment.trim()) lines.push(`Комментарий: ${comment.trim().slice(0, 500)}`);
  lines.push('', 'Прошу подтвердить заказ и обсудить доставку.');
  const text = lines.join('\n');
  return { text, url: `https://t.me/${studio.telegram}?text=${encodeURIComponent(text)}` };
}
