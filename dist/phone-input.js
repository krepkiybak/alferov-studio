import { formatPhone } from './order.js';

export function bindPhoneInput(input, onChange = () => {}) {
  function format() {
    const raw = input.value;
    const caret = input.selectionStart ?? raw.length;
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
    input.value = formatted;
    input.setSelectionRange(nextCaret, nextCaret);
  }
  input.addEventListener('focus', () => {
    if (!input.value) {
      input.value = '+7 ';
      input.select();
    }
  });
  input.addEventListener('blur', () => { if (['+', '+7'].includes(input.value.trim())) input.value = ''; });
  input.addEventListener('input', (event) => {
    if (!event.isComposing) format();
    onChange();
  });
  input.addEventListener('beforeinput', (event) => {
    const backward = event.inputType === 'deleteContentBackward';
    const forward = event.inputType === 'deleteContentForward';
    const start = input.selectionStart;
    if ((!backward && !forward) || start === null || start !== input.selectionEnd) return;
    let index = backward ? start - 1 : start;
    if (input.value[index] !== ' ') return;
    while (input.value[index] === ' ') index += backward ? -1 : 1;
    if (index < 1 || index >= input.value.length) return;
    event.preventDefault();
    input.setRangeText('', index, index + 1, 'start');
    format();
    onChange();
  });
}
