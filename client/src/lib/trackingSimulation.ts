export type Coordinate = [number, number];

const KOLKATA_WAREHOUSE: Coordinate = [22.57216, 88.37568];

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceBetween(a: Coordinate, b: Coordinate) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b[0] - a[0]);
  const dLng = toRadians(b[1] - a[1]);
  const lat1 = toRadians(a[0]);
  const lat2 = toRadians(b[0]);
  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function interpolateRoute(route: Coordinate[], progress: number): Coordinate {
  if (route.length < 2) {
    return route[0] ?? KOLKATA_WAREHOUSE;
  }

  const clamped = clamp(progress, 0, 1);
  const scaled = clamped * (route.length - 1);
  const index = Math.floor(scaled);
  const next = Math.min(index + 1, route.length - 1);
  const fraction = scaled - index;
  const start = route[index];
  const end = route[next];

  return [
    start[0] + (end[0] - start[0]) * fraction,
    start[1] + (end[1] - start[1]) * fraction,
  ];
}

function locationKey(name: string | undefined) {
  return String(name ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function resolveNamedLocation(name: string | undefined, shipmentId: string, trailerId: string, kind: "origin" | "destination") {
  const key = locationKey(name);
  if (!key) return KOLKATA_WAREHOUSE;
  if (key.includes("kolkata")) return KOLKATA_WAREHOUSE;

  const seed = hashText(`${kind}|${shipmentId}|${trailerId}|${key}`);
  const lat = 22.45 + (seed % 61) * 0.012;
  const lng = 87.9 + ((seed >> 8) % 57) * 0.013;
  return [Number(lat.toFixed(5)), Number(lng.toFixed(5))] as Coordinate;
}

export function buildTrackingRoute(shipment: any) {
  const shipmentId = shipment?.shipment_id ?? "SHP00000";
  const trailerId = shipment?.trailer_id ?? "TR0000";
  const originName = shipment?.origin ?? "Origin Warehouse";
  const destinationName = shipment?.destination ?? "Kolkata Warehouse";
  const sourceSeed = hashText(`${shipmentId}|${trailerId}|${originName}|${destinationName}`);

  const origin: Coordinate = resolveNamedLocation(originName, shipmentId, trailerId, "origin");
  const destination: Coordinate = destinationName.toLowerCase().includes("kolkata")
    ? KOLKATA_WAREHOUSE
    : resolveNamedLocation(destinationName, shipmentId, trailerId, "destination");

  const bearingOffset = (sourceSeed % 2 === 0 ? 1 : -1) * 0.0035;
  const waypointA: Coordinate = [
    origin[0] + ((destination[0] - origin[0]) * 0.28) + bearingOffset,
    origin[1] + ((destination[1] - origin[1]) * 0.28),
  ];
  const waypointB: Coordinate = [
    origin[0] + ((destination[0] - origin[0]) * 0.72) - bearingOffset,
    origin[1] + ((destination[1] - origin[1]) * 0.72),
  ];

  const route: Coordinate[] = [origin, waypointA, waypointB, destination];
  const routeLengthKm = route.slice(1).reduce((total, point, index) => {
    const previous = route[index];
    return total + distanceBetween(previous, point);
  }, 0);

  const statusProgress = shipment?.status === "Delivered" ? 1 : shipment?.status === "At Yard" ? 0.9 : shipment?.status === "Delayed" ? 0.55 : 0.35;
  const baseProgress = Number(shipment?.progress ?? 0) / 100;
  const progress = clamp(Number.isFinite(baseProgress) ? baseProgress : statusProgress, 0, 1);
  const current = interpolateRoute(route, progress);
  const remainingKm = distanceBetween(current, destination);
  const speedKmh = Math.max(18, Math.min(78, 32 + (sourceSeed % 30)));

  return {
    origin,
    destination,
    route,
    current,
    progress,
    routeLengthKm,
    remainingKm,
    speedKmh,
    status: shipment?.status ?? "In Transit",
  };
}

export function buildTrackingSnapshot(shipment: any, manualProgress?: number) {
  const data = buildTrackingRoute(shipment);
  const progress = manualProgress == null ? data.progress : clamp(manualProgress, 0, 1);
  const current = interpolateRoute(data.route, progress);
  const remainingKm = distanceBetween(current, data.destination);
  const etaMinutes = Math.max(10, Math.round((remainingKm / data.speedKmh) * 60));

  return {
    ...data,
    current,
    progress,
    remainingKm,
    etaMinutes,
    routeSummary: `${data.origin[0].toFixed(4)}, ${data.origin[1].toFixed(4)} → ${data.destination[0].toFixed(4)}, ${data.destination[1].toFixed(4)}`,
  };
}
