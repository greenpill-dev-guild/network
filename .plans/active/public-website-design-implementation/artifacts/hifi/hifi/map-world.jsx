/* hifi/map-world.jsx — World geography for the mycelial map.
   Continents defined as simplified polygons (lon/lat), rasterized into a
   high-resolution dot grid (120×60 by default — 5× denser than the old
   hand-traced 60×24 ascii landmass).
   Two render modes:
     - 'dots'     (default — topographic dot landmass, brand-canonical)
     - 'outlines' (solid filled continents — for the alt explore option)
   ----------------------------------------------------------------- */

/* ---------- continent polygons (lon, lat) ---------- */
/* Each polygon is a closed silhouette in equirectangular space. Coords are
   hand-simplified — aimed at "instantly recognizable" not "geodetic-accurate".
   Note: longitudes wrap at ±180; coords stay within (-180..180). */

const MW_CONTINENTS = [
  /* North America — Alaska + Canada + USA + Mexico body */
  [[-167,66],[-160,71],[-148,71],[-133,69],[-110,73],[-95,79],[-83,75],
   [-75,78],[-70,73],[-62,60],[-65,52],[-66,46],[-71,45],[-77,38],
   [-82,30],[-92,29],[-97,27],[-104,21],[-110,23],[-117,32],[-124,40],
   [-124,48],[-130,55],[-138,58],[-148,60],[-160,57],[-167,60],[-167,66]],

  /* Greenland */
  [[-50,82],[-25,82],[-22,78],[-32,68],[-42,60],[-52,62],[-55,72],[-50,82]],

  /* Iceland */
  [[-24,66.5],[-18,66.5],[-15,64],[-22,63.5],[-24,66.5]],

  /* Central America */
  [[-100,18],[-87,21],[-83,16],[-77,9],[-83,8],[-92,14],[-100,18]],

  /* South America */
  [[-77,12],[-66,11],[-58,9],[-50,5],[-35,-6],[-34,-15],[-40,-25],
   [-50,-30],[-58,-36],[-65,-40],[-68,-50],[-72,-54],[-74,-50],
   [-73,-42],[-75,-33],[-72,-20],[-77,-8],[-80,-2],[-78,5],[-77,12]],

  /* British Isles */
  [[-8,55],[-3,58],[2,55],[1,51],[-5,50],[-8,52],[-8,55]],
  /* Ireland */
  [[-10,54],[-6,55],[-6,52],[-10,52],[-10,54]],

  /* Europe mainland (Iberia → Scandinavia → eastern flank) */
  [[-10,36],[-5,36],[3,43],[9,44],[12,38],[18,40],[25,35],[28,36],
   [27,40],[30,46],[35,46],[40,49],[43,55],[35,58],[28,60],[24,65],
   [22,69],[15,68],[10,63],[5,58],[3,52],[-3,48],[-5,43],[-10,42],[-10,36]],

  /* Russia / Siberia / north Asia */
  [[20,62],[35,60],[45,58],[60,57],[75,57],[95,57],[115,57],[135,57],
   [155,60],[170,67],[178,68],[178,78],[160,80],[120,80],[80,82],
   [50,82],[30,78],[22,70],[20,62]],

  /* Africa — single trunk including the Sahel and Horn */
  [[-17,15],[-14,22],[-10,30],[-2,36],[10,33],[20,32],[32,32],[37,31],
   [40,22],[46,17],[52,12],[51,4],[44,-2],[42,-10],[40,-15],[38,-22],
   [33,-30],[24,-34],[18,-34],[14,-25],[10,-12],[8,-2],[7,5],
   [0,5],[-7,5],[-11,7],[-17,15]],

  /* Madagascar */
  [[43,-12],[51,-15],[51,-25],[44,-25],[43,-12]],

  /* Arabia */
  [[35,30],[38,24],[44,18],[53,18],[56,24],[52,28],[44,30],[35,30]],

  /* India + subcontinent */
  [[66,24],[72,28],[78,32],[85,28],[90,25],[92,21],[87,15],[80,8],
   [76,9],[72,18],[68,22],[66,24]],

  /* China / Mongolia / Korea mainland (east Asia south of Siberia) */
  [[75,40],[85,45],[100,50],[120,52],[135,49],[135,42],[130,38],
   [126,34],[120,30],[118,24],[110,21],[100,22],[95,27],[90,30],
   [80,32],[75,40]],

  /* Indochina / SE Asia mainland */
  [[95,22],[100,22],[107,18],[110,12],[108,8],[100,8],[97,12],[97,18],[95,22]],

  /* Malay + Sumatra-Java arc */
  [[95,5],[102,5],[108,1],[120,-1],[133,-3],[140,-3],[140,-8],[125,-9],
   [110,-7],[100,-3],[97,2],[95,5]],

  /* Borneo */
  [[109,4],[118,4],[119,-3],[110,-4],[109,4]],

  /* New Guinea */
  [[131,-1],[141,-3],[150,-6],[151,-10],[140,-10],[133,-8],[131,-1]],

  /* Philippines (rough cluster) */
  [[119,18],[123,18],[126,9],[124,5],[120,6],[119,12],[119,18]],

  /* Japan (arc) */
  [[130,30],[135,33],[141,40],[145,45],[144,44],[140,40],[134,33],[130,30]],

  /* Australia */
  [[113,-22],[122,-17],[130,-12],[137,-13],[143,-13],[148,-19],[153,-26],
   [152,-32],[148,-37],[140,-39],[125,-34],[115,-32],[113,-22]],

  /* Tasmania */
  [[145,-40],[148,-40],[148,-43],[145,-43],[145,-40]],

  /* New Zealand (two-island silhouette merged) */
  [[166,-37],[175,-39],[178,-46],[170,-47],[166,-44],[166,-37]],
];

/* ---------- point-in-polygon (ray cast) ---------- */
function mwPointInPolygon(lon, lat, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lon < (xj - xi) * (lat - yi) / (yj - yi + 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/* ---------- rasterize continents to dot grid ---------- */
function mwBuildDotGrid(cols = 120, rows = 60) {
  // viewBox is 0..200 (x) × 0..100 (y) — equirectangular.
  // Each cell maps to a lon/lat at its center.
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const lat = 90 - (r + 0.5) * (180 / rows);
    const row = [];
    for (let c = 0; c < cols; c++) {
      const lon = -180 + (c + 0.5) * (360 / cols);
      let inside = false;
      for (let i = 0; i < MW_CONTINENTS.length; i++) {
        if (mwPointInPolygon(lon, lat, MW_CONTINENTS[i])) { inside = true; break; }
      }
      row.push(inside ? 1 : 0);
    }
    grid.push(row);
  }
  return grid;
}

/* Render the dot landmass as an SVG <g>. Returns array of <circle> elements.
   density = how many cells to keep ('full' = every filled cell, 'half' = checkerboard). */
function mwRenderDots(grid, opts = {}) {
  const { density = 'full', color = 'var(--gp-green-500)', opacity = 0.55, r = 0.42 } = opts;
  const rows = grid.length;
  const cols = grid[0].length;
  const cellW = 200 / cols;
  const cellH = 100 / rows;
  const out = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!grid[row][col]) continue;
      if (density === 'half' && ((row + col) & 1)) continue;
      const cx = col * cellW + cellW / 2;
      const cy = row * cellH + cellH / 2;
      out.push(
        React.createElement('circle', {
          key: `${row}-${col}`,
          cx, cy, r,
          fill: color,
          opacity,
        })
      );
    }
  }
  return out;
}

/* Render filled continent outlines as SVG paths — alternate world style. */
function mwRenderOutlines(opts = {}) {
  const { fill = 'var(--gp-green-800)', stroke = 'var(--gp-green-600)', strokeWidth = 0.12, opacity = 0.85 } = opts;
  return MW_CONTINENTS.map((poly, i) => {
    const d = poly.map(([lon, lat], j) => {
      const x = (lon + 180) / 360 * 200;
      const y = (90 - lat) / 180 * 100;
      return `${j === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ') + ' Z';
    return React.createElement('path', {
      key: `cont-${i}`,
      d,
      fill,
      stroke,
      strokeWidth,
      opacity,
    });
  });
}

/* Cached default grid. */
const MW_DEFAULT_GRID = mwBuildDotGrid(120, 60);

Object.assign(window, {
  MW_CONTINENTS, mwBuildDotGrid, mwRenderDots, mwRenderOutlines,
  mwPointInPolygon, MW_DEFAULT_GRID,
});
