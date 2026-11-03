import { applicationMethods } from './methods.js';
import { printLimits, printScale, getPrintPreview, formatCentimetres, createPresetPrintArea, constrainPrintArea, resizePrintAreaAroundCenter, resizePrintAreaFromCorner, getCustomPrintLayout } from './print-layout.js';
export { printFormats, getPrintPreview, formatCentimetres } from './print-layout.js';

export function initPrintGuide(root = document) {
  const svg = root.querySelector('#print-preview');
  if (!svg) return;
  const $ = (selector) => root.querySelector(selector);
  let area = createPresetPrintArea();
  let methodId = '';
  let drag = null;
  const shapeNames = { rectangle: 'Прямоугольник', circle: 'Круг', ellipse: 'Овал' };
  const fields = Object.fromEntries(['width','height','offset','top'].map((name) => [name, $(`#print-${name}-input`)]));
  const setAttributes = (element, attributes) => {
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, typeof value === 'number' ? Math.round(value * 1000) / 1000 : value);
  };
  $('#print-method-options').replaceChildren();
  for (const method of applicationMethods) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.printMethod = method.id;
    button.textContent = method.label;
    $('#print-method-options').append(button);
  }
  function render() {
    const layout = getCustomPrintLayout(area);
    const { x, y, width, height, formatId } = layout;
    const w = formatCentimetres(area.widthMm), h = formatCentimetres(area.heightMm);
    const place = area.side === 'front' ? 'На груди' : 'На спине';
    setAttributes($('#print-area'), { x, y, width, height, rx: area.shape === 'rectangle' ? 0 : width / 2, ry: area.shape === 'rectangle' ? 0 : height / 2 });
    setAttributes($('#print-area-hit'), { x: x - 6, y: y - 6, width: width + 12, height: height + 12 });
    $('#print-area-hit').setAttribute('aria-label', `Область принта, ${w} на ${h} сантиметров. Стрелки перемещают область, Shift ускоряет перемещение.`);
    setAttributes($('#print-area-label'), { x: x + width / 2, y: y + height / 2 + 6 });
    $('#print-area-label').textContent = formatId;
    $('#print-area-label').toggleAttribute('hidden', width < 40 || height < 30);
    setAttributes($('#print-width-line'), { x1: x, x2: x + width, y1: y - 17, y2: y - 17 });
    setAttributes($('#print-width-label'), { x: x + width / 2, y: y - 25 });
    $('#print-width-label').textContent = `${w} см`;
    setAttributes($('#print-height-line'), { x1: x - 17, x2: x - 17, y1: y, y2: y + height });
    setAttributes($('#print-height-label'), { x: x - 25, y: y + height / 2, transform: `rotate(-90 ${x - 25} ${y + height / 2})` });
    $('#print-height-label').textContent = `${h} см`;
    for (const handle of root.querySelectorAll('[data-print-resize]')) {
      const corner = handle.dataset.printResize;
      handle.setAttribute('transform', `translate(${corner.includes('w') ? x : x + width} ${corner.includes('n') ? y : y + height})`);
    }
    $('#shirt-neck-front').toggleAttribute('hidden', area.side === 'back');
    $('#shirt-neck-back').toggleAttribute('hidden', area.side === 'front');
    $('#shirt-body').setAttribute('d', `${area.side === 'front' ? 'M228 60 C240 91 265 107 300 107 C335 107 360 91 372 60' : 'M228 60 Q300 88 372 60'} L448 79 552 211 480 253 462 222 462 504 138 504 138 222 120 253 48 211 152 79Z`);
    $('#print-current-format').textContent = `≈ ${formatId}`;
    $('#print-dimensions').textContent = `${w} × ${h} см`;
    $('#print-placement-label').textContent = place;
    $('#print-position-label').textContent = `Центр: ${formatCentimetres(area.offsetXMm)} см. От верха: ${formatCentimetres(area.topMm)} см.`;
    $('#print-method-label').textContent = applicationMethods.find((method) => method.id === methodId)?.label || '';
    $('#print-method-label').hidden = !methodId;
    $('#print-width-label-text').textContent = area.shape === 'circle' ? 'Диаметр, см' : 'Ширина, см';
    fields.width.value = String(area.widthMm / 10);
    fields.height.value = String(area.heightMm / 10);
    fields.offset.value = String(area.offsetXMm / 10);
    fields.top.value = String(area.topMm / 10);
    fields.width.max = String((area.shape === 'circle' || area.heightMm > printLimits.shortMm ? printLimits.shortMm : printLimits.longMm) / 10);
    fields.height.max = String((area.widthMm > printLimits.shortMm ? printLimits.shortMm : printLimits.longMm) / 10);
    fields.height.disabled = area.shape === 'circle';
    fields.offset.min = String(Math.ceil(-420 + area.widthMm / 2) / 10);
    fields.offset.max = String(Math.floor(420 - area.widthMm / 2) / 10);
    fields.top.max = String((740 - area.heightMm) / 10);
    $('.print-orientation-control').hidden = area.shape === 'circle';
    $('#print-preview-description').textContent = `${shapeNames[area.shape]}, ${w} на ${h} сантиметров, ${place.toLowerCase()}. Смещение центра ${formatCentimetres(area.offsetXMm)} сантиметров, отступ сверху ${formatCentimetres(area.topMm)} сантиметров.`;
    for (const button of root.querySelectorAll('[data-print-format]')) {
      const preset = getPrintPreview(button.dataset.printFormat);
      button.setAttribute('aria-pressed', String((area.widthMm === preset.widthMm && area.heightMm === preset.heightMm) || (area.widthMm === preset.heightMm && area.heightMm === preset.widthMm)));
    }
    for (const button of root.querySelectorAll('[data-print-side]')) button.setAttribute('aria-pressed', String(button.dataset.printSide === area.side));
    for (const button of root.querySelectorAll('[data-print-shape]')) button.setAttribute('aria-pressed', String(button.dataset.printShape === area.shape));
    for (const button of root.querySelectorAll('[data-print-orientation]')) button.setAttribute('aria-pressed', String(button.dataset.printOrientation === layout.orientation));
    for (const button of root.querySelectorAll('[data-print-method]')) button.setAttribute('aria-pressed', String(button.dataset.printMethod === methodId));
  }
  function commit(next) { area = next; render(); }
  for (const button of root.querySelectorAll('[data-print-format]')) button.addEventListener('click', () => {
    const preset = createPresetPrintArea(button.dataset.printFormat, area.side, area.widthMm > area.heightMm ? 'landscape' : 'portrait', area.shape);
    commit(resizePrintAreaAroundCenter(area, preset.widthMm, preset.heightMm));
  });
  for (const button of root.querySelectorAll('[data-print-side]')) button.addEventListener('click', () => commit(constrainPrintArea({ ...area, side: button.dataset.printSide })));
  for (const button of root.querySelectorAll('[data-print-shape]')) button.addEventListener('click', () => {
    let next = { ...area, shape: button.dataset.printShape };
    if (next.shape === 'circle') {
      const diameter = Math.min(area.widthMm, area.heightMm);
      next = { ...next, widthMm: diameter, heightMm: diameter, topMm: area.topMm + (area.heightMm - diameter) / 2 };
    }
    commit(constrainPrintArea(next));
  });
  for (const button of root.querySelectorAll('[data-print-orientation]')) button.addEventListener('click', () => {
    if ((button.dataset.printOrientation === 'landscape') !== (area.widthMm > area.heightMm)) commit(resizePrintAreaAroundCenter(area, area.heightMm, area.widthMm));
  });
  for (const button of root.querySelectorAll('[data-print-method]')) button.addEventListener('click', () => { methodId = button.dataset.printMethod; render(); });
  for (const [name, field] of Object.entries(fields)) {
    const applyValue = () => {
      const value = field.valueAsNumber * 10;
      if (!Number.isFinite(value)) return render();
      if (name === 'width' || name === 'height') commit(resizePrintAreaAroundCenter(area, name === 'width' ? value : area.widthMm, name === 'height' ? value : area.heightMm));
      else commit(constrainPrintArea({ ...area, [name === 'offset' ? 'offsetXMm' : 'topMm']: value }, area));
    };
    field.addEventListener('change', applyValue);
    field.addEventListener('blur', applyValue);
    field.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); applyValue(); field.blur(); } });
  }
  for (const button of root.querySelectorAll('[data-print-scale]')) button.addEventListener('click', () => commit(resizePrintAreaAroundCenter(area, area.widthMm * Number(button.dataset.printScale), area.heightMm * Number(button.dataset.printScale))));
  $('#print-reset').addEventListener('click', () => { area = createPresetPrintArea(); methodId = ''; render(); });
  function point(event) {
    const p = svg.createSVGPoint();
    p.x = event.clientX; p.y = event.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }
  svg.addEventListener('pointerdown', (event) => {
    const target = event.target.closest('[data-print-resize],#print-area-hit,#print-area');
    if (!target || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    drag = { pointerId: event.pointerId, origin: point(event), area: { ...area }, corner: target.dataset.printResize || null };
    target.closest('[tabindex]')?.focus({ preventScroll: true });
    svg.setPointerCapture(event.pointerId);
    svg.classList.add('is-editing');
    $('.print-selection').setAttribute('aria-live', 'off');
  });
  svg.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    const current = point(event);
    const dx = (current.x - drag.origin.x) / printScale, dy = (current.y - drag.origin.y) / printScale;
    commit(drag.corner ? resizePrintAreaFromCorner(drag.area, drag.corner, dx, dy) : constrainPrintArea({ ...drag.area, offsetXMm: drag.area.offsetXMm + dx, topMm: drag.area.topMm + dy }, area));
  });
  function finish(event) {
    if (!drag || (event.pointerId !== undefined && event.pointerId !== drag.pointerId)) return;
    const pointerId = drag.pointerId;
    drag = null;
    if (svg.hasPointerCapture(pointerId)) svg.releasePointerCapture(pointerId);
    svg.classList.remove('is-editing');
    $('.print-selection').setAttribute('aria-live', 'polite');
    render();
  }
  svg.addEventListener('pointerup', finish);
  svg.addEventListener('pointercancel', finish);
  svg.addEventListener('lostpointercapture', finish);
  svg.addEventListener('keydown', (event) => {
    const target = event.target.closest('[data-print-resize],#print-area-hit');
    const delta = { ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1] }[event.key];
    if (!target || !delta) return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1, dx = delta[0] * step, dy = delta[1] * step;
    commit(target.dataset.printResize ? resizePrintAreaFromCorner(area, target.dataset.printResize, dx, dy) : constrainPrintArea({ ...area, offsetXMm: area.offsetXMm + dx, topMm: area.topMm + dy }, area));
  });
  render();
  return { getSelection: () => ({ ...area, methodId, formatId: getCustomPrintLayout(area).formatId, orientation: area.widthMm > area.heightMm ? 'landscape' : 'portrait' }) };
}
