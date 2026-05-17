import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

gsap.to('.parallax-bg', {
  scrollTrigger: { scrub: true },
  y: window.innerHeight,
  x: (_i: number, target: HTMLElement) => target.dataset.movex,
});
