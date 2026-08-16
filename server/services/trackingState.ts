type ShipmentRow = Record<string, string>;

function hash(input: string) {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }

export function buildShipmentTrackingState(shipment: ShipmentRow) {
  const shipmentId = shipment.shipment_id;
  const trailerId = shipment.trailer_id;
  const origin = shipment.origin;
  const destination = shipment.destination;
  const seed = hash(`${shipmentId}|${trailerId}|${origin}|${destination}`);
  const actualLatitude = Number(shipment.current_lat);
  const actualLongitude = Number(shipment.current_lon);
  const hasCoordinates = Number.isFinite(actualLatitude) && Number.isFinite(actualLongitude);
  const sequence = Number(shipmentId.replace(/\D/g, "")) || seed;
  const progress = shipment.status === "Delivered" ? 96 + (sequence % 5) : shipment.status === "At Yard" ? 80 + (sequence % 15) : shipment.status === "Delayed" ? 45 + (sequence % 35) : 20 + (sequence % 65);
  const routeToken = String(seed % 900 + 100);
  const route = [
    origin,
    `${origin} linehaul checkpoint ${routeToken}`,
    `${destination} approach ${String((seed >>> 8) % 7 + 1)}`,
    destination,
  ];
  const currentLocation = hasCoordinates ? `${actualLatitude.toFixed(5)}, ${actualLongitude.toFixed(5)}` : `${origin} → ${destination} · ${progress}% complete`;
  return {
    shipment_id: shipmentId,
    trailer_id: trailerId,
    origin,
    destination,
    route,
    route_label: route.join(" → "),
    progress,
    latitude: hasCoordinates ? String(actualLatitude) : "",
    longitude: hasCoordinates ? String(actualLongitude) : "",
    current_location: currentLocation,
    tracking_state_key: `${shipmentId}:${trailerId}`,
    tracking_state_source: hasCoordinates ? "shipments.csv current_lat/current_lon + deterministic route" : "deterministic route fallback",
  };
}
