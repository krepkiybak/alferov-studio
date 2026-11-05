import { studio } from './catalog.js';
import { applicationMethods } from './methods.js';
import { prepareProjectRequest, describePrintSelection } from './project.js?v=20261105-layout1';
import { bindPhoneInput } from './phone-input.js';
import { createPrintSheetPng, createPrintSheetSvg, printSheetSource } from './print-sheet.js?v=20261105-layout1';

export function initProjectForm({ getPrintSelection } = {}) {
  const dialog = document.querySelector('#project-dialog');
  const $ = (selector) => dialog.querySelector(selector);
  const form = $('#project-form');
  const fields = Object.fromEntries(['idea', 'garment', 'quantity', 'method', 'design', 'deadline', 'phone', 'telegram'].map((name) => [name, $(`#project-${name}`)]));
  const sheetImage = $('#project-sheet-image');
  const sheetDownload = $('#project-download-sheet');
  const sheetShare = $('#project-share-sheet');
  const sheetCopy = $('#project-copy-sheet');
  const sheetStatus = $('#project-sheet-status');
  const chatUrl = `https://t.me/${studio.telegram}`;
  const regularIntro = $('#project-ready-intro').textContent;
  let selection = null;
  let sheet = null;
  let lastTrigger = null;

  for (const method of applicationMethods) {
    const option = document.createElement('option');
    option.value = method.id;
    option.textContent = method.label;
    fields.method.append(option);
  }
  function clearError() {
    $('#project-error').textContent = '';
    for (const field of Object.values(fields)) field.removeAttribute('aria-invalid');
  }
  function showReady(ready) {
    $('#project-form-step').hidden = ready;
    $('#project-ready-step').hidden = !ready;
    dialog.setAttribute('aria-labelledby', ready ? 'project-ready-title' : 'project-title');
    dialog.scrollTop = 0;
  }
  function clearSheet() {
    if (sheet?.downloadUrl) URL.revokeObjectURL(sheet.downloadUrl);
    sheet = null;
    $('#project-sheet').hidden = true;
    sheetImage.removeAttribute('src');
    sheetDownload.removeAttribute('href');
    sheetDownload.hidden = true;
    sheetCopy.hidden = true;
    sheetShare.hidden = true;
    sheetStatus.textContent = '';
  }
  async function prepareSheet(areas) {
    const source = printSheetSource(createPrintSheetSvg(areas));
    const pending = { file: null, downloadUrl: null };
    sheet = pending;
    sheetImage.src = source;
    $('#project-sheet').hidden = false;
    sheetStatus.textContent = 'Готовим изображение…';
    try {
      const file = await createPrintSheetPng(source);
      if (sheet !== pending) return;
      pending.file = file;
      pending.downloadUrl = URL.createObjectURL(file);
      sheetDownload.href = pending.downloadUrl;
      sheetDownload.download = file.name;
      sheetCopy.hidden = !navigator.clipboard?.write || typeof ClipboardItem === 'undefined';
      sheetShare.hidden = !navigator.share || !navigator.canShare?.({ files: [file] });
      sheetStatus.textContent = sheetShare.hidden ? '' : `В меню «Поделиться» выберите Telegram и чат @${studio.telegram}.`;
    } catch {
      if (sheet !== pending) return;
      sheetDownload.href = source;
      sheetDownload.download = 'alferov-print-layout.svg';
      sheetStatus.textContent = 'Скачайте схему и прикрепите её в чате как файл.';
    }
    sheetDownload.hidden = false;
  }
  function open(trigger) {
    if (dialog.open) return;
    lastTrigger = trigger;
    form.reset();
    clearError();
    clearSheet();
    selection = trigger.dataset.projectSource === 'preview' ? getPrintSelection?.() ?? null : null;
    fields.method.value = selection?.methodId || '';
    $('#project-print-summary').hidden = !selection;
    $('#project-print-summary').textContent = selection ? describePrintSelection(selection).join('\n') : '';
    $('#project-message').value = '';
    $('#project-send').href = chatUrl;
    $('#project-copy-status').textContent = '';
    showReady(false);
    document.body.classList.add('modal-open');
    dialog.showModal();
    if (selection?.areas?.length) void prepareSheet(selection.areas);
    fields.idea.focus({ preventScroll: true });
    dialog.scrollTop = 0;
  }
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-open-project]');
    if (trigger) open(trigger);
  });
  $('[data-project-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    form.reset();
    selection = null;
    clearSheet();
    $('#project-print-summary').textContent = '';
    $('#project-message').value = '';
    $('#project-send').href = chatUrl;
    clearError();
    if (!document.querySelector('dialog[open]')) document.body.classList.remove('modal-open');
    lastTrigger?.focus({ preventScroll: true });
  });
  form.addEventListener('input', clearError);
  form.addEventListener('change', clearError);
  bindPhoneInput(fields.phone, clearError);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearError();
    try {
      const request = prepareProjectRequest({
        idea: fields.idea.value, garment: fields.garment.value, quantity: Number(fields.quantity.value),
        methodId: fields.method.value, design: fields.design.value, deadline: fields.deadline.value,
        phone: fields.phone.value, telegram: fields.telegram.value, selection,
      });
      $('#project-message').value = request.text;
      const hasDraftLink = request.url.length <= 8000;
      $('#project-send').href = hasDraftLink ? request.url : chatUrl;
      const intro = selection?.areas?.length
        ? `Прикрепите схему к сообщению в чате @${studio.telegram}. После отправки менеджер свяжется с вами.`
        : regularIntro;
      $('#project-ready-intro').textContent = intro + (hasDraftLink ? '' : ' Скопируйте текст запроса перед открытием чата.');
      $('#project-copy-status').textContent = '';
      showReady(true);
      $('#project-send').focus({ preventScroll: true });
    } catch (error) {
      $('#project-error').textContent = error.message;
      const field = fields[error.field];
      field?.setAttribute('aria-invalid', 'true');
      field?.focus({ preventScroll: true });
    }
  });
  $('#project-edit').addEventListener('click', () => {
    showReady(false);
    fields.idea.focus({ preventScroll: true });
  });
  sheetShare.addEventListener('click', async () => {
    const current = sheet;
    if (!current?.file) return;
    try {
      await navigator.share({ files: [current.file], text: $('#project-message').value });
    } catch (error) {
      if (sheet === current && error.name !== 'AbortError') {
        sheetStatus.textContent = 'Скачайте схему, чтобы прикрепить её в чате.';
      }
    }
  });
  sheetCopy.addEventListener('click', async () => {
    const current = sheet;
    if (!current?.file) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': current.file })]);
      if (sheet === current) sheetStatus.textContent = 'Схема скопирована. Вставьте её в чате Telegram.';
    } catch {
      if (sheet === current) sheetStatus.textContent = 'Скачайте схему, чтобы прикрепить её в чате.';
    }
  });
  $('#project-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('#project-message').value);
      $('#project-copy-status').textContent = 'Готово! Вставьте сообщение в чат @ig_alferov.';
    } catch {
      $('#project-message').focus();
      $('#project-message').select();
      $('#project-copy-status').textContent = 'Текст выделен. Скопируйте его через меню или Ctrl+C.';
    }
  });
}
