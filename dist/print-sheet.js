import { formatCentimetres, getCustomPrintLayout, printColors, printShapeAttributes, printSideLabels, shirtOutline } from './print-layout.js?v=20261105-layout1';

export function printAreaGraphic(area, index) {
  const bounds = printShapeAttributes(area);
  const attributes = Object.entries(bounds)
    .map(([name, value]) => `${name}="${Math.round(value * 1000) / 1000}"`)
    .join(' ');
  const color = printColors[index];
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  return `<rect ${attributes} fill="${color}" fill-opacity=".22" stroke="${color}" stroke-width="2" stroke-dasharray="6 4"/>
    <circle cx="${x}" cy="${y}" r="13" fill="${color}"/>
    <text x="${x}" y="${y + 5}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#fff">${index + 1}</text>`;
}

export function createPrintSheetSvg(areas) {
  const front = areas.filter(area => area.side === 'front');
  const back = areas.filter(area => area.side === 'back');
  const height = 616 + 34 * Math.max(1, front.length, back.length);

  function panel(side, prints, x) {
    const legend = prints.map((area, index) => {
      const layout = getCustomPrintLayout(area);
      const y = 582 + index * 34;
      return `<circle cx="${x + 46}" cy="${y - 6}" r="11" fill="${printColors[index]}"/>
        <text x="${x + 46}" y="${y - 1}" text-anchor="middle" font-size="14" font-weight="bold" fill="#fff">${index + 1}</text>
        <text x="${x + 68}" y="${y}" font-size="19">${formatCentimetres(layout.widthMm)} × ${formatCentimetres(layout.heightMm)} см · ≈ ${layout.formatId}</text>`;
    }).join('');
    const neckline = side === 'front'
      ? 'M222 62 C235 99 264 115 300 115 C336 115 365 99 378 62'
      : 'M223 62 Q300 100 377 62';
    return `<g>
      <rect x="${x}" y="102" width="556" height="${height - 134}" rx="10" fill="#fdfaf4" stroke="#dfd1c2"/>
      <text x="${x + 34}" y="149" font-size="27" font-weight="bold">${printSideLabels[side]}</text>
      <g transform="translate(${x + 44} 148) scale(.78)">
        <path d="${shirtOutline(side)}" fill="#f4eee2" stroke="#51483d" stroke-width="2"/>
        <path d="${neckline} M145 494H455 M58 206 121 243 M479 243 542 206" fill="none" stroke="#ab9d8e" stroke-width="1.2"/>
        <path d="M300 120V494" fill="none" stroke="#c9bcac" stroke-dasharray="4 6"/>
        ${prints.map(printAreaGraphic).join('')}
      </g>
      ${legend || `<text x="${x + 34}" y="582" font-size="19" fill="#796b60">Без принтов</text>`}
    </g>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}">
    <title>Схема нанесения на футболку</title>
    <rect width="1200" height="${height}" fill="#eee1d4"/>
    <g font-family="Arial, sans-serif" fill="#252521">
      <text x="32" y="36" font-size="14" font-weight="bold" letter-spacing="3">ALFEROV ART STUDIO</text>
      <text x="32" y="78" font-size="33" font-weight="bold">Схема нанесения</text>
      ${panel('front', front, 32)}
      ${panel('back', back, 612)}
    </g>
  </svg>`;
}

export function printSheetSource(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export async function createPrintSheetPng(source) {
  const image = new Image();
  image.src = source;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Не удалось подготовить изображение.');
  context.drawImage(image, 0, 0);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Не удалось сохранить изображение.');
  return new File([blob], 'alferov-print-layout.png', { type: 'image/png' });
}
