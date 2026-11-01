import { products, studio, formatPrice } from './catalog.js';
import { prepareOrder, normalizePhone, normalizeTelegram, formatPhone } from './order.js';

const $ = (selector) => document.querySelector(selector);
const dialog = $('#product-dialog');
const lightbox = $('#image-dialog');
let selectedProduct;
let selectedSize = '';
let lastTrigger;

$('#product-grid').innerHTML = products.map((product, index) => `
  <article class="product-card">
    <button type="button" class="product-card-image" data-product="${product.id}" aria-label="Посмотреть ${product.name}, ${product.color.toLowerCase()} цвет">
      <span class="product-number">0${index + 1} / 03</span>
      <img src="${product.image}" alt="Футболка ${product.name}, ${product.color.toLowerCase()} цвет" width="${product.id === 'leviosa' ? 1199 : 1440}" height="${product.id === 'leviosa' ? 1312 : 960}" loading="lazy">
      <span class="product-view-label">Рассмотреть поближе <span aria-hidden="true">↗</span></span>
    </button>
    <div class="product-card-text">
      <div class="product-title-row"><h3><button type="button" data-product="${product.id}">${product.name}</button></h3><span class="product-card-price">${formatPrice(product.price)}</span></div>
      <div class="color-row"><span class="color-dot" style="background:${product.colorHex}" aria-hidden="true"></span>${product.color}</div>
      <div class="product-card-bottom"><span class="product-sizes">S · M · L · XL · XXL</span><button class="product-order-link" type="button" data-product="${product.id}">Выбрать <span aria-hidden="true">↗</span></button></div>
    </div>
  </article>`).join('');

$('#size-options').innerHTML = studio.sizes.map((size) => `<button class="size-button" type="button" data-size="${size}" aria-pressed="false">${size}</button>`).join('');

function setStep(step) {
  $('#product-choice').hidden = step !== 'product';
  $('#order-step').hidden = step !== 'order';
  $('#ready-step').hidden = step !== 'ready';
  dialog.classList.toggle('in-order', step !== 'product');
  dialog.scrollTop = 0;
  // Keep a visible accessible dialog name on every step.
  dialog.setAttribute('aria-labelledby', step === 'product' ? 'product-title' : step === 'order' ? 'order-heading' : 'ready-heading');
}
$('#order-step .order-title').id = 'order-heading';
$('#ready-step h2').id = 'ready-heading';

function setGallery(view) {
  const detail = view === 'detail';
  $('#gallery-main').classList.toggle('detail', detail);
  $('#gallery-label').textContent = detail ? 'ДЕТАЛЬ ПРИНТА' : 'ОБЩИЙ ВИД';
  $('#product-image').alt = detail ? `Принт крупно: ${selectedProduct.name}` : `Футболка ${selectedProduct.name}, ${selectedProduct.color.toLowerCase()} цвет`;
  document.querySelectorAll('[data-view]').forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function openProduct(id, trigger) {
  selectedProduct = products.find((product) => product.id === id);
  if (!selectedProduct) return;
  lastTrigger = trigger;
  selectedSize = '';
  $('#product-title').textContent = selectedProduct.name;
  $('#product-tag').textContent = selectedProduct.tag.toUpperCase();
  $('#product-color').replaceChildren();
  const dot = document.createElement('span');
  dot.className = 'color-dot';
  dot.style.background = selectedProduct.colorHex;
  dot.setAttribute('aria-hidden', 'true');
  $('#product-color').append(dot, selectedProduct.color);
  $('#product-price').textContent = formatPrice(selectedProduct.price);
  $('#product-description').textContent = selectedProduct.description;
  $('#product-image').src = selectedProduct.image;
  document.querySelectorAll('.gallery-thumb img').forEach((img) => { img.src = selectedProduct.image; });
  $('.gallery-column').style.setProperty('--detail-position', selectedProduct.detailPosition);
  $('.gallery-column').style.setProperty('--detail-scale', selectedProduct.detailScale);
  document.querySelectorAll('[data-size]').forEach((button) => button.setAttribute('aria-pressed', 'false'));
  $('#size-error').textContent = '';
  $('#size-help').hidden = true;
  $('#size-help-toggle').setAttribute('aria-expanded', 'false');
  clearFormError();
  // Customer contacts stay in this in-memory form only while the dialog is open.
  $('#order-form').reset();
  $('#order-message').value = '';
  $('#send-telegram').href = `https://t.me/${studio.telegram}`;
  $('.message-fallback').open = false;
  setGallery('full');
  setStep('product');
  document.body.classList.add('modal-open');
  dialog.showModal();
  dialog.scrollTop = 0;
}

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-product]');
  if (trigger) openProduct(trigger.dataset.product, trigger);
});

document.querySelectorAll('[data-size]').forEach((button) => button.addEventListener('click', () => {
  selectedSize = button.dataset.size;
  document.querySelectorAll('[data-size]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  $('#size-error').textContent = '';
}));

document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => setGallery(button.dataset.view)));
$('#size-help-toggle').addEventListener('click', () => {
  const open = $('#size-help').hidden;
  $('#size-help').hidden = !open;
  $('#size-help-toggle').setAttribute('aria-expanded', String(open));
});
$('#gallery-expand').addEventListener('click', () => {
  $('#lightbox-image').src = selectedProduct.image;
  $('#lightbox-image').alt = `${selectedProduct.name}, ${selectedProduct.color.toLowerCase()} цвет — полное фото`;
  lightbox.showModal();
});

for (const current of [dialog, lightbox]) {
  current.querySelector('[data-close]').addEventListener('click', () => current.close());
  current.addEventListener('click', (event) => {
    if (event.target !== current) return;
    const rect = current.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) current.close();
  });
}
dialog.addEventListener('close', () => {
  if (lightbox.open) lightbox.close();
  document.body.classList.remove('modal-open');
  $('#order-form').reset();
  $('#order-message').value = '';
  $('#send-telegram').href = `https://t.me/${studio.telegram}`;
  lastTrigger?.focus({ preventScroll: true });
});

$('#start-order').addEventListener('click', () => {
  if (!selectedSize) {
    $('#size-error').textContent = 'Выберите размер, чтобы продолжить.';
    $('.size-button').focus({ preventScroll: true });
    return;
  }
  const strong = document.createElement('strong');
  strong.textContent = selectedProduct.name;
  const details = document.createElement('span');
  details.textContent = `${selectedProduct.color} · ${selectedSize} · ${formatPrice(selectedProduct.price)}`;
  $('#order-summary').replaceChildren(strong, details);
  setStep('order');
  $('#phone').focus({ preventScroll: true });
});
$('#back-to-product').addEventListener('click', () => {
  setStep('product');
  $('#start-order').focus({ preventScroll: true });
});
$('#edit-order').addEventListener('click', () => {
  setStep('order');
  $('#phone').focus({ preventScroll: true });
});

function clearFormError() {
  $('#form-error').textContent = '';
  $('#phone').removeAttribute('aria-invalid');
  $('#telegram').removeAttribute('aria-invalid');
}
const phoneInput = $('#phone');
function formatPhoneField() {
  const raw = phoneInput.value;
  const caret = phoneInput.selectionStart ?? raw.length;
  const formatted = formatPhone(raw);
  const addedDigits = Math.max(0, formatted.replace(/\D/g, '').length - raw.replace(/\D/g, '').length);
  const digitsBeforeCaret = raw.slice(0, caret).replace(/\D/g, '').length + addedDigits;
  let nextCaret = formatted.length;
  if (caret < raw.length) {
    let digitsSeen = 0;
    nextCaret = formatted.startsWith('+') ? 1 : 0;
    for (let index = 0; index < formatted.length && digitsSeen < digitsBeforeCaret; index++) {
      if (/\d/.test(formatted[index])) digitsSeen++;
      nextCaret = index + 1;
    }
  }
  phoneInput.value = formatted;
  phoneInput.setSelectionRange(nextCaret, nextCaret);
}
phoneInput.addEventListener('focus', () => {
  if (!phoneInput.value) phoneInput.value = '+7 ';
});
phoneInput.addEventListener('blur', () => {
  if (['+', '+7'].includes(phoneInput.value.trim())) phoneInput.value = '';
});
phoneInput.addEventListener('input', (event) => {
  if (!event.isComposing) formatPhoneField();
  clearFormError();
});
// Deleting a separator also deletes the adjacent digit, so Backspace and Delete
// keep working naturally when the customer edits the middle of a number.
phoneInput.addEventListener('beforeinput', (event) => {
  const backward = event.inputType === 'deleteContentBackward';
  const forward = event.inputType === 'deleteContentForward';
  const start = phoneInput.selectionStart;
  if ((!backward && !forward) || start === null || start !== phoneInput.selectionEnd) return;
  let index = backward ? start - 1 : start;
  if (phoneInput.value[index] !== ' ') return;
  while (phoneInput.value[index] === ' ') index += backward ? -1 : 1;
  if (index < 1 || index >= phoneInput.value.length) return;
  event.preventDefault();
  phoneInput.setRangeText('', index, index + 1, 'start');
  formatPhoneField();
  clearFormError();
});
$('#telegram').addEventListener('input', clearFormError);
$('#order-form').addEventListener('submit', (event) => {
  event.preventDefault();
  clearFormError();
  try {
    const order = prepareOrder({
      productId: selectedProduct.id, size: selectedSize,
      phone: $('#phone').value, telegram: $('#telegram').value, comment: $('#comment').value,
    });
    $('#order-message').value = order.text;
    $('#send-telegram').href = order.url;
    $('#copy-status').textContent = '';
    setStep('ready');
    $('#send-telegram').focus({ preventScroll: true });
  } catch (error) {
    $('#form-error').textContent = error.message;
    const invalid = !normalizePhone($('#phone').value) ? $('#phone') : !normalizeTelegram($('#telegram').value) ? $('#telegram') : null;
    invalid?.setAttribute('aria-invalid', 'true');
    invalid?.focus({ preventScroll: true });
  }
});
$('#copy-order').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('#order-message').value);
    $('#copy-status').textContent = 'Готово! Вставьте сообщение в чат @ig_alferov.';
  } catch {
    $('#order-message').focus();
    $('#order-message').select();
    $('#copy-status').textContent = 'Текст выделен. Скопируйте его через меню или Ctrl+C.';
  }
});

$('.menu-button').addEventListener('click', () => {
  const open = $('.menu-button').getAttribute('aria-expanded') !== 'true';
  $('.menu-button').setAttribute('aria-expanded', String(open));
  $('.menu-button').setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  $('#mobile-nav').hidden = !open;
});
$('#mobile-nav').addEventListener('click', (event) => {
  if (event.target.closest('a')) {
    $('#mobile-nav').hidden = true;
    $('.menu-button').setAttribute('aria-expanded', 'false');
    $('.menu-button').setAttribute('aria-label', 'Открыть меню');
  }
});
$('#year').textContent = new Date().getFullYear();
