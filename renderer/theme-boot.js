// Applies the last used theme before first paint (avoids a flash of the wrong theme).
try {
  const t = localStorage.getItem('nexus-theme');
  if (t && t !== 'classic') document.documentElement.dataset.theme = t;
} catch { /* storage unavailable */ }
