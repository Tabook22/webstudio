import type { CodePanel } from './code';
import { lang, t } from './i18n';
import { $, h } from './ui';

type Pair = [string, string];
const tx = (p: Pair) => p[lang === 'ar' ? 1 : 0];

/** Ready-made JavaScript examples students can drop into script.js. */
const SNIPPETS: { label: Pair; code: string }[] = [
  {
    label: ['Say hello in the console', 'رسالة في وحدة التحكم'],
    code: `// console.log() writes a message you can read in the Console tab
console.log('Hello from script.js!');
`,
  },
  {
    label: ['Message when a button is clicked', 'رسالة عند النقر على زر'],
    code: `// Show a message when any button is clicked
document.querySelectorAll('button, .btn').forEach((button) => {
  button.addEventListener('click', (event) => {
    event.preventDefault();
    alert('You clicked: ' + button.textContent.trim());
  });
});
`,
  },
  {
    label: ['Change the main heading', 'تغيير العنوان الرئيسي'],
    code: `// Find the first <h1> and change its text and color
const heading = document.querySelector('h1');
if (heading) {
  heading.textContent = 'Changed by JavaScript!';
  heading.style.color = '#4f46e5';
}
`,
  },
  {
    label: ['Dark mode button', 'زر الوضع الليلي'],
    code: `// Add a button that switches the page between light and dark
const toggle = document.createElement('button');
toggle.textContent = '🌙 Dark mode';
toggle.style.cssText = 'position:fixed;bottom:16px;right:16px;padding:10px 16px;border-radius:8px;border:0;cursor:pointer;';
document.body.appendChild(toggle);

toggle.addEventListener('click', () => {
  const dark = document.body.classList.toggle('dark');
  document.body.style.background = dark ? '#0f172a' : '';
  document.body.style.color = dark ? '#f1f5f9' : '';
  toggle.textContent = dark ? '☀️ Light mode' : '🌙 Dark mode';
});
`,
  },
  {
    label: ['Show / hide on click', 'إظهار / إخفاء عند النقر'],
    code: `// Click any <h2> to hide or show the element right after it
document.querySelectorAll('h2').forEach((title) => {
  title.style.cursor = 'pointer';
  title.addEventListener('click', () => {
    const next = title.nextElementSibling;
    if (next) next.hidden = !next.hidden;
  });
});
`,
  },
  {
    label: ["Show today's date", 'عرض تاريخ اليوم'],
    code: `// Add today's date at the end of the page
const today = document.createElement('p');
today.textContent = 'Today is ' + new Date().toLocaleDateString();
today.style.textAlign = 'center';
document.body.appendChild(today);
`,
  },
  {
    label: ['Check a form before sending', 'التحقق من النموذج قبل الإرسال'],
    code: `// Stop the form if a field is empty, and say which one
const form = document.querySelector('form');
if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const empty = [...form.querySelectorAll('input, textarea')].find((field) => !field.value.trim());
    if (empty) {
      empty.style.borderColor = 'red';
      alert('Please fill in: ' + (empty.placeholder || empty.name || 'all fields'));
    } else {
      alert('Thank you! Your message was sent.');
      form.reset();
    }
  });
}
`,
  },
  {
    label: ['Counter (click to count)', 'عدّاد (انقر للعد)'],
    code: `// A button that counts how many times it was clicked
let count = 0;
const counter = document.createElement('button');
counter.textContent = 'Clicked 0 times';
counter.style.cssText = 'padding:12px 20px;font-size:18px;border-radius:8px;margin:16px;';
document.body.appendChild(counter);

counter.addEventListener('click', () => {
  count = count + 1;
  counter.textContent = 'Clicked ' + count + ' times';
  console.log('count is now', count);
});
`,
  },
];

/** Forwards console output and errors from the preview tab back to Web Studio. */
const BRIDGE = `(function () {
  function send(level, args) {
    try {
      var text = Array.prototype.map.call(args, function (a) {
        if (a instanceof Error) return a.message;
        if (typeof a === 'object') { try { return JSON.stringify(a); } catch (e) { return String(a); } }
        return String(a);
      }).join(' ');
      var target = window.opener || (window.parent !== window ? window.parent : null);
      target && target.postMessage({ __webStudio: true, level: level, text: text }, '*');
    } catch (e) {}
  }
  ['log', 'info', 'warn', 'error'].forEach(function (level) {
    var original = console[level];
    console[level] = function () { send(level, arguments); original.apply(console, arguments); };
  });
  window.addEventListener('error', function (e) {
    send('error', [e.message + (e.lineno ? '  (script.js line ' + e.lineno + ')' : '')]);
  });
})();`;

let previewWin: Window | null = null;

/** Open the finished page in a new tab, with styles, images and script.js running. */
export function openPreview(indexHtml: string, css: string, js: string) {
  let html = indexHtml.replace('<link rel="stylesheet" href="style.css">', `<style>\n${css}</style>`);
  const bridge = `<script>${BRIDGE}</script>`;
  html = html.replace('<head>', `<head>\n${bridge}`);
  if (js.trim()) {
    // A separate file keeps error line numbers matching script.js.
    const jsUrl = URL.createObjectURL(new Blob([js], { type: 'text/javascript' }));
    html = html.replace('<script src="script.js"></script>', `<script src="${jsUrl}"></script>`);
    setTimeout(() => URL.revokeObjectURL(jsUrl), 60_000);
  }
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  previewWin = window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function setupScripting(code: CodePanel, run: () => void) {
  /* tabs: style.css / script.js / Console */
  const tabs = document.querySelectorAll<HTMLButtonElement>('[data-code-tab]');
  const show = (name: string) => {
    tabs.forEach((b) => b.classList.toggle('active', b.dataset.codeTab === name));
    document.querySelectorAll<HTMLElement>('[data-code-body]').forEach((el) => (el.hidden = el.dataset.codeBody !== name));
    if (name === 'console') badge.hidden = true;
    requestAnimationFrame(() => {
      code.cssView.requestMeasure();
      code.jsView.requestMeasure();
    });
  };
  tabs.forEach((b) => b.addEventListener('click', () => show(b.dataset.codeTab!)));

  /* snippets */
  const select = $<HTMLSelectElement>('#js-snippets');
  select.append(
    h('option', { value: '' }, t('snippets')),
    ...SNIPPETS.map((s, i) => h('option', { value: String(i) }, tx(s.label))),
  );
  select.addEventListener('change', () => {
    const s = SNIPPETS[Number(select.value)];
    if (s) code.insertJs(s.code);
    select.value = '';
  });

  /* console */
  const out = $('#console-out');
  const badge = $('#console-badge');
  let unseen = 0;
  const empty = () => out.replaceChildren(h('p', { class: 'console-empty' }, t('consoleEmpty')));
  empty();
  $('#btn-console-clear').addEventListener('click', () => {
    unseen = 0;
    empty();
  });
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d?.__webStudio || (previewWin && e.source !== previewWin)) return;
    out.querySelector('.console-empty')?.remove();
    out.append(
      h('div', { class: `console-line ${d.level}` },
        h('span', { class: 'console-time' }, new Date().toLocaleTimeString('en', { hour12: false })),
        h('span', {}, String(d.text)),
      ),
    );
    out.scrollTop = out.scrollHeight;
    const consoleOpen = !$('[data-code-body="console"]').hidden;
    if (!consoleOpen) {
      unseen++;
      badge.textContent = String(unseen);
      badge.hidden = false;
      badge.dataset.level = d.level === 'error' ? 'error' : '';
    } else unseen = 0;
  });

  $('#btn-run').addEventListener('click', () => {
    out.querySelector('.console-empty')?.remove();
    out.append(h('div', { class: 'console-line sep' }, '— Run —'));
    run();
  });
}
