/* Feedback only after confirmed saves; celebrations never run on first load. */
(() => {
  const previous = new Map();
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function saved(message = 'Registro guardado ✓', warning = false) {
    let toast = document.getElementById('save-feedback');
    if (!toast) {
      toast = document.createElement('div'); toast.id = 'save-feedback';
      toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite');
      document.body.append(toast);
    }
    clearTimeout(toast.timer);
    toast.textContent = message; toast.className = warning ? 'feedback-toast warning' : 'feedback-toast';
    toast.hidden = false;
    toast.timer = setTimeout(() => { toast.hidden = true; }, 3200);
  }
  function celebrate(key, message, full = false) {
    try {
      if (localStorage.getItem('chickenia_celebrated_' + key)) return;
      localStorage.setItem('chickenia_celebrated_' + key, '1');
    } catch {}
    saved(message);
    if (reduced()) return;
    document.querySelector('.celebration-layer')?.remove();
    const layer = document.createElement('div'); layer.className = 'celebration-layer';
    layer.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < (full ? 24 : 9); i++) {
      const particle = document.createElement('span');
      particle.textContent = (full ? ['🐔', '⭐', '✅'] : ['⭐'])[i % (full ? 3 : 1)];
      particle.style.cssText = `left:${full ? 5 + Math.random() * 90 : 65 + Math.random() * 25}%;animation-delay:${Math.random() * .4}s;--drift:${Math.random() * 120 - 60}px`;
      layer.append(particle);
    }
    document.body.append(layer); setTimeout(() => layer.remove(), 2600);
  }
  function summary(value) {
    const prefix = `${value.location.id}:${value.date}`;
    const values = [...value.areas.map(a => [a.area_code, a.score, `${a.area_name} al 100 % ⭐`]), ['all', value.overall_score, '¡Jornada completa! 🐔 ⭐']];
    for (const [id, score, message] of values) {
      const key = `${prefix}:${id}`;
      if (previous.has(key) && previous.get(key) < 100 && score === 100) celebrate(key, message, id === 'all');
      previous.set(key, score);
    }
  }
  function progress(key, value, message) {
    if (previous.has(key) && previous.get(key) < 100 && value === 100) celebrate(key, message);
    previous.set(key, value);
  }
  window.ChickenFeedback = { saved, celebrate, summary, progress };
})();
