export const printFormats = [
  { id: 'A7', widthMm: 74, heightMm: 105 },
  { id: 'A6', widthMm: 105, heightMm: 148 },
  { id: 'A5', widthMm: 148, heightMm: 210 },
  { id: 'A4', widthMm: 210, heightMm: 297 },
  { id: 'A3', widthMm: 297, heightMm: 420 },
  { id: 'A3+', widthMm: 329, heightMm: 483 },
];
export const printLimits = { shortMm: 329, longMm: 483, minMm: 1 };
export const printShapes = ['rectangle', 'circle', 'ellipse'];
export const printScale = 0.6;
export const garmentOrigin = { x: 300, y: 60 };
const epsilon = 1e-7;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export const formatCentimetres = (mm) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(mm / 10);

export function getPrintPreview(formatId, side = 'front', orientation = 'portrait') {
  const format = printFormats.find((item) => item.id === formatId);
  if (!format) throw new Error('Неизвестный формат');
  if (!['front', 'back'].includes(side)) throw new Error('Неизвестная сторона');
  if (!['portrait', 'landscape'].includes(orientation)) throw new Error('Неизвестная ориентация');
  const widthMm = orientation === 'portrait' ? format.widthMm : format.heightMm;
  const heightMm = orientation === 'portrait' ? format.heightMm : format.widthMm;
  return { formatId, side, orientation, widthMm, heightMm, width: widthMm * printScale, height: heightMm * printScale, x: 300 - widthMm * printScale / 2, y: side === 'front' ? 166 : 150 };
}

export function getNearestPrintFormat(widthMm, heightMm) {
  return printFormats.reduce((best, format) => {
    const distance = Math.min((widthMm - format.widthMm) ** 2 + (heightMm - format.heightMm) ** 2, (heightMm - format.widthMm) ** 2 + (widthMm - format.heightMm) ** 2);
    return !best || distance < best.distance ? { ...format, distance } : best;
  }, null);
}

export function toSvgPrintArea(area) {
  const width = area.widthMm * printScale;
  const height = area.heightMm * printScale;
  return { width, height, x: garmentOrigin.x + area.offsetXMm * printScale - width / 2, y: garmentOrigin.y + area.topMm * printScale };
}

// The polygon follows the same neckline, sleeves and hem as the rendered SVG.
// Sampling the Bezier neckline keeps the geometry independent of browser APIs.
function garmentPolygon(side) {
  const points = [[228, 60]];
  if (side === 'front') {
    for (const control of [[[228,60],[240,91],[265,107],[300,107]], [[300,107],[335,107],[360,91],[372,60]]]) {
      for (let i = 1; i <= 20; i++) {
        const t = i / 20, u = 1 - t;
        points.push([0,1].map((axis) => u ** 3 * control[0][axis] + 3 * u ** 2 * t * control[1][axis] + 3 * u * t ** 2 * control[2][axis] + t ** 3 * control[3][axis]));
      }
    }
  } else {
    for (let i = 1; i <= 30; i++) {
      const t = i / 30, u = 1 - t;
      points.push([u ** 2 * 228 + 2 * u * t * 300 + t ** 2 * 372, u ** 2 * 60 + 2 * u * t * 88 + t ** 2 * 60]);
    }
  }
  return points.concat([[448,79],[552,211],[480,253],[462,222],[462,504],[138,504],[138,222],[120,253],[48,211],[152,79]]);
}
const polygons = { front: garmentPolygon('front'), back: garmentPolygon('back') };

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[j], [bx, by] = points[i];
    const cross = (x - ax) * (by - ay) - (y - ay) * (bx - ax);
    if (Math.abs(cross) < epsilon && x >= Math.min(ax,bx) - epsilon && x <= Math.max(ax,bx) + epsilon && y >= Math.min(ay,by) - epsilon && y <= Math.max(ay,by) + epsilon) return true;
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

function segmentEntersRectangle(a, b, box) {
  let low = 0, high = 1;
  for (const [axis, min, max] of [[0,box.x + epsilon,box.x + box.width - epsilon], [1,box.y + epsilon,box.y + box.height - epsilon]]) {
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < epsilon) {
      if (a[axis] < min || a[axis] > max) return false;
    } else {
      const t1 = (min - a[axis]) / delta, t2 = (max - a[axis]) / delta;
      low = Math.max(low, Math.min(t1,t2));
      high = Math.min(high, Math.max(t1,t2));
      if (low > high) return false;
    }
  }
  return low <= high;
}

function segmentEntersEllipse(a, b, box) {
  const rx = box.width / 2, ry = box.height / 2;
  const ax = (a[0] - box.x - rx) / rx, ay = (a[1] - box.y - ry) / ry;
  const dx = (b[0] - a[0]) / rx, dy = (b[1] - a[1]) / ry;
  const length = dx * dx + dy * dy;
  const t = length ? clamp(-(ax * dx + ay * dy) / length, 0, 1) : 0;
  return (ax + t * dx) ** 2 + (ay + t * dy) ** 2 < 1 - epsilon;
}

export function isPrintAreaAllowed(area) {
  if (!area || !polygons[area.side] || !printShapes.includes(area.shape)) return false;
  const { widthMm: w, heightMm: h, offsetXMm: x, topMm: y } = area;
  if (![w,h,x,y].every(Number.isFinite) || Math.min(w,h) < printLimits.minMm || Math.min(w,h) > printLimits.shortMm || Math.max(w,h) > printLimits.longMm) return false;
  if (area.shape === 'circle' && Math.abs(w - h) > epsilon) return false;
  const box = toSvgPrintArea(area), polygon = polygons[area.side];
  if (!pointInPolygon(box.x + box.width / 2, box.y + box.height / 2, polygon)) return false;
  const enters = area.shape === 'rectangle' ? segmentEntersRectangle : segmentEntersEllipse;
  return !polygon.some((point, index) => enters(point, polygon[(index + 1) % polygon.length], box));
}

function boundedDimensions(width, height, shape) {
  let w = Math.max(printLimits.minMm, Math.round(width));
  let h = Math.max(printLimits.minMm, Math.round(height));
  if (shape === 'circle') w = h = Math.min(w, printLimits.shortMm);
  else if (w >= h) { w = Math.min(w, printLimits.longMm); h = Math.min(h, printLimits.shortMm); }
  else { w = Math.min(w, printLimits.shortMm); h = Math.min(h, printLimits.longMm); }
  return { widthMm: w, heightMm: h };
}

function interpolate(start, target) {
  let low = 0, high = 1, best = start;
  for (let i = 0; i < 25; i++) {
    const t = (low + high) / 2;
    const candidate = { side: target.side, shape: target.shape };
    for (const key of ['widthMm','heightMm','offsetXMm','topMm']) candidate[key] = Math.round(start[key] + (target[key] - start[key]) * t);
    if (isPrintAreaAllowed(candidate)) { low = t; best = candidate; } else high = t;
  }
  return best;
}

export function constrainPrintArea(candidate, previous = null) {
  const side = candidate.side ?? previous?.side ?? 'front';
  const shape = candidate.shape ?? previous?.shape ?? 'rectangle';
  if (!polygons[side] || !printShapes.includes(shape)) throw new Error('Неизвестная сторона или форма примерки.');
  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const dimensions = boundedDimensions(finite(candidate.widthMm, previous?.widthMm ?? 210), finite(candidate.heightMm, previous?.heightMm ?? 297), shape);
  const target = { side, shape, ...dimensions, offsetXMm: Math.round(finite(candidate.offsetXMm, previous?.offsetXMm ?? 0)), topMm: Math.round(finite(candidate.topMm, previous?.topMm ?? 177)) };
  target.offsetXMm = clamp(target.offsetXMm, Math.ceil(-420 + target.widthMm / 2), Math.floor(420 - target.widthMm / 2));
  target.topMm = clamp(target.topMm, 0, 740 - target.heightMm);
  if (isPrintAreaAllowed(target)) return target;
  let start = previous && previous.side === side && previous.shape === shape && isPrintAreaAllowed(previous) ? previous : null;
  if (!start) {
    start = { ...target, offsetXMm: clamp(target.offsetXMm, Math.ceil(-270 + target.widthMm / 2), Math.floor(270 - target.widthMm / 2)), topMm: clamp(target.topMm, side === 'front' ? 100 : 40, 740 - target.heightMm) };
  }
  const candidates = [interpolate(start, target)];
  if (start.widthMm === target.widthMm && start.heightMm === target.heightMm) {
    for (const axes of [['offsetXMm','topMm'], ['topMm','offsetXMm']]) {
      let current = start;
      for (const axis of axes) {
        const next = { ...current, [axis]: target[axis] };
        current = isPrintAreaAllowed(next) ? next : interpolate(current, next);
      }
      candidates.push(current);
    }
  }
  const distance = (area) => ['widthMm','heightMm','offsetXMm','topMm'].reduce((sum,key) => sum + (area[key] - target[key]) ** 2, 0);
  return candidates.reduce((best, area) => distance(area) < distance(best) ? area : best);
}

export function createPresetPrintArea(formatId = 'A4', side = 'front', orientation = 'portrait', shape = 'rectangle') {
  const preset = getPrintPreview(formatId, side, orientation);
  const dimensions = boundedDimensions(shape === 'circle' ? Math.min(preset.widthMm,preset.heightMm) : preset.widthMm, preset.heightMm, shape);
  return constrainPrintArea({ ...dimensions, side, shape, offsetXMm: 0, topMm: (preset.y - garmentOrigin.y) / printScale + (preset.heightMm - dimensions.heightMm) / 2 });
}

export function resizePrintAreaAroundCenter(area, widthMm, heightMm) {
  const dimensions = boundedDimensions(widthMm, heightMm, area.shape);
  return constrainPrintArea({ ...area, ...dimensions, topMm: area.topMm + (area.heightMm - dimensions.heightMm) / 2 }, area);
}

export function resizePrintAreaFromCorner(area, corner, dxMm, dyMm) {
  if (!['nw','ne','sw','se'].includes(corner)) throw new Error('Неизвестный угол.');
  const west = corner.includes('w'), north = corner.includes('n');
  let w = Math.max(1, area.widthMm + (west ? -dxMm : dxMm));
  let h = Math.max(1, area.heightMm + (north ? -dyMm : dyMm));
  if (area.shape === 'circle') {
    const dw = west ? -dxMm : dxMm, dh = north ? -dyMm : dyMm;
    w = h = Math.max(1, area.widthMm + (Math.abs(dw) >= Math.abs(dh) ? dw : dh));
  }
  const dimensions = boundedDimensions(w,h,area.shape);
  const left = area.offsetXMm - area.widthMm / 2 + (west ? area.widthMm - dimensions.widthMm : 0);
  return constrainPrintArea({ ...area, ...dimensions, offsetXMm: left + dimensions.widthMm / 2, topMm: area.topMm + (north ? area.heightMm - dimensions.heightMm : 0) }, area);
}

export function getCustomPrintLayout(area) {
  if (!isPrintAreaAllowed(area)) throw new Error('Размер или положение принта выходит за допустимые границы.');
  return { ...area, ...toSvgPrintArea(area), formatId: getNearestPrintFormat(area.widthMm,area.heightMm).id, orientation: area.widthMm > area.heightMm ? 'landscape' : 'portrait' };
}
