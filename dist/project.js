import { studio } from './catalog.js';
import { normalizePhone, normalizeTelegram } from './order.js';
import { applicationMethods } from './methods.js';
import { formatCentimetres, getCustomPrintLayout, getPrintPreview, maxPrintsPerSide, printSideLabels } from './print-layout.js?v=20261105-layout1';

const designStates = { help: 'Нужна помощь с макетом', ready: 'Есть готовый макет', sketch: 'Есть эскиз или референс' };
const invalid = (field, message) => Object.assign(new Error(message), { field });

function horizontalPosition(layout) {
  if (layout.offsetXMm === 0) return 'посередине футболки';
  const distance = formatCentimetres(Math.abs(layout.offsetXMm));
  return `${distance} см ${layout.offsetXMm < 0 ? 'левее' : 'правее'} середины футболки`;
}

export function describePrintSelection(selection) {
  if (Array.isArray(selection.areas)) {
    const layouts = selection.areas.map(getCustomPrintLayout);
    if (!layouts.length) throw new Error('Добавьте хотя бы один принт.');
    const lines = ['Раскладка принтов'];
    for (const [side, label] of Object.entries(printSideLabels)) {
      const areas = layouts.filter(area => area.side === side);
      if (areas.length > maxPrintsPerSide) throw new Error('Уменьшите количество принтов на одной стороне.');
      if (!areas.length) continue;
      lines.push('', label);
      for (const [index, layout] of areas.entries()) {
        const size = `${formatCentimetres(layout.widthMm)} × ${formatCentimetres(layout.heightMm)} см`;
        lines.push(
          `Принт ${index + 1}: ${size}, примерно ${layout.formatId}`,
          `Центр: ${horizontalPosition(layout)}. От верха: ${formatCentimetres(layout.topMm)} см.`,
        );
      }
    }
    return lines;
  }
  if ('widthMm' in selection || 'heightMm' in selection) {
    const layout = getCustomPrintLayout(selection);
    return [
      `Размер принта: ${formatCentimetres(layout.widthMm)} × ${formatCentimetres(layout.heightMm)} см`,
      `Ближайший формат: примерно ${layout.formatId}`,
      `Расположение: ${layout.side === 'front' ? 'на груди' : 'на спине'}`,
      `Центр по горизонтали: ${horizontalPosition(layout)}`,
      `Верхняя граница: ${formatCentimetres(layout.topMm)} см от верхнего края футболки`,
    ];
  }
  const layout = getPrintPreview(selection.formatId, selection.side, selection.orientation);
  return [
    `Формат: ${layout.formatId}, ${formatCentimetres(layout.widthMm)} × ${formatCentimetres(layout.heightMm)} см`,
    `Расположение: ${layout.side === 'front' ? 'на груди' : 'на спине'}`,
    `Ориентация: ${layout.orientation === 'portrait' ? 'вертикальная' : 'горизонтальная'}`,
  ];
}

export function prepareProjectRequest({ idea = '', garment = '', quantity = 1, methodId = '', design = 'help', deadline = '', phone, telegram, selection = null }) {
  const description = String(idea).trim();
  if (!description || description.length > 700) throw invalid('idea', 'Расскажите об идее: от 1 до 700 символов.');
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw invalid('quantity', 'Укажите количество вещей целым числом от 1.');
  const method = applicationMethods.find((item) => item.id === methodId);
  if (methodId && !method) throw invalid('method', 'Выберите способ нанесения из списка.');
  if (!Object.hasOwn(designStates, design)) throw invalid('design', 'Уточните, есть ли у вас макет.');
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) throw invalid('phone', 'Проверьте номер телефона. Например: +7 999 123 45 67.');
  const normalizedTelegram = normalizeTelegram(telegram);
  if (!normalizedTelegram) throw invalid('telegram', 'Укажите ник в Telegram: от 5 до 32 латинских букв, цифр или знаков _.');
  const lines = [
    `Здравствуйте, Игорь! Хочу обсудить свой проект ${studio.name}.`, '',
    `Идея: ${description}`,
    `Одежда: ${String(garment).trim().slice(0, 80) || 'обсудим вместе'}`,
    `Количество: ${quantity} шт.`,
    `Способ нанесения: ${method?.label || 'помогите выбрать'}`,
    `Макет: ${designStates[design]}`,
  ];
  if (String(deadline).trim()) lines.push(`Сроки и пожелания: ${String(deadline).trim().slice(0, 120)}`);
  if (selection) lines.push('', ...describePrintSelection(selection));
  lines.push('', `Телефон: ${normalizedPhone}`, `Telegram: ${normalizedTelegram}`, '', 'Прошу связаться со мной и обсудить детали проекта.');
  const text = lines.join('\n');
  return { text, url: `https://t.me/${studio.telegram}?text=${encodeURIComponent(text)}` };
}
