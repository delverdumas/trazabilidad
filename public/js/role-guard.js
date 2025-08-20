// public/js/role-guard.js
// Bloquea clicks a enlaces/tarjetas fuera de rol y muestra alerta.

(function () {
  function canAccess(el) {
    const allowedAttr = el.getAttribute('data-roles') || '';
    const allowed = allowedAttr.split(',').map(s => s.trim()).filter(Boolean);
    const role = (window.CURRENT_ROLE || '').trim();
    if (!role || allowed.length === 0) return true; // si no hay datos, no bloquea
    return allowed.includes(role);
  }

  document.addEventListener('click', function (ev) {
    const guarded = ev.target.closest('[data-roles]');
    if (!guarded) return;
    if (!canAccess(guarded)) {
      ev.preventDefault();
      ev.stopPropagation();
      alert('No tienes acceso a este sitio con tu rol actual.');
    }
  }, true);
})();
