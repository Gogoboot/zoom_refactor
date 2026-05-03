/**
 * shareModal.js — Попап "Поделиться ссылкой на комнату"
 */
export function createShareModal({
  modalEl,
  linkEl,
  copyBtn,
  closeBtn,
  okBtn,
}) {
  function show(link) {
    linkEl.value = link;
    modalEl.style.display = "flex";
  }

  function hide() {
    modalEl.style.display = "none";
  }

  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(linkEl.value).then(() => {
      copyBtn.textContent = "✅ Скопировано";
      setTimeout(() => {
        copyBtn.textContent = "Скопировать";
      }, 2000);
    });
  });

  closeBtn.addEventListener("click", hide);
  okBtn.addEventListener("click", hide);

  modalEl.addEventListener("click", (e) => {
    if (e.target === modalEl) hide();
  });

  return { show, hide };
}
