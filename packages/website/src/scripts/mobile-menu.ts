const menuIcon = document.getElementById('mobile-menu-icon');
const menu = document.getElementById('mobile-menu');
const menuItems = document.querySelector('#mobile-menu ul');

const toggleMenuClick = () => {
  if (menu) {
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  }
};

if (document.body.offsetWidth < 640 && menuIcon && menuItems) {
  menuIcon.addEventListener('click', toggleMenuClick);
  menuItems.addEventListener('click', toggleMenuClick);
}

const logo = document.getElementById('logo');
if (logo) {
  logo.addEventListener('click', () => window.scrollTo(0, 0));
}
