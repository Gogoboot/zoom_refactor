/**
 * drawer.js — Компонент выдвижной панели (drawer)
 *
 * Заменяет вкладки логов/статистики/настроек.
 * Открывается снизу по кнопке шестерёнки в controls-bar.
 *
 * Архитектура: презентационный компонент без бизнес-логики.
 * Управляет только своим DOM и состоянием открыт/закрыт.
 */

export function createDrawerComponent({
  drawerEl,
  drawerOverlayEl,
  drawerCloseBtn,
  controlsBar,
}) {
  /* ─── Состояние ─────────────────────────────────── */
  let isOpen = false;

  /* ─── Внутренние вкладки внутри drawer ─────────── */
  const tabBtns = drawerEl.querySelectorAll(".drawer-tab-btn");
  const tabPanels = drawerEl.querySelectorAll(".drawer-tab-panel");

  /* Переключить вкладку внутри drawer */
  function activateTab(target) {
    tabBtns.forEach((b) =>
      b.classList.toggle("drawer-tab-btn--active", b.dataset.tab === target),
    );
    tabPanels.forEach((p) =>
      p.classList.toggle("hidden", p.dataset.panel !== target),
    );
  }

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });

  /* ─── Открыть / закрыть ─────────────────────────── */
  function open() {
    isOpen = true;
    drawerEl.classList.add("drawer--open");
    drawerOverlayEl.classList.add("drawer-overlay--visible");

    /* Поднимаем controls-bar над drawer —
           высота drawer считается после его появления */
    requestAnimationFrame(() => {
      const drawerHeight = drawerEl.offsetHeight;
      /* Сохраняем translateX(-50%) и добавляем translateY */
if (window.innerWidth <= 768) {
  controlsBar.style.opacity = "0";
  controlsBar.style.pointerEvents = "none";
} else {
  controlsBar.style.bottom = `${drawerHeight}px`;
  controlsBar.style.transition = "bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
}
      controlsBar.style.transition =
        "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
    });
    /* Доступность: фокус на первую вкладку */
    tabBtns[0]?.focus();
  }

  function close() {
    isOpen = false;
    drawerEl.classList.remove("drawer--open");
    drawerOverlayEl.classList.remove("drawer-overlay--visible");

    /* Возвращаем translateX(-50%) на место */
controlsBar.style.opacity = "1";
controlsBar.style.pointerEvents = "auto";
controlsBar.style.bottom = "12px";
}

  function toggle() {
    isOpen ? close() : open();
  }

  /* ─── Закрытие по кнопке и оверлею ─────────────── */
  drawerCloseBtn?.addEventListener("click", close);
  drawerOverlayEl?.addEventListener("click", close);

  /* Закрыть по Escape */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) close();
  });

  /* ─── Публичное API ─────────────────────────────── */
  return { open, close, toggle, activateTab };
}
