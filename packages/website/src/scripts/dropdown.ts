const dropdownButtons = document.querySelectorAll('.dropdown-btn');
const dropdownButtonsCTA = document.querySelectorAll<HTMLAnchorElement>('.dropdown-btn-shop');
const dropdownCtaText = document.querySelectorAll<HTMLButtonElement>('.dropdown-btn-shop button');
let timeoutId: ReturnType<typeof setTimeout>;

const openDropdown = (dropdownButton: Element) => {
  const dropdownButtonContent = dropdownButton.querySelector('.dropdown-btn-content') as HTMLElement;
  if (!dropdownButtonContent) return;
  clearTimeout(timeoutId);
  dropdownButtonContent.style.display = 'flex';
  setTimeout(() => {
    const h = dropdownButtonContent.dataset.height || '40';
    dropdownButtonContent.style.height = window.innerWidth > 800 ? `${h}px` : `${Number(h) * 0.85}px`;
    dropdownButtonContent.style.opacity = '1';
  }, 1);
};

const closeDropdown = (dropdownButton: Element) => {
  const dropdownButtonContent = dropdownButton.querySelector('.dropdown-btn-content') as HTMLElement;
  if (!dropdownButtonContent) return;
  clearTimeout(timeoutId);
  dropdownButtonContent.style.height = '0px';
  dropdownButtonContent.style.opacity = '0';
  setTimeout(() => { dropdownButtonContent.style.display = 'none'; }, 300);
};

dropdownButtons.forEach((btn, i) => {
  btn.addEventListener('mouseover', () => openDropdown(btn));
  btn.addEventListener('mouseleave', () => closeDropdown(btn));

  const selected = btn.querySelector('.dropdown-btn-selected') as HTMLElement;
  const options = btn.querySelectorAll<HTMLElement>('.dropdown-btn-option');

  options?.forEach(option => {
    option.addEventListener('click', () => {
      closeDropdown(btn);
      const prevSelectedText = selected.innerText;
      if (dropdownCtaText[i]) {
        dropdownCtaText[i].innerText = option.innerText === 'Ebook' || option.innerText.includes('Comic') ? 'Get it (free)' : 'Get it';
      }
      selected.innerText = option.innerText;
      option.innerText = prevSelectedText;
      const prevSelectedLink = selected.dataset.link || '';
      selected.dataset.link = option.dataset.link || '';
      option.dataset.link = prevSelectedLink;
      if (dropdownButtonsCTA[i]) {
        dropdownButtonsCTA[i].href = selected.dataset.link || '';
      }
    });
  });
});

// more books
const moreBooksBtn = document.getElementById('more-books-btn');
const moreBooksContent = document.getElementById('more-books-content');
if (moreBooksBtn && moreBooksContent) {
  moreBooksBtn.addEventListener('click', () => {
    moreBooksContent.style.display = 'flex';
    moreBooksBtn.style.display = 'none';
  });
}
