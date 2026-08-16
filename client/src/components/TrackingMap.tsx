import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const truckIcon = L.divIcon({
  className: "truck-marker",
  html: `<div style="display:grid;place-items:center;height:20px;width:20px;border-radius:9999px;background:#0ea5e9;border:2px solid #fff;box-shadow:0 8px 18px rgba(14,165,233,.25);color:#fff;font-size:10px;font-weight:700;">T</div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});

const originIcon = L.divIcon({
  className: "origin-marker",
  html: `<div style="display:grid;place-items:center;height:18px;width:18px;border-radius:9999px;background:#16a34a;border:2px solid #fff;box-shadow:0 8px 18px rgba(22,163,74,.25);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const destinationIcon = L.divIcon({
  className: "destination-marker",
  html: `<div style="display:grid;place-items:center;height:18px;width:18px;border-radius:9999px;background:#ef4444;border:2px solid #fff;box-shadow:0 8px 18px rgba(239,68,68,.25);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function FitMapView({ route, current }: { route: [number, number][]; current: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (!route.length) return;
    const points = [...route, current] as [number, number][];
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 12 });
  }, [map, route, current]);
  return null;
}

export type TrackingMapProps = { shipment: any; snapshot: any };

export default function TrackingMap({ shipment, snapshot }: TrackingMapProps) {
  const points = useMemo(() => snapshot.route.map((point: [number, number]) => [point[0], point[1]] as [number, number]), [snapshot.route]);
  const truckPoint = snapshot.current as [number, number];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-600">Simulated GPS</p>
          <h3 className="mt-1 text-sm font-semibold text-slate-800">{shipment?.shipment_id ?? "Shipment"} route view</h3>
        </div>
        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-semibold text-sky-700">Deterministic simulation</span>
      </div>

      <div className="h-[280px] w-full">
        <MapContainer center={truckPoint} zoom={8} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitMapView route={points} current={truckPoint} />
          <Polyline positions={points} pathOptions={{ color: "#0ea5e9", weight: 4, opacity: 0.8 }} />
          <Marker position={snapshot.origin} icon={originIcon}>
            <Popup>Origin: {shipment?.origin}</Popup>
          </Marker>
          <Marker position={snapshot.destination} icon={destinationIcon}>
            <Popup>Destination: {shipment?.destination}</Popup>
          </Marker>
          <Marker position={truckPoint} icon={truckIcon}>
            <Popup>
              <div>
                <strong>{shipment?.tracking_number}</strong><br />
                {shipment?.status} · {shipment?.trailer_id}
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}
