import { studio } from './catalog.js';
import { applicationMethods } from './methods.js';
import { prepareProjectRequest, describePrintSelection } from './project.js?v=20261103-editor1';
import { bindPhoneInput } from './phone-input.js';

export function initProjectForm({ getPrintSelection } = {}) {
  const dialog = document.querySelector('#project-dialog');
  const $ = (selector) => dialog.querySelector(selector);
  const form = $('#project-form');
  const fields = Object.fromEntries(['idea', 'garment', 'quantity', 'method', 'design', 'deadline', 'phone', 'telegram'].map((name) => [name, $(`#project-${name}`)]));
  let selection = null;
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
  function open(trigger) {
    if (dialog.open) return;
    lastTrigger = trigger;
    form.reset();
    clearError();
    selection = trigger.dataset.projectSource === 'preview' ? getPrintSelection?.() ?? null : null;
    fields.method.value = selection?.methodId || '';
    $('#project-print-summary').hidden = !selection;
    $('#project-print-summary').textContent = selection ? describePrintSelection(selection).join('\n') : '';
    $('#project-message').value = '';
    $('#project-send').href = `https://t.me/${studio.telegram}`;
    $('#project-copy-status').textContent = '';
    showReady(false);
    document.body.classList.add('modal-open');
    dialog.showModal();
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
    $('#project-print-summary').textContent = '';
    $('#project-message').value = '';
    $('#project-send').href = `https://t.me/${studio.telegram}`;
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
      $('#project-send').href = request.url;
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
