import { applicationMethods } from './methods.js';
import {
  constrainPrintArea,
  createAdditionalPrintArea,
  createPresetPrintArea,
  formatCentimetres,
  getCustomPrintLayout,
  getPrintPreview,
  maxPrintsPerSide,
  printColors,
  printLimits,
  printScale,
  printShapeAttributes,
  printSideLabels,
  resizePrintAreaAroundCenter,
  resizePrintAreaFromCorner,
  shirtOutline,
} from './print-layout.js?v=20261105-layout1';
import { createPrintSheetSvg, printAreaGraphic, printSheetSource } from './print-sheet.js?v=20261105-layout1';

export { printFormats, getPrintPreview, formatCentimetres } from './print-layout.js?v=20261105-layout1';

export function initPrintGuide(root = document) {
  const svg = root.querySelector('#print-preview');
  if (!svg) return;

  const $ = (selector) => root.querySelector(selector);
  const sides = {
    front: { areas: [createPresetPrintArea()], active: 0 },
    back: { areas: [], active: 0 },
  };
  let side = 'front';
  let methodId = '';
  let drag = null;

  const currentSide = () => sides[side];
  const activeArea = () => currentSide().areas[currentSide().active];
  const allAreas = () => [...sides.front.areas, ...sides.back.areas];
  const fields = Object.fromEntries(['width', 'height', 'offset', 'top'].map(name => [name, $(`#print-${name}-input`)]));
  const printList = $('#print-parts');
  const addButton = $('#print-add');
  const removeButton = $('#print-remove');
  const status = $('.print-selection');
  const hit = $('#print-area-hit');

  function setAttributes(element, attributes) {
    for (const [name, value] of Object.entries(attributes)) {
      element.setAttribute(name, typeof value === 'number' ? Math.round(value * 1000) / 1000 : value);
    }
  }

  for (const method of applicationMethods) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.printMethod = method.id;
    button.textContent = method.label;
    $('#print-method-options').append(button);
  }

  function renderSheet() {
    const areas = allAreas();
    const count = `На груди: ${sides.front.areas.length} · На спине: ${sides.back.areas.length}`;
    $('#print-board-count').textContent = count;
    $('#print-sheet-preview').src = printSheetSource(createPrintSheetSvg(areas));
    $('#print-sheet-preview').alt = `Схема расположения принтов. ${count}.`;
    $('#discuss-print').disabled = areas.length === 0;
  }

  function renderArea() {
    const area = activeArea();
    if (!area) return;

    const { x, y, width, height, formatId, orientation } = getCustomPrintLayout(area);
    const number = currentSide().active + 1;
    const color = printColors[number - 1];
    const w = formatCentimetres(area.widthMm);
    const h = formatCentimetres(area.heightMm);
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const rectangle = area.shape === 'rectangle';

    setAttributes($('#print-area'), { ...printShapeAttributes(area), fill: color, stroke: color });
    setAttributes(hit, {
      x: x - 6,
      y: y - 6,
      width: width + 12,
      height: height + 12,
      rx: rectangle ? 0 : width / 2 + 6,
      ry: rectangle ? 0 : height / 2 + 6,
    });
    hit.setAttribute('aria-label', `Принт ${number}, ${w} на ${h} сантиметров. Перемещайте стрелками.`);
    setAttributes($('#print-area-badge'), { cx: centerX, cy: centerY, fill: color });
    setAttributes($('#print-area-label'), { x: centerX, y: centerY + 5 });
    $('#print-area-label').textContent = number;
    setAttributes($('#print-width-line'), { x1: x, x2: x + width, y1: y - 17, y2: y - 17 });
    setAttributes($('#print-width-label'), { x: centerX, y: y - 25 });
    $('#print-width-label').textContent = `${w} см`;
    setAttributes($('#print-height-line'), { x1: x - 17, x2: x - 17, y1: y, y2: y + height });
    setAttributes($('#print-height-label'), { x: x - 25, y: centerY, transform: `rotate(-90 ${x - 25} ${centerY})` });
    $('#print-height-label').textContent = `${h} см`;

    for (const handle of svg.querySelectorAll('[data-print-resize]')) {
      const corner = handle.dataset.printResize;
      const handleX = corner.includes('w') ? x : x + width;
      const handleY = corner.includes('n') ? y : y + height;
      handle.setAttribute('transform', `translate(${handleX} ${handleY})`);
      handle.querySelector('.print-handle').setAttribute('stroke', color);
    }

    $('#print-current-format').textContent = `≈ ${formatId}`;
    $('#print-dimensions').textContent = `${w} × ${h} см`;
    $('#print-placement-label').textContent = `Принт ${number} · ${printSideLabels[side].toLowerCase()}`;
    $('#print-position-label').textContent = `Центр: ${formatCentimetres(area.offsetXMm)} см. От верха: ${formatCentimetres(area.topMm)} см.`;
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

    for (const button of root.querySelectorAll('[data-print-format]')) {
      const preset = getPrintPreview(button.dataset.printFormat, side, orientation);
      const exact = area.shape === 'circle'
        ? area.widthMm === Math.min(preset.widthMm, preset.heightMm)
        : area.widthMm === preset.widthMm && area.heightMm === preset.heightMm;
      button.setAttribute('aria-pressed', String(exact));
    }
    for (const button of root.querySelectorAll('[data-print-shape]')) {
      button.setAttribute('aria-pressed', String(button.dataset.printShape === area.shape));
    }
    for (const button of root.querySelectorAll('[data-print-orientation]')) {
      button.setAttribute('aria-pressed', String(button.dataset.printOrientation === orientation));
    }
  }

  function renderSide() {
    finishDrag();
    const { areas, active } = currentSide();
    const hasPrint = areas.length > 0;
    for (const button of root.querySelectorAll('[data-print-side]')) {
      const buttonSide = button.dataset.printSide;
      const count = sides[buttonSide].areas.length;
      button.setAttribute('aria-pressed', String(buttonSide === side));
      button.setAttribute('aria-label', `${printSideLabels[buttonSide]}, принтов: ${count}`);
      button.querySelector('.print-side-count').textContent = count;
    }
    $('#print-stage-label').textContent = printSideLabels[side];
    $('#print-preview-description').textContent = `${printSideLabels[side]}. Областей печати: ${areas.length}.`;
    $('#shirt-neck-front').toggleAttribute('hidden', side === 'back');
    $('#shirt-neck-back').toggleAttribute('hidden', side === 'front');
    $('#shirt-body').setAttribute('d', shirtOutline(side));

    printList.replaceChildren(...areas.map((area, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.selectPrint = index;
      button.setAttribute('aria-pressed', String(index === active));
      button.style.setProperty('--print-color', printColors[index]);
      button.textContent = `Принт ${index + 1}`;
      return button;
    }));
    $('#print-other-areas').innerHTML = areas.map((area, index) => index === active ? '' :
      `<g data-pick-print="${index}" class="print-inactive-area">${printAreaGraphic(area, index)}</g>`).join('');
    addButton.textContent = hasPrint ? '+ Дополнительный принт' : '+ Добавить принт';
    addButton.disabled = areas.length >= maxPrintsPerSide;
    $('#print-limit').hidden = !addButton.disabled;
    removeButton.hidden = !hasPrint;
    printList.hidden = !hasPrint;
    $('#print-side-empty').hidden = hasPrint;
    for (const control of root.querySelectorAll('[data-print-active]')) {
      control.toggleAttribute('hidden', !hasPrint);
    }
    renderArea();
    renderSheet();
  }

  function commit(next) {
    const { areas, active } = currentSide();
    areas[active] = next;
    renderArea();
    if (!drag) renderSheet();
  }

  function selectArea(index) {
    currentSide().active = index;
    renderSide();
  }

  printList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-select-print]');
    if (!button) return;
    selectArea(Number(button.dataset.selectPrint));
    printList.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
  });
  addButton.addEventListener('click', () => {
    const layout = currentSide();
    if (layout.areas.length >= maxPrintsPerSide) return;
    layout.areas.push(createAdditionalPrintArea(side, layout.areas));
    selectArea(layout.areas.length - 1);
    printList.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
  });
  removeButton.addEventListener('click', () => {
    const layout = currentSide();
    layout.areas.splice(layout.active, 1);
    selectArea(Math.max(0, Math.min(layout.active, layout.areas.length - 1)));
    (printList.querySelector('[aria-pressed="true"]') || addButton).focus({ preventScroll: true });
  });

  for (const button of root.querySelectorAll('[data-print-side]')) {
    button.addEventListener('click', () => {
      side = button.dataset.printSide;
      renderSide();
    });
  }
  for (const button of root.querySelectorAll('[data-print-format]')) {
    button.addEventListener('click', () => {
      const area = activeArea();
      const orientation = getCustomPrintLayout(area).orientation;
      const preset = createPresetPrintArea(button.dataset.printFormat, side, orientation, area.shape);
      commit(resizePrintAreaAroundCenter(area, preset.widthMm, preset.heightMm));
    });
  }
  for (const button of root.querySelectorAll('[data-print-shape]')) {
    button.addEventListener('click', () => {
      const area = activeArea();
      let next = { ...area, shape: button.dataset.printShape };
      if (next.shape === 'circle') {
        const diameter = Math.min(area.widthMm, area.heightMm);
        next = { ...next, widthMm: diameter, heightMm: diameter, topMm: area.topMm + (area.heightMm - diameter) / 2 };
      }
      commit(constrainPrintArea(next));
    });
  }
  for (const button of root.querySelectorAll('[data-print-orientation]')) {
    button.addEventListener('click', () => {
      const area = activeArea();
      const orientation = getCustomPrintLayout(area).orientation;
      if (button.dataset.printOrientation !== orientation) {
        commit(resizePrintAreaAroundCenter(area, area.heightMm, area.widthMm));
      }
    });
  }
  for (const button of root.querySelectorAll('[data-print-method]')) {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      methodId = methodId === button.dataset.printMethod ? '' : button.dataset.printMethod;
      for (const option of root.querySelectorAll('[data-print-method]')) {
        option.setAttribute('aria-pressed', String(option.dataset.printMethod === methodId));
      }
    });
  }
  for (const [name, field] of Object.entries(fields)) {
    const applyValue = () => {
      const area = activeArea();
      if (!area) return;
      const value = field.valueAsNumber * 10;
      if (!Number.isFinite(value)) return renderArea();
      if (name === 'width' || name === 'height') {
        commit(resizePrintAreaAroundCenter(area, name === 'width' ? value : area.widthMm, name === 'height' ? value : area.heightMm));
      } else {
        const coordinate = name === 'offset' ? 'offsetXMm' : 'topMm';
        commit(constrainPrintArea({ ...area, [coordinate]: value }, area));
      }
    };
    field.addEventListener('change', applyValue);
    field.addEventListener('blur', applyValue);
    field.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      applyValue();
      field.blur();
    });
  }
  for (const button of root.querySelectorAll('[data-print-scale]')) {
    button.addEventListener('click', () => {
      const area = activeArea();
      const scale = Number(button.dataset.printScale);
      commit(resizePrintAreaAroundCenter(area, area.widthMm * scale, area.heightMm * scale));
    });
  }
  $('#print-reset').addEventListener('click', () => {
    const { areas, active } = currentSide();
    const otherAreas = areas.filter((_, index) => index !== active);
    const preset = active === 0 ? createPresetPrintArea('A4', side) : createAdditionalPrintArea(side, otherAreas);
    commit(preset);
  });

  function point(event) {
    const p = svg.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }

  svg.addEventListener('pointerdown', (event) => {
    const target = event.target.closest('[data-print-resize], [data-pick-print], #print-area-hit, #print-area');
    if (!target || drag || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    if (Object.values(fields).includes(document.activeElement)) document.activeElement.blur();
    if (target.dataset.pickPrint !== undefined) selectArea(Number(target.dataset.pickPrint));
    const corner = target.dataset.printResize || null;
    drag = { pointerId: event.pointerId, origin: point(event), area: activeArea(), corner };
    (corner ? target : hit).focus({ preventScroll: true });
    svg.setPointerCapture(event.pointerId);
    svg.classList.add('is-editing');
    status.setAttribute('aria-live', 'off');
  });
  svg.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    const current = point(event);
    const dx = (current.x - drag.origin.x) / printScale;
    const dy = (current.y - drag.origin.y) / printScale;
    commit(drag.corner
      ? resizePrintAreaFromCorner(drag.area, drag.corner, dx, dy)
      : constrainPrintArea({ ...drag.area, offsetXMm: drag.area.offsetXMm + dx, topMm: drag.area.topMm + dy }, activeArea()));
  });

  function finishDrag(event) {
    if (!drag || (event && event.pointerId !== drag.pointerId)) return;
    const { pointerId } = drag;
    drag = null;
    if (svg.hasPointerCapture(pointerId)) svg.releasePointerCapture(pointerId);
    svg.classList.remove('is-editing');
    status.setAttribute('aria-live', 'polite');
    renderSheet();
  }
  svg.addEventListener('pointerup', finishDrag);
  svg.addEventListener('pointercancel', finishDrag);
  svg.addEventListener('lostpointercapture', finishDrag);
  svg.addEventListener('keydown', (event) => {
    const target = event.target.closest('[data-print-resize], #print-area-hit');
    const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!target || !delta || drag) return;
    event.preventDefault();
    const area = activeArea();
    const step = event.shiftKey ? 10 : 1;
    const [dx, dy] = delta.map(value => value * step);
    commit(target.dataset.printResize
      ? resizePrintAreaFromCorner(area, target.dataset.printResize, dx, dy)
      : constrainPrintArea({ ...area, offsetXMm: area.offsetXMm + dx, topMm: area.topMm + dy }, area));
  });

  renderSide();
  return {
    getSelection() {
      const areas = allAreas().map(area => ({ ...area }));
      return areas.length ? { areas, methodId } : null;
    },
  };
}
