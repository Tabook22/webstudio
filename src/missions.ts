import type { Editor } from 'grapesjs';
import { lang, t } from './i18n';
import * as I from './icons';
import { icon } from './icons';
import { MISSIONS, type Mission, type MissionCtx, type Spot, type Step } from './missions-data';
import { h, modal, toast } from './ui';

type Pair = [string, string];
const tx = (p: Pair) => p[lang === 'ar' ? 1 : 0];
const KEY = 'webdesigner:missions';

interface State {
  active: string | null;
  progress: Record<string, string[]>;
  badges: Record<string, number>;
}

function loadState(): State {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '');
    if (s && typeof s === 'object') return { active: s.active ?? null, progress: s.progress ?? {}, badges: s.badges ?? {} };
  } catch {}
  return { active: null, progress: {}, badges: {} };
}

interface MissionOptions {
  context: () => Omit<MissionCtx, 'events'>;
  startOnNewPage: (name: string) => Promise<void>;
}

/**
 * Guided missions: short step-by-step lessons that Web Studio checks
 * automatically, with a progress bar, a step banner over the page and badges.
 */
export function setupMissions(editor: Editor, opts: MissionOptions) {
  const panel = document.getElementById('missions')!;
  const stage = document.querySelector('.stage') as HTMLElement;
  const events = new Set<string>();
  let state = loadState();
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  };

  const active = () => MISSIONS.find((m) => m.id === state.active) ?? null;
  const doneOf = (m: Mission) => new Set(state.progress[m.id] ?? []);
  const currentStep = (m: Mission) => m.steps.find((s) => !doneOf(m).has(s.id)) ?? null;

  /* ---------- checking ---------- */
  function evaluate() {
    const m = active();
    if (!m) return;
    let ctx: MissionCtx;
    try {
      ctx = { ...opts.context(), events };
    } catch {
      return;
    }
    const done = doneOf(m);
    const newly: Step[] = [];
    for (const s of m.steps) {
      if (done.has(s.id)) continue;
      let ok = false;
      try {
        ok = s.check(ctx);
      } catch {}
      if (ok) {
        done.add(s.id);
        newly.push(s);
      }
    }
    if (!newly.length) return;
    state.progress[m.id] = [...done];
    const finished = done.size === m.steps.length;
    if (finished && !state.badges[m.id]) state.badges[m.id] = Date.now();
    save();
    render();
    if (finished) celebrate(m);
    else stepDone();
  }

  let timer = 0;
  const schedule = () => {
    clearTimeout(timer);
    timer = window.setTimeout(evaluate, 350);
  };
  editor.on('update component:toggled component:styleUpdate change:device', schedule);
  // Some steps depend on the app (X-ray button, code panel), not just the page.
  setInterval(() => active() && evaluate(), 1500);

  /* ---------- "Show me" ---------- */
  function showMe(spot?: Spot, hint?: string) {
    if (!spot) {
      if (hint) toast(hint);
      return;
    }
    if (spot.tab) (document.querySelector(`[data-tab="${spot.tab}"]`) as HTMLElement | null)?.click();
    if (spot.mode) (document.querySelector(`#mode-switch [data-mode="${spot.mode}"]`) as HTMLElement | null)?.click();
    if (spot.codeTab) (document.querySelector(`[data-code-tab="${spot.codeTab}"]`) as HTMLElement | null)?.click();
    requestAnimationFrame(() => {
      const el = document.querySelector(spot.sel) as HTMLElement | null;
      if (!el || !el.getClientRects().length) {
        if (hint) toast(hint);
        return;
      }
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.classList.remove('spotlight');
      void el.offsetWidth;
      el.classList.add('spotlight');
      setTimeout(() => el.classList.remove('spotlight'), 3200);
    });
  }

  /* ---------- the Missions tab ---------- */
  function render() {
    const m = active();
    panel.replaceChildren(m ? missionView(m) : listView());
    renderHud();
  }

  function progressBar(done: number, total: number, color = 'var(--accent)') {
    return h('div', { class: 'm-progress', title: `${done}/${total}` },
      h('span', { style: `width:${(done / total) * 100}%;background:${color}` }));
  }

  function listView() {
    const earned = MISSIONS.filter((m) => state.badges[m.id]);
    return h('div', { class: 'm-list' },
      h('p', { class: 'hint' }, t('missionsIntro')),
      h('div', { class: 'm-badges' },
        h('div', { class: 'mini-title' }, `${t('badges')} · ${earned.length}/${MISSIONS.length}`),
        earned.length
          ? h('div', { class: 'm-badge-row' },
              ...MISSIONS.map((m) =>
                h('span', {
                  class: `m-badge${state.badges[m.id] ? '' : ' locked'}`, title: tx(m.badge.name),
                  style: state.badges[m.id] ? `--c:${m.badge.color}` : '',
                }, m.badge.emoji),
              ))
          : h('p', { class: 'hint tight' }, t('noBadges')),
      ),
      ...MISSIONS.map((m) => {
        const done = doneOf(m).size;
        const complete = done === m.steps.length;
        return h('div', { class: `m-card${complete ? ' complete' : ''}`, style: `--c:${m.badge.color}` },
          h('div', { class: 'm-card-head' },
            h('span', { class: 'm-emoji' }, m.badge.emoji),
            h('div', { class: 'm-card-title' },
              h('strong', {}, tx(m.title)),
              h('small', {}, `${tx(m.topic)} · ${m.steps.length} ${t('steps')}`),
            ),
            h('span', { class: 'm-level', title: `Level ${m.level}` }, '●'.repeat(m.level) + '○'.repeat(3 - m.level)),
          ),
          progressBar(done, m.steps.length, m.badge.color),
          h('div', { class: 'm-card-actions' },
            complete
              ? h('span', { class: 'm-done', html: `${icon(I.CircleCheckBig, 15)} ${t('missionComplete')}` })
              : h('button', { type: 'button', class: 'btn primary small', onclick: () => start(m) },
                  done ? t('continueMission') : t('startMission')),
            complete || done
              ? h('button', { type: 'button', class: 'btn small', title: t('restartMission'), html: icon(I.RotateCcw, 14), onclick: () => start(m, true) })
              : '',
          ),
        );
      }),
      h('button', {
        type: 'button', class: 'link-btn m-reset',
        onclick: () => {
          if (!confirm(t('resetConfirm'))) return;
          state = { active: null, progress: {}, badges: {} };
          save();
          render();
        },
      }, t('resetProgress')),
    );
  }

  function missionView(m: Mission) {
    const done = doneOf(m);
    const cur = currentStep(m);
    return h('div', { class: 'm-view', style: `--c:${m.badge.color}` },
      h('button', {
        type: 'button', class: 'link-btn m-back',
        html: `${icon(lang === 'ar' ? I.ChevronRight : I.ChevronLeft, 14)} ${t('allMissions')}`,
        onclick: () => {
          state.active = null;
          save();
          render();
        },
      }),
      h('div', { class: 'm-hero' },
        h('span', { class: 'm-emoji big' }, m.badge.emoji),
        h('div', {}, h('strong', {}, tx(m.title)), h('small', {}, tx(m.topic))),
      ),
      h('div', { class: 'm-count' }, `${done.size} / ${m.steps.length}`),
      progressBar(done.size, m.steps.length, m.badge.color),
      h('ol', { class: 'm-steps' },
        ...m.steps.map((s, i) => {
          const isDone = done.has(s.id);
          const isCur = s === cur;
          return h('li', { class: `m-step${isDone ? ' done' : ''}${isCur ? ' current' : ''}` },
            h('span', { class: 'm-step-icon', html: isDone ? icon(I.CircleCheckBig, 18) : `<b>${i + 1}</b>` }),
            h('div', { class: 'm-step-body' },
              h('div', { class: 'm-step-title', dir: 'auto' }, tx(s.title)),
              isCur
                ? h('div', { class: 'm-step-hint' },
                    h('span', { html: icon(I.Lightbulb, 14) }),
                    h('span', { dir: 'auto' }, tx(s.hint)),
                  )
                : '',
              isCur
                ? h('button', {
                    type: 'button', class: 'btn small m-show', html: `${icon(I.Target, 14)} ${t('showMe')}`,
                    onclick: () => showMe(s.spot, tx(s.hint)),
                  })
                : '',
            ),
          );
        }),
      ),
      !cur
        ? h('div', { class: 'm-finished' },
            h('span', { class: 'm-emoji big' }, m.badge.emoji),
            h('strong', {}, t('missionComplete')),
            h('small', {}, `${t('badgeEarned')}: ${tx(m.badge.name)}`),
          )
        : '',
    );
  }

  /* ---------- banner over the page ---------- */
  const hud = h('div', { class: 'm-hud', hidden: true });
  stage.append(hud);
  let hudCelebrating = false;

  function renderHud() {
    const m = active();
    const cur = m && currentStep(m);
    if (!m || !cur || hudCelebrating) {
      if (!hudCelebrating) hud.hidden = true;
      return;
    }
    const done = doneOf(m).size;
    hud.hidden = false;
    hud.className = 'm-hud';
    hud.style.setProperty('--c', m.badge.color);
    hud.replaceChildren(
      h('span', { class: 'm-hud-emoji' }, m.badge.emoji),
      h('span', { class: 'm-hud-count' }, `${done + 1}/${m.steps.length}`),
      h('span', { class: 'm-hud-title', dir: 'auto' }, tx(cur.title)),
      h('button', { type: 'button', class: 'm-hud-btn', title: t('showMe'), html: icon(I.Target, 15), onclick: () => showMe(cur.spot, tx(cur.hint)) }),
      h('button', {
        type: 'button', class: 'm-hud-btn', title: t('missions'), html: icon(I.Trophy, 15),
        onclick: () => (document.querySelector('[data-tab="missions"]') as HTMLElement | null)?.click(),
      }),
    );
  }

  function stepDone() {
    hudCelebrating = true;
    hud.hidden = false;
    hud.className = 'm-hud success';
    hud.replaceChildren(h('span', { html: icon(I.CircleCheckBig, 18) }), h('strong', {}, t('greatJob')));
    setTimeout(() => {
      hudCelebrating = false;
      renderHud();
    }, 1600);
  }

  function celebrate(m: Mission) {
    hudCelebrating = false;
    renderHud();
    confetti(m.badge.color);
    const card = h('div', { class: 'm-award', style: `--c:${m.badge.color}` },
      h('div', { class: 'm-award-emoji' }, m.badge.emoji),
      h('strong', {}, t('missionComplete')),
      h('span', {}, `${t('badgeEarned')}: ${tx(m.badge.name)}`),
    );
    document.body.append(card);
    setTimeout(() => card.classList.add('leaving'), 3200);
    setTimeout(() => card.remove(), 3700);
  }

  /* ---------- starting a mission ---------- */
  async function start(m: Mission, restart = false) {
    if (restart) {
      delete state.progress[m.id];
      delete state.badges[m.id];
    }
    const resuming = (state.progress[m.id] ?? []).length > 0;
    if (!resuming) {
      let choice: 'new' | 'current' | null = null;
      let close: () => void = () => {};
      const pick = (c: 'new' | 'current') => () => {
        choice = c;
        close();
      };
      const p = modal({
        title: `${m.badge.emoji} ${tx(m.title)}`,
        body: h('div', { class: 'stack' },
          h('p', { class: 'hint', style: 'margin:0' }, t('whereToStart')),
          h('div', { class: 'big-choices' },
            h('button', { type: 'button', class: 'big-choice', onclick: pick('new') },
              h('span', { html: icon(I.FilePlus, 28) }), h('span', {}, t('newBlankPage')), h('small', {}, t('newBlankPageSub'))),
            h('button', { type: 'button', class: 'big-choice', onclick: pick('current') },
              h('span', { html: icon(I.Pencil, 28) }), h('span', {}, t('useCurrentPage')), h('small', {}, t('useCurrentPageSub'))),
          ),
        ),
      });
      close = () => (document.querySelector('dialog.modal header .icon-btn') as HTMLButtonElement | null)?.click();
      await p;
      if (!choice) return;
      if (choice === 'new') await opts.startOnNewPage(`${lang === 'ar' ? 'مهمة' : 'Mission'}: ${tx(m.title)}`);
    }
    events.clear();
    state.active = m.id;
    save();
    render();
    schedule();
  }

  render();
  if (active()) schedule();

  return {
    /** Something the student did outside the page itself (run, zip, check…). */
    event(name: string) {
      events.add(name);
      schedule();
    },
    refresh: schedule,
  };
}

/** A short burst of confetti over the whole window. */
function confetti(color: string) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = h('canvas', { class: 'm-confetti' });
  document.body.append(canvas);
  const ctx = canvas.getContext('2d')!;
  const W = (canvas.width = innerWidth);
  const H = (canvas.height = innerHeight);
  const colors = [color, '#facc15', '#22c55e', '#38bdf8', '#f472b6', '#a78bfa'];
  const bits = Array.from({ length: 160 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * 200, y: H * 0.35,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
    r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
    w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, c: colors[Math.floor(Math.random() * colors.length)],
  }));
  const startT = performance.now();
  const frame = (now: number) => {
    const t = now - startT;
    ctx.clearRect(0, 0, W, H);
    for (const b of bits) {
      b.vy += 0.35;
      b.x += b.vx;
      b.y += b.vy;
      b.r += b.vr;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.r);
      ctx.globalAlpha = Math.max(0, 1 - t / 2600);
      ctx.fillStyle = b.c;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.restore();
    }
    if (t < 2600) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
