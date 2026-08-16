import { useEffect, useMemo, useState } from "react";
import { CalendarClock, MapPin, Search, X } from "lucide-react";
import { buildTrackingSnapshot } from "@/lib/trackingSimulation";
import TrackingMap from "@/components/TrackingMap";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function money(value: string | number | undefined) {
  return `₹${Number(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_-24px_rgba(15,23,42,.35)]", className)}>{children}</div>;
}

function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "blue" | "green" | "amber" | "red" }) {
  const colors = { slate: "bg-slate-100 text-slate-600", blue: "bg-blue-50 text-blue-700", green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", red: "bg-rose-50 text-rose-700" };
  return <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", colors[tone])}>{children}</span>;
}

function statusTone(status?: string): "blue" | "green" | "amber" | "red" {
  if (status === "Delayed") return "red";
  if (status === "Delivered") return "green";
  if (status === "At Yard") return "amber";
  return "blue";
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return <div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value ?? "—"}</p></div>;
}

export type ShipmentTrackingProps = { shipments?: any[]; detail?: any; selectedShipmentId?: string; setSelectedShipmentId: (id: string) => void };

export default function ShipmentTracking({ shipments = [], detail, selectedShipmentId, setSelectedShipmentId }: ShipmentTrackingProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [priority, setPriority] = useState("All priorities");

  const statuses = useMemo(() => Array.from(new Set(shipments.map(row => row.status).filter(Boolean))), [shipments]);
  const priorities = useMemo(() => Array.from(new Set(shipments.map(row => row.priority).filter(Boolean))), [shipments]);
  const filtered = useMemo(() => shipments.filter(row => {
    const haystack = [row.shipment_id, row.po_id, row.trailer_id, row.origin, row.destination, row.current_location, row.status].join(" ").toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) && (status === "All statuses" || row.status === status) && (priority === "All priorities" || row.priority === priority);
  }), [shipments, query, status, priority]);

  useEffect(() => {
    if (!filtered.length) {
      if (selectedShipmentId) setSelectedShipmentId("");
      return;
    }

    const visibleIds = new Set(filtered.map(row => row.shipment_id));
    const hasSelectedVisibleRow = selectedShipmentId && visibleIds.has(selectedShipmentId);

    if (filtered.length === 1) {
      if (selectedShipmentId !== filtered[0].shipment_id) setSelectedShipmentId(filtered[0].shipment_id);
      return;
    }

    if (!selectedShipmentId || !hasSelectedVisibleRow) {
      setSelectedShipmentId(filtered[0].shipment_id);
    }
  }, [filtered, selectedShipmentId, setSelectedShipmentId]);

  return <>
    <div className="mb-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-600">E2 / Logistics</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Shipment Tracking</h1>
      <p className="mt-1 text-sm text-slate-500">Backend-sourced visibility across PO, trailer, current location, ETA, yard, dock, and receiving.</p>
    </div>

    <Card className="mb-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="font-semibold">Inbound shipment register</h3>
          <p className="mt-1 text-xs text-slate-500">{filtered.length} of {shipments.length} shipments from shipments.csv</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search shipment, PO, trailer, route..." className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-cyan-400 sm:w-72" />
          </div>
          <select value={status} onChange={event => setStatus(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">
            <option>All statuses</option>
            {statuses.map(value => <option key={value}>{value}</option>)}
          </select>
          <select value={priority} onChange={event => setPriority(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm">
            <option>All priorities</option>
            {priorities.map(value => <option key={value}>{value}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="pb-3">Shipment ID</th>
              <th className="pb-3">PO ID</th>
              <th className="pb-3">Trailer / Truck</th>
              <th className="pb-3">Origin</th>
              <th className="pb-3">Destination</th>
              <th className="pb-3">Current Location</th>
              <th className="pb-3">ETA</th>
              <th className="pb-3">Scheduled Arrival</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Priority</th>
              <th className="pb-3">Delay</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(row => (
              <tr key={row.shipment_id} className={cn("cursor-pointer hover:bg-cyan-50/40", selectedShipmentId === row.shipment_id ? "bg-cyan-50/60" : "")} onClick={() => setSelectedShipmentId(row.shipment_id)}>
                <td className="py-3 font-semibold text-cyan-700">{row.shipment_id}</td>
                <td className="py-3 text-slate-600">{row.po_id}</td>
                <td className="py-3"><div className="font-semibold">{row.trailer_id}</div><div className="text-[11px] text-slate-400">{row.trailer_type ?? row.truck_type ?? "Trailer"}</div></td>
                <td className="py-3 text-slate-600">{row.origin}</td>
                <td className="py-3 text-slate-600">{row.destination}</td>
                <td className="py-3 text-slate-600">{row.current_location}</td>
                <td className="py-3 text-slate-600">{formatDate(row.eta)}</td>
                <td className="py-3 text-slate-600">{formatDate(row.scheduled_arrival)}</td>
                <td className="py-3"><Badge tone={statusTone(row.status)}>{row.status}</Badge></td>
                <td className="py-3"><Badge tone={row.priority === "High" ? "amber" : row.priority === "Medium" ? "blue" : "slate"}>{row.priority}</Badge></td>
                <td className="py-3 text-slate-600">{row.delay_duration ?? (Number(row.delay_minutes ?? 0) > 0 ? `${row.delay_minutes}m` : "—")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>

    {detail && selectedShipmentId && <ShipmentDetail detail={detail} onClose={() => setSelectedShipmentId("")} />}
  </>;
}

function ShipmentDetail({ detail, onClose }: { detail: any; onClose: () => void }) {
  const shipment = detail.shipment;
  const po = detail.po;
  const trailer = detail.trailer;
  const yard = detail.yard;
  const assignment = detail.assignment;
  const shipmentId = shipment.shipment_id;
  const [trackingState, setTrackingState] = useState<Record<string, { progress: number; isRunning: boolean }>>({});
  const activeState = trackingState[shipmentId] ?? { progress: Math.min(1, Number(shipment.progress ?? 0) / 100 || 0.35), isRunning: false };
  const snapshot = useMemo(() => buildTrackingSnapshot(shipment, activeState.progress), [shipment, activeState.progress]);

  useEffect(() => {
    setTrackingState(prev => prev[shipmentId]
      ? prev
      : { ...prev, [shipmentId]: { progress: Math.min(1, Number(shipment.progress ?? 0) / 100 || 0.35), isRunning: false } });
  }, [shipmentId, shipment.progress]);

  useEffect(() => {
    if (!activeState.isRunning) return;
    const interval = window.setInterval(() => {
      setTrackingState(prev => {
        const current = prev[shipmentId] ?? { progress: Math.min(1, Number(shipment.progress ?? 0) / 100 || 0.35), isRunning: false };
        const next = Math.min(1, current.progress + 0.05);
        return { ...prev, [shipmentId]: { progress: next, isRunning: next < 1 } };
      });
    }, 3000);
    return () => window.clearInterval(interval);
  }, [activeState.isRunning, shipmentId, shipment.progress]);

  return <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-600">Selected shipment</p>
          <h2 className="mt-1 text-xl font-semibold">{shipment.shipment_id} · {shipment.tracking_number}</h2>
          <p className="mt-1 text-sm text-slate-500">{shipment.origin} → {shipment.destination}</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Shipment status" value={<Badge tone={statusTone(shipment.status)}>{shipment.status}</Badge>} />
        <Field label="PO ID" value={po ? `${po.po_id} · ${money(po.total_amount)}` : shipment.po_id} />
        <Field label="Trailer / Truck" value={trailer ? `${trailer.trailer_id} · ${trailer.trailer_type}` : shipment.trailer_id} />
        <Field label="Current location" value={shipment.current_location} />
        <Field label="ETA" value={formatDate(shipment.eta)} />
        <Field label="Scheduled arrival" value={formatDate(shipment.scheduled_arrival)} />
        <Field label="Priority" value={shipment.priority} />
        <Field label="Progress" value={`${Math.round(snapshot.progress * 100)}%`} />
        <Field label="Route" value={shipment.route_label ?? shipment.route?.join(" → ")} />
        <Field label="Delay / risk" value={<span className={shipment.delay_minutes !== "0" ? "text-rose-600" : "text-emerald-600"}>{shipment.delay_duration} · {detail.risk}</span>} />
        <Field label="Yard / Dock" value={`${yard?.yard_location_id ?? shipment.yard_location_id ?? "—"} / ${assignment?.dock_id ?? shipment.dock_id ?? "—"}`} />
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarClock size={17} className="text-cyan-600" />
            <h3 className="font-semibold">Operational Timeline</h3>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setTrackingState(prev => ({ ...prev, [shipmentId]: { progress: prev[shipmentId]?.progress ?? activeState.progress, isRunning: true } }))} className="rounded-lg bg-cyan-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-cyan-500">Start Tracking</button>
            <button onClick={() => setTrackingState(prev => ({ ...prev, [shipmentId]: { progress: prev[shipmentId]?.progress ?? activeState.progress, isRunning: false } }))} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">Pause</button>
            <button onClick={() => setTrackingState(prev => ({ ...prev, [shipmentId]: { progress: 0.15, isRunning: false } }))} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">Reset</button>
          </div>
        </div>

        <div className="space-y-4">
          {(detail.timeline ?? []).map((event: any, index: number) => (
            <div key={`${event.label}-${index}`} className="flex gap-3">
              <div className="mt-1 flex flex-col items-center">
                <div className={cn("h-2.5 w-2.5 rounded-full", index === 0 ? "bg-cyan-500" : "bg-slate-300")} />
                <div className={cn("w-px flex-1 border-l border-dashed", index === (detail.timeline ?? []).length - 1 ? "border-transparent" : "border-slate-300")} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-800">{event.label}</p>
                  {event.status && <Badge tone={event.status === "Delayed" || event.status === "Not assigned" ? "red" : event.status === "Accepted" || event.status === "Departed origin" ? "green" : "blue"}>{event.status}</Badge>}
                </div>
                <p className="mt-1 text-xs text-slate-500">{event.id ?? "—"}</p>
                <p className="mt-1 text-[11px] text-slate-400">{event.timestamp ? formatDate(event.timestamp) : "—"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>

    <Card className="min-h-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-600">Live route</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">Truck location telemetry</h3>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
          <MapPin size={12} /> {snapshot.remainingKm.toFixed(1)} km to destination
        </div>
      </div>

      <TrackingMap shipment={shipment} snapshot={snapshot} />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Speed</p>
          <p className="mt-1 text-lg font-semibold text-slate-800">{snapshot.speedKmh.toFixed(0)} km/h</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Distance remaining</p>
          <p className="mt-1 text-lg font-semibold text-slate-800">{snapshot.remainingKm.toFixed(1)} km</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">ETA drift</p>
          <p className="mt-1 text-lg font-semibold text-slate-800">{snapshot.etaMinutes} min</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Current coordinate</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{snapshot.current[0].toFixed(5)}, {snapshot.current[1].toFixed(5)}</p>
        </div>
      </div>
    </Card>
  </div>;
}
