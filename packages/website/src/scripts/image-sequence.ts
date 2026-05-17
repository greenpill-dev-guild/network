const getImgIndex = (index: number) => {
  const x = `0${index + 1}`;
  return x.slice(x.length - 2);
};

const currentFrame = (index: number) => `/images/footer-img-sequence/${getImgIndex(index)}.png`;

const heroImg = document.getElementById('hero-img') as HTMLImageElement;
const footerImg = document.getElementById('footer-img') as HTMLImageElement;

if (heroImg || footerImg) {
  window.addEventListener('mousemove', (e) => {
    const percent = (100 * e.clientX) / window.innerWidth;

    if (heroImg) {
      const imgIndex = Math.floor(32 * percent / 100);
      heroImg.src = currentFrame(imgIndex);
    }

    if (footerImg) {
      const footerImgIndex = Math.floor(38 * percent / 100);
      footerImg.src = `/images/img-sequence/${getImgIndex(footerImgIndex)}.png`;
    }
  });
}
