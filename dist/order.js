import { products, studio, formatPrice } from './catalog.js';

export function normalizePhone(raw) {
  const value = String(raw).trim();
  if (!/^\+?[\d\s().-]+$/.test(value)) return null;
  const digits = value.replace(/\D/g, '');
  if (/^8\d{10}$/.test(digits)) return `+7${digits.slice(1)}`;
  if (/^7\d{10}$/.test(digits)) return `+${digits}`;
  if (value.startsWith('+') && /^\d{10,15}$/.test(digits)) return `+${digits}`;
  return null;
}

export function normalizeTelegram(raw) {
  const value = String(raw).trim().replace(/^https?:\/\/(?:www\.)?t\.me\//i, '').replace(/^@/, '').replace(/\/$/, '');
  return /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(value) ? `@${value}` : null;
}

export function prepareOrder({ productId, size, phone, telegram, comment = '' }) {
  const product = products.find((item) => item.id === productId);
  if (!product) throw new Error('Выберите футболку из каталога.');
  if (!studio.sizes.includes(size)) throw new Error('Пожалуйста, выберите размер.');
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) throw new Error('Проверьте номер телефона. Например: +7 999 123-45-67.');
  const normalizedTelegram = normalizeTelegram(telegram);
  if (!normalizedTelegram) throw new Error('Укажите ник в Telegram: от 5 до 32 латинских букв, цифр или знаков _.');
  const lines = [
    'Здравствуйте, Игорь! Хочу заказать футболку ALFEROV.', '',
    `Модель: ${product.name}`, `Цвет: ${product.color}`, `Размер: ${size}`,
    `Цена: ${formatPrice(product.price)}`, '',
    `Телефон: ${normalizedPhone}`, `Telegram: ${normalizedTelegram}`,
  ];
  if (comment.trim()) lines.push(`Комментарий: ${comment.trim().slice(0, 500)}`);
  lines.push('', 'Прошу подтвердить доступность размера и обсудить доставку.');
  const text = lines.join('\n');
  return { text, url: `https://t.me/${studio.telegram}?text=${encodeURIComponent(text)}` };
}
