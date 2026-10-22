const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

// Exercise the real interface logic without a CDN or browser dependency.
let document;
function element(attrs = {}) {
  const handlers = {};
  return {
    attrs, dataset: {}, style: {}, hidden: false, textContent: '', offsetLeft: 5, offsetWidth: 90,
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener(type, fn) { (handlers[type] ||= []).push(fn); },
    fire(type, extra = {}) { for (const fn of handlers[type] || []) fn({ target: this, preventDefault() {}, ...extra }); },
    getAttribute(name) { return attrs[name]; }, setAttribute(name, value) { attrs[name] = value; }, removeAttribute(name) { delete attrs[name]; },
    focus() { document.activeElement = this; }, click() { this.fire('click'); },
    getBoundingClientRect() { return { top: 2000, bottom: 98, left: 0, right: 500 }; },
    closest() { return null; }, querySelector() { return element(); },
  };
}
const header = element(), dialog = element(), input = element(), trigger = element(), close = element();
dialog.open = false;
dialog.showModal = () => { dialog.open = true; };
dialog.close = () => { dialog.open = false; };
const cards = ['ps5', 'ps4'].map(id => { const card = element(); card.id = id; card.dataset.category = id; return card; });
const filters = ['all', 'ps5', 'ps4'].map((category, index) => {
  const button = element({ 'aria-pressed': String(index === 0) });
  button.dataset.filter = category; button.offsetLeft += index * 100; return button;
});
const ids = { experiencia: element(), consoles: element(), ps5: cards[0], ps4: cards[1] };
const rows = [
  ['experiencia', 'experiência início controle dualsense vídeo'], ['consoles', 'consoles categorias todos'],
  ['ps5', 'ps5 playstation 5'], ['ps4', 'ps4 playstation 4'],
].map(([id, keywords]) => {
  const row = element(); row.dataset.keywords = keywords;
  row.link = element({ href: '#' + id }); row.querySelector = () => row.link;
  return row;
});
const indicator = element(); indicator.parentElement = element();
const map = {
  '.site-header': header, '.search-dialog': dialog, '#search-input': input,
  '.filter-indicator': indicator, '.results-count': element(), '.search-empty': element(),
  '.search-count': element(), '.search-trigger': trigger, '.close-search': close,
  '#experiencia': ids.experiencia, '#consoles': ids.consoles, '#controller-video': element(),
};
document = Object.assign(element(), {
  querySelector: selector => { assert(map[selector], selector); return map[selector]; },
  querySelectorAll: selector => ({
    '.search-results li': rows, '.console-card': cards, '[data-filter]': filters,
    'a[href^="#"]': rows.map(row => row.link), '.console-details': [], '.console-image': [], '.main-nav a': [],
  }[selector] || []),
  getElementById: id => ids[id],
});
const window = Object.assign(element(), { scrollY: 0, scrollTo(x, y) { this.scrollY = y; } });
const location = { hash: '' };
vm.runInNewContext(fs.readFileSync('interface.js', 'utf8'), {
  document, window, location, history: { replaceState(a, b, hash) { location.hash = hash; } },
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  requestAnimationFrame: fn => fn(), IntersectionObserver: class { observe() {} },
});

trigger.click();
assert(dialog.open); assert.equal(document.activeElement, input);
assert(rows.every(row => !row.hidden));
input.value = 'PS 5'; input.fire('input');
assert.deepEqual(rows.map(row => row.hidden), [true, true, false, true]);
dialog.fire('keydown', { target: input, key: 'Enter' });
assert(!dialog.open); assert.equal(location.hash, '#ps5');
assert.equal(cards[0].hidden, false); assert.equal(cards[1].hidden, true);
assert.equal(document.activeElement, cards[0]);
filters[0].click(); assert(cards.every(card => !card.hidden));
filters[2].click(); assert.equal(cards[0].hidden, true); assert.equal(cards[1].hidden, false);
trigger.click(); input.value = 'início'; input.fire('input'); assert.equal(rows[0].hidden, false);
input.value = 'inexistente'; input.fire('input'); assert.equal(map['.search-empty'].hidden, false);
input.value = ''; input.fire('input'); dialog.fire('keydown', { target: input, key: 'ArrowDown' });
assert.equal(document.activeElement, rows[0].link);
dialog.fire('cancel'); assert(!dialog.open);

// All local assets and section destinations must exist in the delivered page.
const html = fs.readFileSync('index.html', 'utf8');
for (const [, value] of html.matchAll(/(?:src|href|poster|data-src)="([^"]+)"/g)) {
  if (value.startsWith('https:')) continue;
  if (value.startsWith('#')) assert(html.includes(`id="${value.slice(1)}"`), value);
  else assert(fs.existsSync(decodeURIComponent(value)), value);
}
console.log('PASS: search, accents, empty results, keyboard, navigation, filters, dialog closing, local assets and anchors.');
