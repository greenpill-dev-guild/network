// Geometry for the home map's stacks, fans and location picker, in map units
// (the SVG viewBox's units). It has no DOM, so its rules are tested directly
// (scripts/map-node-contract.test.ts); HomeMap.astro converts screen px to map
// units before calling it.

export type MapPoint = { x: number; y: number };
export type MapBox = { x: number; y: number; width: number; height: number };

/**
 * Groups pins whose centres lie within `radius` of another pin in the same
 * group, chaining through neighbours. Every pin lands in exactly one group; a
 * pin with no neighbour is a group of one.
 */
export function groupOverlappingPins<T extends { center: MapPoint }>(pins: readonly T[], radius: number): T[][] {
  const grouped = new Set<T>();
  const groups: T[][] = [];
  for (const pin of pins) {
    if (grouped.has(pin)) continue;
    const group = [pin];
    grouped.add(pin);
    for (let i = 0; i < group.length; i += 1) {
      for (const other of pins) {
        if (grouped.has(other)) continue;
        if (Math.hypot(group[i].center.x - other.center.x, group[i].center.y - other.center.y) > radius) continue;
        grouped.add(other);
        group.push(other);
      }
    }
    groups.push(group);
  }
  return groups;
}

export type FanLayout = {
  origin: MapPoint;
  /** Satellite centres in fan order: clockwise from the top. `angle` is the direction outward from the origin. */
  points: Array<MapPoint & { angle: number }>;
  /** Hit radius that keeps neighbouring satellites' targets apart. */
  hitRadius: number;
  radiusX: number;
  radiusY: number;
};

// Ramanujan's approximation of an ellipse's perimeter.
const ellipsePerimeter = (a: number, b: number) => (
  Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)))
);

/**
 * Lays out `count` satellites around `center`, about `spacing` apart along the
 * ring, on a circle no smaller than `minRadius`. A circle that would not fit
 * the view, with `reach` kept clear around each satellite for its touch
 * target, flattens into an ellipse that keeps the spacing where the view has
 * room, and the fan moves inward so every satellite stays on the map.
 * Satellites sit at equal distances along the ring, starting at the top.
 */
export function layoutFan(options: {
  count: number;
  center: MapPoint;
  view: MapBox;
  spacing: number;
  minRadius: number;
  reach: number;
}): FanLayout {
  const { center, view, spacing, minRadius, reach } = options;
  const count = Math.max(1, Math.floor(options.count));
  const wanted = Math.max(minRadius, (count * spacing) / (2 * Math.PI));
  const roomX = Math.max(0.5, view.width / 2 - reach);
  const roomY = Math.max(0.5, view.height / 2 - reach);
  let radiusX = Math.min(wanted, roomX);
  let radiusY = Math.min(wanted, roomY);
  const needed = count * spacing;
  if (ellipsePerimeter(radiusX, radiusY) < needed) {
    // Lengthen whichever axis still has room, as little as the ring needs.
    const growX = radiusX < roomX;
    const fixed = growX ? radiusY : radiusX;
    let low = growX ? radiusX : radiusY;
    let high = growX ? roomX : roomY;
    if (ellipsePerimeter(high, fixed) <= needed) {
      low = high;
    } else {
      for (let i = 0; i < 40; i += 1) {
        const mid = (low + high) / 2;
        if (ellipsePerimeter(mid, fixed) < needed) low = mid;
        else high = mid;
      }
      low = high;
    }
    if (growX) radiusX = low;
    else radiusY = low;
  }

  const clampAxis = (value: number, start: number, size: number, radius: number) => {
    const margin = radius + reach;
    return size < margin * 2 ? start + size / 2 : Math.min(Math.max(value, start + margin), start + size - margin);
  };
  const origin = {
    x: clampAxis(center.x, view.x, view.width, radiusX),
    y: clampAxis(center.y, view.y, view.height, radiusY),
  };

  // Walk the ring in small steps from the top, clockwise in screen terms, and
  // drop a satellite every perimeter / count along it.
  const steps = 720;
  const samples: Array<{ t: number; length: number }> = [{ t: -Math.PI / 2, length: 0 }];
  let previous = { x: 0, y: -radiusY };
  let length = 0;
  for (let i = 1; i <= steps; i += 1) {
    const t = -Math.PI / 2 + (i / steps) * Math.PI * 2;
    const next = { x: Math.cos(t) * radiusX, y: Math.sin(t) * radiusY };
    length += Math.hypot(next.x - previous.x, next.y - previous.y);
    samples.push({ t, length });
    previous = next;
  }
  const perimeter = length;
  const points: FanLayout['points'] = [];
  let sample = 0;
  for (let k = 0; k < count; k += 1) {
    const target = (k / count) * perimeter;
    while (sample < samples.length - 2 && samples[sample + 1].length < target) sample += 1;
    const a = samples[sample];
    const b = samples[sample + 1];
    const span = b.length - a.length;
    const t = span > 0 ? a.t + ((target - a.length) / span) * (b.t - a.t) : a.t;
    points.push({
      x: origin.x + Math.cos(t) * radiusX,
      y: origin.y + Math.sin(t) * radiusY,
      angle: Math.atan2(Math.sin(t) * radiusX, Math.cos(t) * radiusY),
    });
  }
  return {
    origin,
    points,
    hitRadius: Math.min(reach, 0.45 * (perimeter / count)),
    radiusX,
    radiusY,
  };
}

/**
 * Moves overlapping labels apart vertically. Labels are handled top to
 * bottom; each takes the smallest shift that clears every label placed before
 * it and keeps it within `bounds`, or, when no such spot exists, the in-bounds
 * shift with the least overlap. Returns each label's shift, in input order,
 * and whether every label ended clear of the others (when not, a caller should
 * offer the choice another way, since overlapping names are ambiguous targets).
 */
export function separateLabels(
  boxes: readonly MapBox[],
  bounds: { top: number; bottom: number },
  gap: number
): { shifts: number[]; clear: boolean } {
  const overlapArea = (a: MapBox, b: MapBox) => {
    const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
    const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
    return width > 0 && height > 0 ? width * height : 0;
  };
  const shifts = boxes.map(() => 0);
  const placed: MapBox[] = [];
  let clear = true;
  const order = boxes.map((box, index) => ({ box, index })).sort((a, b) => a.box.y - b.box.y);
  for (const { box, index } of order) {
    const candidates = new Set<number>([0]);
    for (const other of placed) {
      if (box.x >= other.x + other.width || other.x >= box.x + box.width) continue;
      candidates.add(other.y + other.height + gap - box.y);
      candidates.add(other.y - gap - (box.y + box.height));
    }
    const fits = (shift: number) => box.y + shift >= bounds.top && box.y + shift + box.height <= bounds.bottom;
    const options = [...candidates].filter(fits).sort((a, b) => Math.abs(a) - Math.abs(b));
    if (!options.length) options.push(0);
    const cost = (shift: number) => placed.reduce((sum, other) => sum + overlapArea({ ...box, y: box.y + shift }, other), 0);
    const clearShift = options.find((shift) => cost(shift) === 0);
    if (clearShift === undefined) clear = false;
    const best = clearShift ?? options.reduce((a, b) => (cost(b) < cost(a) ? b : a));
    shifts[index] = best;
    placed.push({ ...box, y: box.y + best });
  }
  return { shifts, clear };
}

/**
 * Whether a fan laid out by `layoutFan` gives each satellite a full touch
 * target (`reach` is half of one). A stack too large for its map gets a list
 * instead, since a fan would shrink its targets below what a finger can hit.
 */
export function fanHasRoomForTargets(layout: Pick<FanLayout, 'hitRadius'>, reach: number): boolean {
  return layout.hitRadius >= reach * 0.9;
}

/**
 * The place a point on the location picker's map stands for, or null when the
 * point lies off the drawn map. A drag past the map's edge is no place, so it
 * must never read as latitude 90 or longitude -180.
 */
export function pickerPointToLocation(
  point: MapPoint,
  map: { width: number; height: number; worldHeight: number }
): { lat: number; long: number } | null {
  if (!(point.x >= 0 && point.x <= map.width && point.y >= 0 && point.y <= map.height)) return null;
  return {
    lat: 90 - (point.y / map.worldHeight) * 180,
    long: (point.x / map.width) * 360 - 180,
  };
}

/**
 * A picker coordinate as the form shows and sends it: six decimals, as the
 * database stores. toFixed keeps the minus sign of a value that rounds to
 * zero, so a pin a hair west of the prime meridian (or south of the equator)
 * would read "-0.000000"; zero is written without a sign.
 */
export function formatPickerCoordinate(value: number): string {
  const fixed = value.toFixed(6);
  return Number(fixed) === 0 ? (0).toFixed(6) : fixed;
}

// ---- The map's view: what part of the drawing the stage shows -------------
// A stage as wide as the drawing (200 by 88 map units) shows all of it. A
// phone's stage is at least 60svh tall (docs/design/map-polish-audit.md § 5),
// so it shows the drawing's full height and part of its width, centred on the
// Atlantic; the map is never letterboxed.

/** The drawn map in map units: the whole width, cropped below about 68°S. */
export const MAP_DRAWING: MapBox = { x: 0, y: 0, width: 200, height: 88 };

/**
 * Map x of the mid-Atlantic, about 32°W. A phone's map opens centred on it:
 * from the Great Lakes to Cape Town on a 375 by 812 phone.
 */
export const ATLANTIC_CENTER_X = 82;

export type MapEdge = 'west' | 'east';

const safeAspect = (aspect: number, drawing: MapBox) => (
  Number.isFinite(aspect) && aspect > 0 ? aspect : drawing.width / drawing.height
);

/**
 * The largest view in the stage's shape (`aspect`, its width over its
 * height) that stays inside the drawing, centred on it.
 */
export function largestMapView(aspect: number, drawing: MapBox = MAP_DRAWING): MapBox {
  const shape = safeAspect(aspect, drawing);
  // A stage in the drawing's shape sees exactly the drawing, without the
  // float error of multiplying back through its aspect.
  const snap = (value: number, edge: number) => (Math.abs(value - edge) < 1e-9 ? edge : value);
  const width = snap(Math.min(drawing.width, drawing.height * shape), drawing.width);
  const height = snap(width / shape, drawing.height);
  return {
    x: drawing.x + (drawing.width - width) / 2,
    y: drawing.y + (drawing.height - height) / 2,
    width,
    height,
  };
}

/**
 * Keeps a view inside the drawing and in the stage's shape, no wider than the
 * largest view and no closer than `maxZoom` times it.
 */
export function clampMapView(box: MapBox, aspect: number, maxZoom: number, drawing: MapBox = MAP_DRAWING): MapBox {
  const largest = largestMapView(aspect, drawing);
  const width = Math.min(largest.width, Math.max(largest.width / Math.max(1, maxZoom), box.width));
  const height = width * (largest.height / largest.width);
  return {
    x: Math.min(Math.max(drawing.x, box.x), drawing.x + drawing.width - width),
    y: Math.min(Math.max(drawing.y, box.y), drawing.y + drawing.height - height),
    width,
    height,
  };
}

/**
 * The view the map opens on, and the one "Reset the map view" returns to:
 * the largest view, centred on `centerX` as far as the drawing allows. On a
 * stage as wide as the drawing that is the whole map, wherever the centre.
 */
export function defaultMapView(aspect: number, centerX: number, drawing: MapBox = MAP_DRAWING): MapBox {
  const largest = largestMapView(aspect, drawing);
  return clampMapView({ ...largest, x: centerX - largest.width / 2 }, aspect, 1, drawing);
}

/**
 * Moves a view toward one side by most of its width, keeping a sliver of
 * what it showed so the move can be followed, and stopping at the drawing's
 * edge.
 */
export function panMapView(view: MapBox, edge: MapEdge, drawing: MapBox = MAP_DRAWING, keep = 0.15): MapBox {
  const step = view.width * (1 - keep);
  const x = edge === 'east' ? view.x + step : view.x - step;
  return { ...view, x: Math.min(Math.max(drawing.x, x), drawing.x + drawing.width - view.width) };
}

/** How many points lie past a view's west and east edges. */
export function pointsBeyondView(view: MapBox, points: readonly MapPoint[]): Record<MapEdge, number> {
  let west = 0;
  let east = 0;
  for (const point of points) {
    if (point.x < view.x) west += 1;
    else if (point.x > view.x + view.width) east += 1;
  }
  return { west, east };
}

// ---- Pins on the drawing's edge -------------------------------------------
// docs/design/map-polish-audit.md § 5, "Edge pins": "A valid point on the
// map's edge, such as a confirmed place on the 180th meridian, still draws
// half outside the drawing. The build keeps the audit's clamp: the rendered
// pin and its hover and focus target sit inside the drawable inset, and the
// data keeps the true coordinate."

/** A pin's hit circle at its smallest, in map units. */
export const PIN_HIT_RADIUS = 4.8;

/**
 * Where a pin is drawn: its point, kept `inset` map units inside the
 * drawing so the pin and its hit circle never cross the edge. Only the
 * drawing moves; the node keeps its true coordinate.
 *
 * The stage clips the drawing to rounded corners. With `cornerRadius` (in
 * map units) larger than the inset, a pin in a corner's square also keeps
 * its circle inside the curve: its centre stays within `cornerRadius -
 * inset` of the corner's arc centre.
 */
export function clampPinToDrawing(
  point: MapPoint,
  inset = PIN_HIT_RADIUS,
  drawing: MapBox = MAP_DRAWING,
  cornerRadius = 0
): MapPoint {
  const x = Math.min(Math.max(point.x, drawing.x + inset), drawing.x + drawing.width - inset);
  const y = Math.min(Math.max(point.y, drawing.y + inset), drawing.y + drawing.height - inset);
  if (cornerRadius <= inset) return { x, y };
  const left = drawing.x + cornerRadius;
  const right = drawing.x + drawing.width - cornerRadius;
  const top = drawing.y + cornerRadius;
  const bottom = drawing.y + drawing.height - cornerRadius;
  const arcX = x < left ? left : x > right ? right : null;
  const arcY = y < top ? top : y > bottom ? bottom : null;
  if (arcX === null || arcY === null) return { x, y };
  const reach = cornerRadius - inset;
  const distance = Math.hypot(x - arcX, y - arcY);
  if (distance <= reach) return { x, y };
  return { x: arcX + ((x - arcX) / distance) * reach, y: arcY + ((y - arcY) / distance) * reach };
}

// ---- Labels at rest -------------------------------------------------------
// § 5: "Chapter labels at rest ... The highest featuredWeight goes first.
// Each label tries right, left, above and below its dot, and hides when it
// would touch another label, a pin, a badge, a bar or the dock."

export type LabelSide = 'right' | 'left' | 'above' | 'below';

/** The order a label tries the sides of its dot. */
export const LABEL_SIDES: readonly LabelSide[] = ['right', 'left', 'above', 'below'];

export type MapCircle = { center: MapPoint; radius: number };

/** A label to place: its dot, the gap it keeps from it, and its size. */
export type LabelRequest = { anchor: MapPoint; gap: number; width: number; height: number };

export type PlacedLabel = { side: LabelSide; box: MapBox } | null;

/** The box a label takes on one side of its dot, centred on that side. */
export function labelBoxOnSide(request: LabelRequest, side: LabelSide): MapBox {
  const { anchor, gap, width, height } = request;
  switch (side) {
    case 'right':
      return { x: anchor.x + gap, y: anchor.y - height / 2, width, height };
    case 'left':
      return { x: anchor.x - gap - width, y: anchor.y - height / 2, width, height };
    case 'above':
      return { x: anchor.x - width / 2, y: anchor.y - gap - height, width, height };
    case 'below':
      return { x: anchor.x - width / 2, y: anchor.y + gap, width, height };
  }
}

// Touching counts: boxes that share an edge, or a circle that reaches a box.
const boxesTouch = (a: MapBox, b: MapBox) => (
  a.x <= b.x + b.width && b.x <= a.x + a.width && a.y <= b.y + b.height && b.y <= a.y + a.height
);

const boxTouchesCircle = (box: MapBox, circle: MapCircle) => {
  const nearestX = Math.min(Math.max(circle.center.x, box.x), box.x + box.width);
  const nearestY = Math.min(Math.max(circle.center.y, box.y), box.y + box.height);
  return Math.hypot(circle.center.x - nearestX, circle.center.y - nearestY) <= circle.radius;
};

const boxInside = (box: MapBox, bounds: MapBox) => (
  box.x >= bounds.x &&
  box.y >= bounds.y &&
  box.x + box.width <= bounds.x + bounds.width &&
  box.y + box.height <= bounds.y + bounds.height
);

/**
 * Places labels in the order given, the most important first. Each takes the
 * first side of its dot where it lies inside `bounds` (the map in view) and
 * touches no circle (pins, badges), no box (bars, the dock) and no label
 * placed before it. A label with no such side hides (null). A label's own
 * dot never blocks it, because its gap clears the dot's circle.
 */
export function placeMapLabels(
  requests: readonly LabelRequest[],
  obstacles: { circles: readonly MapCircle[]; boxes: readonly MapBox[] },
  bounds: MapBox
): PlacedLabel[] {
  const placed: MapBox[] = [];
  return requests.map((request) => {
    for (const side of LABEL_SIDES) {
      const box = labelBoxOnSide(request, side);
      if (!boxInside(box, bounds)) continue;
      if (obstacles.circles.some((circle) => boxTouchesCircle(box, circle))) continue;
      if (obstacles.boxes.some((other) => boxesTouch(box, other))) continue;
      if (placed.some((other) => boxesTouch(box, other))) continue;
      placed.push(box);
      return { side, box };
    }
    return null;
  });
}
