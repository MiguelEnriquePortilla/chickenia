// Apply the saved appearance before painting report pages, including the local preview.
try {
  if (localStorage.getItem('chickenia_theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
} catch {}
