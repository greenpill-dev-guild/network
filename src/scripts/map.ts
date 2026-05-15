interface Location {
  name: string;
  lat: number;
  long: number;
  link?: string;
}

let locations: Location[];
let mapLoaded = false;
let locationsLoaded = false;

const width = 758;
const height = 400;
let scale: number;

const img = new Image();
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
if (canvas) {
  const ctx = canvas.getContext('2d')!;

  const updateScale = () => {
    const elem = canvas.getBoundingClientRect();
    const newWidth = Math.abs(elem.right - elem.left);
    scale = newWidth ? width / newWidth : 1;
  };

  updateScale();
  window.addEventListener('load', updateScale);
  window.addEventListener('resize', updateScale);

  const mapSelectedLink = document.querySelector('.map-selected-link') as HTMLAnchorElement;
  const mapSelectedName = document.querySelector('.map-selected-name') as HTMLElement;
  const mapSelectedMoreText = document.getElementById('more-text')!;

  const getCoords = (latitude: number, longitude: number) => {
    const x = width * (180 + longitude) / 360 - 25;
    const y = height * (90 - latitude) / 180 + 45;
    return { x, y };
  };

  const LOCATION_RADIUS = 6;

  const drawMap = () => {
    if (!mapLoaded) return;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    if (locationsLoaded) {
      createLocations();
    }
  };

  const createLocations = () => {
    locations.forEach(location => {
      const { x, y } = getCoords(location.lat, location.long);
      ctx.beginPath();
      ctx.arc(x, y, LOCATION_RADIUS, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = '#C2E812';
      ctx.fill();
    });
  };

  const getClickCoords = (event: MouseEvent | TouchEvent) => {
    const container = canvas.getBoundingClientRect();
    const clientX = 'clientX' in event ? event.clientX : (event as TouchEvent).touches[0].clientX;
    const clientY = 'clientY' in event ? event.clientY : (event as TouchEvent).touches[0].clientY;
    return { x: clientX - container.left, y: clientY - container.top };
  };

  const isMapElement = (e: MouseEvent | TouchEvent) => {
    if (!locationsLoaded || !locations?.length || !scale) return undefined;
    const { x, y } = getClickCoords(e);
    return locations.find(element => {
      const { x: elemX, y: elemY } = getCoords(element.lat, element.long);
      const xDiff = Math.abs(elemX / scale - x);
      const yDiff = Math.abs(elemY / scale - y);
      const hitRadius = Math.max(LOCATION_RADIUS / scale, 12);
      return xDiff <= hitRadius && yDiff <= hitRadius;
    });
  };

  const handleMapClick = (e: MouseEvent | TouchEvent) => {
    const element = isMapElement(e);
    if (element) {
      if (element.link?.length) {
        mapSelectedLink.href = element.link;
        mapSelectedMoreText.style.display = 'block';
        mapSelectedLink.style.pointerEvents = 'auto';
      } else {
        mapSelectedLink.href = '';
        mapSelectedMoreText.style.display = 'none';
        mapSelectedLink.style.pointerEvents = 'none';
      }
      mapSelectedName.innerText = element.name;
      const { x, y } = getCoords(element.lat, element.long);
      mapSelectedLink.style.top = `${y / scale}px`;
      mapSelectedLink.style.left = `${x / scale}px`;
      mapSelectedLink.style.display = 'flex';
      setTimeout(() => {
        mapSelectedLink.style.opacity = '1';
        (mapSelectedLink.style as any).scale = '1';
      }, 1);
    }
  };

  canvas.addEventListener('click', (e) => handleMapClick(e), false);
  canvas.addEventListener('touchstart', (e) => handleMapClick(e), false);
  canvas.addEventListener('mousemove', (e) => {
    canvas.style.cursor = isMapElement(e) ? 'pointer' : 'default';
  });

  fetch('/locations.json')
    .then(response => response.json())
    .then((json: Location[]) => {
      locations = json;
      locationsLoaded = true;
      drawMap();
    });

  img.addEventListener('load', () => {
    mapLoaded = true;
    drawMap();
  }, false);

  img.src = '/images/map.png';
}
