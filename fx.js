// Visual effects only: tooltips, ripple on press, theme icon spin, status text swap.
(() => {
  'use strict';

  // iOS-style tooltips replace native title bubbles. popup.js keeps writing
  // `title`; we move it into data-tip on hover so the native one never shows.
  const tip = document.createElement('div');
  tip.className = 'fx-tip';
  tip.setAttribute('role', 'tooltip');
  document.body.appendChild(tip);
  let tipTimer;
  let tipTarget = null;

  function hideTip() {
    clearTimeout(tipTimer);
    tipTarget = null;
    tip.classList.remove('show');
  }

  function showTip(el) {
    const text = el.dataset.tip;
    if (!text) return;
    tip.textContent = text;
    tip.className = 'fx-tip';
    const r = el.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const margin = 8;
    const below = r.bottom + th + 12 < innerHeight;
    const center = r.left + r.width / 2;
    const left = Math.min(Math.max(margin, center - tw / 2), innerWidth - tw - margin);
    tip.style.left = `${left}px`;
    tip.style.top = `${below ? r.bottom + 8 : r.top - th - 8}px`;
    tip.style.setProperty('--arrow-x', `${Math.min(Math.max(12, center - left), tw - 12)}px`);
    tip.style.setProperty('--tip-shift', below ? '-4px' : '4px');
    tip.classList.add(below ? 'below' : 'above');
    void tip.offsetWidth;
    tip.classList.add('show');
  }

  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest('[title], [data-tip]');
    if (el === tipTarget) return;
    hideTip();
    if (!el || el.closest('.modal-backdrop')) return;
    if (el.title) {
      el.dataset.tip = el.title;
      el.removeAttribute('title');
    }
    tipTarget = el;
    tipTimer = setTimeout(() => showTip(el), 450);
  });
  document.addEventListener('mouseleave', hideTip);
  document.addEventListener('pointerdown', hideTip, true);

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.addEventListener('pointerdown', (e) => {
    const target = e.target.closest('button:not(.link-btn):not(.lang-btn):not(.icon-btn):not(.modal-close-btn), .help');
    if (!target || target.disabled) return;
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const ripple = document.createElement('span');
    ripple.className = 'fx-ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    if (getComputedStyle(target).position === 'static') target.style.position = 'relative';
    target.style.overflow = 'hidden';
    target.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  });

  const themeBtn = document.getElementById('theme-toggle');
  themeBtn?.addEventListener('click', () => {
    themeBtn.classList.remove('fx-spin');
    void themeBtn.offsetWidth;
    themeBtn.classList.add('fx-spin');
  });

  const status = document.getElementById('status');
  if (status) {
    let last = status.textContent;
    new MutationObserver(() => {
      if (status.textContent === last) return;
      last = status.textContent;
      status.classList.remove('fx-swap');
      void status.offsetWidth;
      status.classList.add('fx-swap');
    }).observe(status, { childList: true, characterData: true, subtree: true });
  }
})();
