function modalClick(e: Event) {
  e.stopPropagation();
  return false;
}

const closeModal = (e: Event, modal: HTMLElement, overlay: HTMLElement) => {
  e.stopPropagation();
  modal.style.opacity = '0';
  overlay.style.opacity = '0';
  setTimeout(() => {
    overlay.style.display = 'none';
    modal.style.display = 'none';
  }, 400);
};

const openModal = (modal: HTMLElement, overlay: HTMLElement) => {
  modal.style.display = 'block';
  overlay.style.display = 'block';
  setTimeout(() => {
    modal.style.opacity = '1';
    overlay.style.opacity = '1';
  }, 50);
};

// Dynamically find all translation modals on the page
document.querySelectorAll('.overlay[id$="-modal"]').forEach((overlay) => {
  const id = overlay.id.replace('-modal', '');
  const openBtn = document.querySelector(`#${id}-modal-btn`);
  const modal = overlay.querySelector('.modal') as HTMLElement;

  if (openBtn && modal) {
    modal.addEventListener('click', modalClick);
    openBtn.addEventListener('click', () => openModal(modal, overlay as HTMLElement));
    overlay.addEventListener('click', (e) => closeModal(e, modal, overlay as HTMLElement));
  }
});
