const shortWords = /(?<![\p{L}\p{N}_])(?:а|в|во|и|к|ко|о|об|обо|от|с|со|у|я|до|за|из|на|не|но|ни|же|ли|по|при|для|без|под|над|как|что)[ \t]+(?=\S)/giu;

export function keepShortWords(text) {
  return String(text)
    .replace(shortWords, (word) => word.replace(/[ \t]+$/, '\u00a0'))
    .replace(/(\d(?:[.,]\d+)?) (?=(?:см|мм|шт\.|₽)(?:\s|$|[.,;:]))/gu, '$1\u00a0');
}

export function startTypography(root = document.body) {
  const excluded = 'script,style,textarea,input,pre,code,svg,[data-no-typeset]';
  function formatNode(node) {
    if (!node.parentElement || node.parentElement.closest(excluded)) return;
    const formatted = keepShortWords(node.nodeValue);
    if (formatted !== node.nodeValue) node.nodeValue = formatted;
  }
  function formatTree(node) {
    if (node.nodeType === 3) return formatNode(node);
    if (node.nodeType !== 1 || node.closest(excluded)) return;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) formatNode(walker.currentNode);
  }
  formatTree(root);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') formatNode(record.target);
      else for (const node of record.addedNodes) formatTree(node);
    }
  });
  observer.observe(root, { childList: true, characterData: true, subtree: true });
  return observer;
}
