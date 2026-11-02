import { applicationMethods } from './methods.js';

export const printFormats = [
  { id: 'A7', widthMm: 74, heightMm: 105 },
  { id: 'A6', widthMm: 105, heightMm: 148 },
  { id: 'A5', widthMm: 148, heightMm: 210 },
  { id: 'A4', widthMm: 210, heightMm: 297 },
  { id: 'A3', widthMm: 297, heightMm: 420 },
  { id: 'A3+', widthMm: 329, heightMm: 483 },
];

// The illustrative garment has a 54 cm body width and a 74 cm length.
// All print rectangles use the same scale: 6 SVG units per centimetre.
export function getPrintPreview(formatId, side = 'front', orientation = 'portrait') {
  const format = printFormats.find((item) => item.id === formatId);
  if (!format) throw new Error('Неизвестный формат');
  if (!['front', 'back'].includes(side)) throw new Error('Неизвестная сторона');
  if (!['portrait', 'landscape'].includes(orientation)) throw new Error('Неизвестная ориентация');
  const widthMm = orientation === 'portrait' ? format.widthMm : format.heightMm;
  const heightMm = orientation === 'portrait' ? format.heightMm : format.widthMm;
  const width = widthMm * 0.6;
  const height = heightMm * 0.6;
  return { formatId, side, orientation, widthMm, heightMm, width, height, x: 300 - width / 2, y: side === 'front' ? 166 : 150 };
}

export const formatCentimetres = (mm) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(mm / 10);

export function initPrintGuide(root = document) {
  const svg = root.querySelector('#print-preview');
  if (!svg) return;
  let formatId = 'A4';
  let side = 'front';
  let orientation = 'portrait';
  let methodId = '';
  const $ = (selector) => root.querySelector(selector);
  for (const method of applicationMethods) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.printMethod = method.id;
    button.textContent = method.label;
    $('#print-method-options').append(button);
  }
  const setAttributes = (element, attributes) => {
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  };
  function render() {
    const layout = getPrintPreview(formatId, side, orientation);
    const { x, y, width, height } = layout;
    const w = formatCentimetres(layout.widthMm);
    const h = formatCentimetres(layout.heightMm);
    const place = side === 'front' ? 'На груди' : 'На спине';
    setAttributes($('#print-area'), { x, y, width, height });
    setAttributes($('#print-area-label'), { x: 300, y: y + height / 2 + 6 });
    $('#print-area-label').textContent = formatId;
    setAttributes($('#print-width-line'), { x1: x, x2: x + width, y1: y - 17, y2: y - 17 });
    setAttributes($('#print-width-label'), { x: 300, y: y - 25 });
    $('#print-width-label').textContent = `${w} см`;
    setAttributes($('#print-height-line'), { x1: x - 17, x2: x - 17, y1: y, y2: y + height });
    setAttributes($('#print-height-label'), { x: x - 25, y: y + height / 2, transform: `rotate(-90 ${x - 25} ${y + height / 2})` });
    $('#print-height-label').textContent = `${h} см`;
    $('#shirt-neck-front').toggleAttribute('hidden', side === 'back');
    $('#shirt-neck-back').toggleAttribute('hidden', side === 'front');
    $('#shirt-body').setAttribute('d', `${side === 'front' ? 'M228 60 C240 91 265 107 300 107 C335 107 360 91 372 60' : 'M228 60 Q300 88 372 60'} L448 79 552 211 480 253 462 222 462 504 138 504 138 222 120 253 48 211 152 79Z`);
    $('#print-current-format').textContent = formatId;
    $('#print-dimensions').textContent = `${w} × ${h} см`;
    $('#print-placement-label').textContent = place;
    $('#print-method-label').textContent = applicationMethods.find((method) => method.id === methodId)?.label || '';
    $('#print-method-label').hidden = !methodId;
    $('#print-preview-description').textContent = `${formatId}, ${w} на ${h} сантиметров, ${place.toLowerCase()}. Условная футболка шириной 54 и длиной 74 сантиметра.`;
    for (const button of root.querySelectorAll('[data-print-format]')) button.setAttribute('aria-pressed', String(button.dataset.printFormat === formatId));
    for (const button of root.querySelectorAll('[data-print-side]')) button.setAttribute('aria-pressed', String(button.dataset.printSide === side));
    for (const button of root.querySelectorAll('[data-print-orientation]')) button.setAttribute('aria-pressed', String(button.dataset.printOrientation === orientation));
    for (const button of root.querySelectorAll('[data-print-method]')) button.setAttribute('aria-pressed', String(button.dataset.printMethod === methodId));
  }
  for (const button of root.querySelectorAll('[data-print-format]')) button.addEventListener('click', () => { formatId = button.dataset.printFormat; render(); });
  for (const button of root.querySelectorAll('[data-print-side]')) button.addEventListener('click', () => { side = button.dataset.printSide; render(); });
  for (const button of root.querySelectorAll('[data-print-orientation]')) button.addEventListener('click', () => { orientation = button.dataset.printOrientation; render(); });
  for (const button of root.querySelectorAll('[data-print-method]')) button.addEventListener('click', () => { methodId = button.dataset.printMethod; render(); });
  render();
  return { getSelection: () => ({ formatId, side, orientation, methodId }) };
}
