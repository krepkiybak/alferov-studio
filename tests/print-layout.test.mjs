import test from 'node:test';
import assert from 'node:assert/strict';
import { createPresetPrintArea, constrainPrintArea, resizePrintAreaAroundCenter, resizePrintAreaFromCorner, isPrintAreaAllowed, getCustomPrintLayout, getNearestPrintFormat, toSvgPrintArea } from '../dist/print-layout.js';
import { prepareProjectRequest } from '../dist/project.js';

test('A3+ limits hold in both orientations and circles preserve a single diameter', () => {
  const base = createPresetPrintArea();
  const portrait = constrainPrintArea({ ...base, widthMm: 500, heightMm: 900 });
  const landscape = constrainPrintArea({ ...base, widthMm: 900, heightMm: 500 });
  const circle = constrainPrintArea({ ...base, shape: 'circle', widthMm: 900, heightMm: 20 });
  assert.deepEqual([portrait.widthMm,portrait.heightMm], [329,483]);
  assert.deepEqual([landscape.widthMm,landscape.heightMm], [483,329]);
  assert.deepEqual([circle.widthMm,circle.heightMm], [329,329]);
  for (const area of [portrait,landscape,circle]) assert.ok(isPrintAreaAllowed(area));
  const smaller = resizePrintAreaFromCorner(circle,'se',-50,0);
  assert.equal(smaller.widthMm,279);
  assert.equal(smaller.heightMm,279);
});

test('Placement respects the neckline and hem while allowing small prints on a sleeve', () => {
  const base = createPresetPrintArea();
  assert.equal(isPrintAreaAllowed({ ...base, widthMm: 80, heightMm: 40, offsetXMm: 0, topMm: 0 }), false);
  assert.equal(isPrintAreaAllowed({ ...base, topMm: 700 }), false);
  const sleeve = { ...base, widthMm: 60, heightMm: 40, offsetXMm: -333, topMm: 230 };
  assert.ok(isPrintAreaAllowed(sleeve));
  assert.ok(toSvgPrintArea(sleeve).x < 138);
  const nearShoulder = { ...base, widthMm: 96, heightMm: 66, offsetXMm: -325, topMm: 170 };
  assert.equal(isPrintAreaAllowed(nearShoulder),false);
  assert.ok(isPrintAreaAllowed({ ...nearShoulder, shape: 'ellipse' }));
});

test('Dragging and stretching clamp to valid cloth rather than extending past the edge', () => {
  for (const shape of ['rectangle','circle','ellipse']) for (const side of ['front','back']) {
    let area = createPresetPrintArea('A6',side,'portrait',shape);
    for (const [x,y] of [[-500,-100],[-333,230],[500,50],[20,900],[-200,0],[0,120]]) {
      area = constrainPrintArea({ ...area, offsetXMm:x, topMm:y },area);
      assert.ok(isPrintAreaAllowed(area));
      for (const corner of ['nw','ne','sw','se']) {
        const resized = resizePrintAreaFromCorner(area,corner,600,-500);
        assert.ok(isPrintAreaAllowed(resized));
        assert.ok(Math.max(resized.widthMm,resized.heightMm)<=483);
        assert.ok(Math.min(resized.widthMm,resized.heightMm)<=329);
      }
    }
  }
});

test('A free resize preserves the opposite corner when it fits, and scale keeps the centre', () => {
  const base = createPresetPrintArea();
  const next = resizePrintAreaFromCorner(base,'se',20,30);
  assert.equal(next.widthMm,base.widthMm+20);
  assert.equal(next.heightMm,base.heightMm+30);
  assert.equal(next.offsetXMm-next.widthMm/2,base.offsetXMm-base.widthMm/2);
  assert.equal(next.topMm,base.topMm);
  const scaled = resizePrintAreaAroundCenter(base,180,240);
  assert.ok(Math.abs(scaled.topMm+scaled.heightMm/2-base.topMm-base.heightMm/2)<=0.5);
  assert.equal(scaled.offsetXMm,base.offsetXMm);
});

test('Nearest formats use actual dimensions and ignore a quarter turn', () => {
  assert.equal(getNearestPrintFormat(200,300).id,'A4');
  assert.equal(getNearestPrintFormat(300,200).id,'A4');
  assert.equal(getNearestPrintFormat(74,105).id,'A7');
  assert.equal(getCustomPrintLayout(createPresetPrintArea('A3+')).formatId,'A3+');
});

test('Telegram records exact size and position but never adds the chosen preview shape', () => {
  const answers = { idea:'Логотип для команды', phone:'89991234567', telegram:'@test_person', methodId:'dtf' };
  const selection = { side:'back', shape:'rectangle', widthMm:100, heightMm:100, offsetXMm:-32, topMm:150 };
  const results = ['rectangle','circle','ellipse'].map(shape=>prepareProjectRequest({ ...answers, selection:{ ...selection,shape } }));
  for (const result of results) {
    assert.equal(result.text,results[0].text);
    assert.ok(result.text.includes('Размер принта: 10 × 10 см'));
    assert.ok(result.text.includes('Ближайший формат: примерно A7'));
    assert.ok(result.text.includes('3,2 см левее середины'));
    assert.ok(result.text.includes('15 см от верхнего края'));
    assert.ok(result.text.includes('на спине'));
    assert.ok(!/прямоугольник|круг|овал|rectangle|circle|ellipse/i.test(result.text));
    assert.equal(new URL(result.url).searchParams.get('text'),result.text);
  }
  for (const selection of [{ ...createPresetPrintArea(), widthMm:500 }, { ...createPresetPrintArea(), offsetXMm:900 }, { ...createPresetPrintArea(), topMm:NaN }]) assert.throws(()=>prepareProjectRequest({ ...answers,selection }));
});
