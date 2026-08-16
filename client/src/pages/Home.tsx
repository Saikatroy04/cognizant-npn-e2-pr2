import { useMemo, useState, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import ShipmentTracking from "@/components/ShipmentTracking";
import { toast } from "sonner";
import {
  BarChart3,
  Bell,
  Boxes,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  MapPinned,
  Menu,
  PackageCheck,
  Search,
  Truck,
  X,
} from "lucide-react";

/* =========================================================
   NAVIGATION
========================================================= */

const nav = [
  { id: "Control Tower", icon: LayoutDashboard },
  { id: "Procurement", icon: ClipboardCheck },
  { id: "Logistics", icon: Truck },
  { id: "Yard and Dock", icon: MapPinned },
  { id: "Invoicing", icon: FileText },
  { id: "Matching", icon: PackageCheck },
  { id: "Exceptions", icon: Bell },
  { id: "Analytics", icon: BarChart3 },
];

/* =========================================================
   HELPERS
========================================================= */

const cn = (...values: string[]) =>
  values.filter(Boolean).join(" ");

const money = (value: string | number | null | undefined) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

/* =========================================================
   SMALL UI COMPONENTS
========================================================= */

function Badge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: string;
}) {
  const colors: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-rose-50 text-rose-700",
    blue: "bg-blue-50 text-blue-700",
  };

  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] font-semibold",
        colors[tone] ?? colors.slate
      )}
    >
      {children}
    </span>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-600">
        {eyebrow}
      </p>

      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
        {title}
      </h1>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_-24px_rgba(15,23,42,.35)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function BarList({
  items,
  color = "bg-cyan-500",
}: {
  items?: { name: string; value: number }[];
  color?: string;
}) {
  const safeItems = items ?? [];

  const max = Math.max(
    ...safeItems.map((item) => Number(item.value || 0)),
    1
  );

  return (
    <div className="space-y-3">
      {safeItems.map((item) => (
        <div key={item.name}>
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>{item.name}</span>
            <span className="font-semibold text-slate-800">
              {item.value}
            </span>
          </div>

          <div className="h-2 rounded-full bg-slate-100">
            <div
              className={cn("h-2 rounded-full", color)}
              style={{
                width: `${Math.max(
                  7,
                  (Number(item.value || 0) / max) * 100
                )}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   CONTROL TOWER
========================================================= */

function Dashboard({
  summary,
  alerts,
  decisions,
  onNavigate,
}: any) {
  const kpis = [
    {
      label: "Active Purchase Orders",
      value: summary?.activePurchaseOrders ?? "—",
      icon: ClipboardCheck,
      tint: "bg-cyan-50 text-cyan-700",
    },
    {
      label: "Inbound Shipments",
      value: summary?.inboundShipments ?? "—",
      icon: Truck,
      tint: "bg-blue-50 text-blue-700",
    },
    {
      label: "Delayed Trucks",
      value: summary?.delayedTrucks ?? "—",
      icon: CircleAlert,
      tint: "bg-rose-50 text-rose-700",
    },
    {
      label: "Available Docks",
      value: summary?.availableDocks ?? "—",
      icon: MapPinned,
      tint: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Pending Invoices",
      value: summary?.pendingInvoices ?? "—",
      icon: FileText,
      tint: "bg-amber-50 text-amber-700",
    },
    {
      label: "Open Anomalies",
      value: summary?.openAnomalies ?? "—",
      icon: Bell,
      tint: "bg-violet-50 text-violet-700",
    },
  ];

  return (
    <>
      <SectionTitle
        eyebrow="Control Tower / E2 + PR2"
        title="Operations at a glance"
        description="A live view of procurement commitments, inbound flow, yard capacity, and payment exceptions."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {kpis.map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.label}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500">
                    {item.label}
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {item.value}
                  </p>
                </div>

                <div
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-xl",
                    item.tint
                  )}
                >
                  <Icon size={18} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">
                Critical operational alerts
              </h3>

              <p className="text-xs text-slate-500">
                AI-detected issues requiring attention
              </p>
            </div>

            <Badge tone="red">
              {alerts?.length ?? 0} alerts
            </Badge>
          </div>

          <div className="space-y-3">
            {(alerts ?? []).slice(0, 6).map((alert: any) => (
              <div
                key={alert.alert_id}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {alert.alert_type}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {alert.message}
                    </p>

                    <p className="mt-2 text-[11px] text-slate-400">
                      Reference: {alert.reference_id}
                    </p>
                  </div>

                  <Badge
                    tone={
                      alert.severity === "Critical" ||
                      alert.severity === "High"
                        ? "red"
                        : "amber"
                    }
                  >
                    {alert.severity}
                  </Badge>
                </div>
              </div>
            ))}

            {(!alerts || alerts.length === 0) && (
              <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
                No active alerts.
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <BrainCircuit
              size={18}
              className="text-violet-600"
            />

            <div>
              <h3 className="font-semibold">
                AI decisions
              </h3>

              <p className="text-xs text-slate-500">
                Recent explainable recommendations
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {(decisions ?? []).slice(0, 5).map((decision: any) => (
              <div
                key={decision.decision_id}
                className="rounded-xl bg-slate-50 p-3"
              >
                <div className="flex justify-between">
                  <span className="text-xs font-semibold">
                    {decision.decision_type}
                  </span>

                  <Badge tone="blue">
                    {Math.round(
                      Number(decision.confidence || 0) * 100
                    )}
                    %
                  </Badge>
                </div>

                <p className="mt-1 text-sm text-slate-700">
                  {decision.recommendation}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {decision.reason}
                </p>
              </div>
            ))}

            {(!decisions || decisions.length === 0) && (
              <p className="text-sm text-slate-500">
                No recent AI decisions.
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="mb-4">
          <h3 className="font-semibold">
            Quick actions
          </h3>

          <p className="text-xs text-slate-500">
            Jump directly to an operational workflow.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Procurement", "Create requisition / PO"],
            ["Logistics", "Track shipments"],
            ["Yard and Dock", "Manage dock allocation"],
            ["Matching", "Run 3-way matching"],
          ].map(([name, description]) => (
            <button
              key={name}
              onClick={() => onNavigate(name)}
              className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-cyan-300 hover:bg-cyan-50"
            >
              <p className="text-sm font-semibold">
                {name}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {description}
              </p>
            </button>
          ))}
        </div>
      </Card>
    </>
  );
}

/* =========================================================
   PROCUREMENT
========================================================= */

function Procurement({
  request,
  setRequest,
  extracted,
  runExtraction,
  createFromExtraction,
  generatePo,
  createdReqId,
  generatedPo,
  extractPending,
  poPending,
  recommendations,
}: any) {
  return (
    <>
      <SectionTitle
        eyebrow="PR2 / Procurement"
        title="Procurement Assistant"
        description="Turn natural-language demand into a traceable requisition, supplier decision, and purchase order."
      />

      <div className="grid gap-5 xl:grid-cols-[1.05fr_1fr]">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <BrainCircuit
              className="text-cyan-600"
              size={19}
            />

            <h3 className="font-semibold">
              Conversational request intake
            </h3>
          </div>

          <textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            className="min-h-32 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-cyan-400"
          />

          <button
            onClick={runExtraction}
            disabled={extractPending}
            className="mt-3 rounded-xl bg-[#0b1a2a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {extractPending
              ? "Extracting..."
              : "Extract procurement fields"}
          </button>

          {extracted && (
            <div className="mt-5 rounded-xl border border-cyan-100 bg-cyan-50/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">
                  Structured extraction
                </span>

                <Badge tone="green">
                  {Math.round(
                    Number(extracted.confidence || 0) * 100
                  )}
                  % confidence
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-slate-500">
                    Product
                  </span>

                  <p className="font-semibold">
                    {extracted.product ?? extracted.productId}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-slate-500">
                    Quantity
                  </span>

                  <p className="font-semibold">
                    {extracted.quantity}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-slate-500">
                    Destination
                  </span>

                  <p className="font-semibold">
                    {extracted.destination}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-slate-500">
                    Priority / required
                  </span>

                  <p className="font-semibold">
                    {extracted.priority} ·{" "}
                    {extracted.requiredDate}
                  </p>
                </div>
              </div>

              {Array.isArray(extracted.reasoning) &&
                extracted.reasoning.length > 0 && (
                  <div className="mt-4 border-t border-cyan-100 pt-3 text-xs text-slate-600">
                    <p className="mb-1 font-semibold text-slate-700">
                      Why these fields?
                    </p>

                    {extracted.reasoning.map(
                      (reason: string) => (
                        <p key={reason}>• {reason}</p>
                      )
                    )}
                  </div>
                )}

              <button
                onClick={createFromExtraction}
                className="mt-4 w-full rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-[#0b1a2a] hover:bg-cyan-400"
              >
                {createdReqId
                  ? `Requisition ${createdReqId} created`
                  : "Create requisition"}
              </button>

              <button
                onClick={generatePo}
                disabled={poPending}
                className="mt-2 w-full rounded-xl border border-cyan-300 bg-white px-4 py-2.5 text-sm font-bold text-cyan-800 hover:bg-cyan-50 disabled:opacity-50"
              >
                {poPending
                  ? "Generating PO..."
                  : "Generate purchase order"}
              </button>
            </div>
          )}
        </Card>


<Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">
                Supplier recommendation
              </h3>

              <p className="text-xs text-slate-500">
                Explainable supplier scoring
              </p>
            </div>

            <BrainCircuit
              size={19}
              className="text-violet-600"
            />
          </div>

          <div className="space-y-3">
            {(recommendations ?? [])
              .slice(0, 4)
              .map((item: any, index: number) => (
                <div
                  key={
                    item.supplier?.supplier_id ??
                    `supplier-${index}`
                  }
                  className={cn(
                    "rounded-xl border p-4",
                    index === 0
                      ? "border-cyan-200 bg-cyan-50/60"
                      : "border-slate-200 bg-slate-50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold">
                        {item.supplier?.supplier_name ??
                          "Supplier"}
                      </p>

                      <p className="text-xs text-slate-500">
                        {item.score ?? "—"} score
                      </p>
                    </div>

                    {index === 0 && (
                      <Badge tone="green">
                        Recommended
                      </Badge>
                    )}
                  </div>

                  {item.reasons && (
                    <div className="mt-2 text-xs text-slate-600">
                      {item.reasons
                        .slice(0, 3)
                        .map((reason: string) => (
                          <p key={reason}>• {reason}</p>
                        ))}
                    </div>
                  )}
                </div>
              ))}

            {(!recommendations ||
              recommendations.length === 0) && (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                Supplier recommendations will appear here after
                extraction.
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

/* =========================================================
   LOGISTICS
========================================================= */

function LogisticsFallback({
  shipments,
  selectedShipmentId,
  setSelectedShipmentId,
}: any) {
  return (
    <>
      <SectionTitle
        eyebrow="E2 / Logistics"
        title="Shipment Tracking"
        description="Track inbound shipments, trailers, destinations, and ETA."
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold">
            Inbound shipments
          </h3>

          <div className="space-y-2">
            {(shipments ?? [])
              .slice(0, 20)
              .map((shipment: any) => (
                <button
                  key={shipment.shipment_id}
                  onClick={() =>
                    setSelectedShipmentId(
                      shipment.shipment_id
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 p-4 text-left hover:border-cyan-300 hover:bg-cyan-50"
                >
                  <div className="flex justify-between">
                    <span className="font-semibold">
                      {shipment.shipment_id}
                    </span>

                    <Badge
                      tone={
                        shipment.status === "Delayed"
                          ? "red"
                          : "green"
                      }
                    >
                      {shipment.status}
                    </Badge>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    PO: {shipment.po_id}
                  </p>

                  <p className="text-xs text-slate-500">
                    Destination: {shipment.destination}
                  </p>
                </button>
              ))}

            {(!shipments || shipments.length === 0) && (
              <p className="text-sm text-slate-500">
                No shipment records found.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold">
            Selected shipment
          </h3>

          {selectedShipmentId ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm">
                Shipment ID:{" "}
                <strong>{selectedShipmentId}</strong>
              </p>

              <button
                onClick={() => setSelectedShipmentId("")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
              >
                Clear selection
              </button>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              Select a shipment to view its operational details.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}

/* =========================================================
   YARD / DOCK
========================================================= */

function YardDock({
  docks,
  yard,
  trailers,
  selectedTrailer,
  setSelectedTrailer,
  recommendDock,
  assignDock,
}: any) {
  const recommendations =
    recommendDock?.data?.recommendations ?? [];

  const bestRecommendation =
    recommendations[0];

  const selectedTrailerData =
    (trailers ?? []).find(
      (trailer: any) =>
        trailer.trailer_id === selectedTrailer
    );

  const currentYardLocation =
    selectedTrailerData?.current_yard_location ??
    "Not assigned";

  const selectedYardRecord =
    (yard ?? []).find(
      (slot: any) =>
        slot.yard_location_id ===
        currentYardLocation
    );

  const availableDocks =
    (docks ?? []).filter(
      (dock: any) =>
        dock.status === "Available"
    );

  const occupiedYard =
    (yard ?? []).filter(
      (slot: any) =>
        slot.status === "Occupied"
    ).length;

  const availableYard =
    (yard ?? []).filter(
      (slot: any) =>
        slot.status !== "Occupied"
    ).length;

  const handleRecommend = () => {
    if (!selectedTrailer) return;

    recommendDock.mutate({
      trailerId: selectedTrailer,
    });
  };

  const handleAssign = () => {
    if (
      !selectedTrailer ||
      !bestRecommendation?.dock?.dock_id
    ) {
      return;
    }

    assignDock.mutate({
      trailerId: selectedTrailer,
      dockId:
        bestRecommendation.dock.dock_id,
    });
  };

  return (
    <>
      <SectionTitle
        eyebrow="E2 / Yard and Dock"
        title="Yard & Dock Operations"
        description="Track trailer positions in the yard, monitor dock availability, and move inbound trailers to the best available door."
      />

      {/* -------------------------------------------------
          TOP: DOCK + TRAILER
      ------------------------------------------------- */}

      <div className="grid gap-5 xl:grid-cols-2">

        {/* DOCK AVAILABILITY */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">
                Live Dock Availability
              </h3>

              <p className="text-xs text-slate-500">
                {availableDocks.length} doors available
              </p>
            </div>

            <Badge tone="green">
              LIVE
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(docks ?? []).map(
              (dock: any) => (
                <div
                  key={dock.dock_id}
                  className={cn(
                    "rounded-xl border p-4",
                    dock.status === "Available"
                      ? "border-emerald-200 bg-emerald-50"
                      : dock.status === "Maintenance"
                      ? "border-amber-200 bg-amber-50"
                      : "border-slate-200 bg-slate-50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold">
                      {dock.dock_id}
                    </p>

                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        dock.status === "Available"
                          ? "bg-emerald-500"
                          : dock.status === "Maintenance"
                          ? "bg-amber-500"
                          : "bg-slate-400"
                      )}
                    />
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    {dock.status}
                  </p>

                  <p className="mt-1 text-[11px] text-slate-400">
                    Load:{" "}
                    {dock.supported_load_type ??
                      "General"}
                  </p>
                </div>
              )
            )}
          </div>
        </Card>

        {/* TRAILER TRACKER */}
        <Card>
          <div className="mb-4">
            <h3 className="font-semibold">
              Trailer / Truck Tracker
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Select an inbound trailer to monitor its
              current yard position.
            </p>
          </div>

          <select
            value={selectedTrailer}
            onChange={(e) =>
              setSelectedTrailer(
                e.target.value
              )
            }
            className="mb-4 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            {(trailers ?? []).map(
              (trailer: any) => (
                <option
                  key={trailer.trailer_id}
                  value={trailer.trailer_id}
                >
                  {trailer.trailer_id}
                </option>
              )
            )}
          </select>

          {selectedTrailerData && (
            <div className="grid grid-cols-2 gap-3">

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] uppercase text-slate-400">
                  Trailer
                </p>
                <p className="font-semibold">
                  {selectedTrailerData.trailer_id}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] uppercase text-slate-400">
                  Status
                </p>
                <p className="font-semibold">
                  {selectedTrailerData.status}
                </p>
              </div>

              <div className="rounded-xl bg-cyan-50 p-3">
                <p className="text-[10px] uppercase text-cyan-600">
                  Current Yard
                </p>
                <p className="font-semibold text-cyan-800">
                  {currentYardLocation}
                </p>
              </div>

              <div className="rounded-xl bg-violet-50 p-3">
                <p className="text-[10px] uppercase text-violet-600">
                  Load Type
                </p>
                <p className="font-semibold text-violet-800">
                  {selectedTrailerData.load_type ??
                    "General"}
                </p>
              </div>

            </div>
          )}
        </Card>
      </div>

      {/* -------------------------------------------------
          YARD BOARD
      ------------------------------------------------- */}

      <div className="mt-5">
        <Card>
          <div className="mb-4 flex items-center justify-between">

            <div>
              <h3 className="font-semibold">
                Live Yard Board
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Current trailer positions inside the
                warehouse yard.
              </p>
            </div>

            <div className="flex gap-2">
              <Badge tone="blue">
                {occupiedYard} Occupied
              </Badge>

              <Badge tone="green">
                {availableYard} Available
              </Badge>
            </div>

          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">

            {(yard ?? []).map(
              (slot: any) => {

                const isSelected =
                  slot.yard_location_id ===
                  currentYardLocation;

                const occupied =
                  slot.status === "Occupied";

                return (
                  <div
                    key={slot.yard_location_id}
                    className={cn(
                      "rounded-xl border p-3 transition",
                      isSelected
                        ? "border-cyan-400 bg-cyan-50 ring-2 ring-cyan-100"
                        : occupied
                        ? "border-slate-200 bg-slate-50"
                        : "border-emerald-200 bg-emerald-50"
                    )}
                  >

                    <div className="flex items-center justify-between">

                      <p className="font-bold">
                        {slot.yard_location_id}
                      </p>

                      <span
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          isSelected
                            ? "bg-cyan-500"
                            : occupied
                            ? "bg-slate-400"
                            : "bg-emerald-500"
                        )}
                      />

                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      {slot.trailer_id ??
                        "Empty"}
                    </p>

                    <p className="mt-1 text-[10px] text-slate-400">
                      {occupied
                        ? "Occupied"
                        : "Available"}
                    </p>

                    {isSelected && (
                      <p className="mt-2 text-[10px] font-bold text-cyan-700">
                        SELECTED TRAILER
                      </p>
                    )}

                  </div>
                );
              }
            )}

          </div>
        </Card>
      </div>

      {/* -------------------------------------------------
          YARD → DOCK WORKFLOW
      ------------------------------------------------- */}

      <div className="mt-5 grid gap-5 xl:grid-cols-2">

        {/* CURRENT YARD POSITION */}
        <Card>
          <h3 className="font-semibold">
            Trailer Movement
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Move the selected trailer from its yard
            staging position to the recommended dock.
          </p>

          <div className="mt-5 flex items-center justify-between">

            <div className="rounded-xl bg-cyan-50 px-5 py-4 text-center">
              <p className="text-[10px] uppercase text-cyan-600">
                Current Yard
              </p>

              <p className="mt-1 text-xl font-bold text-cyan-800">
                {currentYardLocation}
              </p>
            </div>

            <div className="px-3 text-center text-slate-400">
              →
              <p className="text-[10px]">
                Move
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 px-5 py-4 text-center">
              <p className="text-[10px] uppercase text-emerald-600">
                Recommended Dock
              </p>

              <p className="mt-1 text-xl font-bold text-emerald-800">
                {bestRecommendation?.dock?.dock_id ??
                  "—"}
              </p>
            </div>

          </div>

          {selectedYardRecord && (
            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold">
                Yard status
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {selectedYardRecord.status ??
                  "Unknown"}
              </p>
            </div>
          )}
        </Card>

        {/* AI RECOMMENDATION */}
        <Card>

          <div className="flex items-center justify-between">

            <div>
              <h3 className="font-semibold">
                AI Dock Recommendation
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                ETA · Priority · Load compatibility ·
                Availability · Waiting time
              </p>
            </div>

            <Badge tone="blue">
              AI
            </Badge>

          </div>

          <button
            onClick={handleRecommend}
            disabled={
              !selectedTrailer ||
              recommendDock?.isPending
            }
            className="mt-5 w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {recommendDock?.isPending
              ? "Calculating..."
              : "Recommend Best Dock"}
          </button>

          {bestRecommendation && (
            <div className="mt-5 rounded-xl border border-cyan-200 bg-cyan-50 p-4">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-[10px] uppercase text-cyan-700">
                    Best Dock
                  </p>

                  <p className="text-2xl font-bold text-slate-900">
                    {bestRecommendation.dock?.dock_id}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[10px] text-slate-500">
                    AI Score
                  </p>

                  <p className="text-2xl font-bold text-cyan-700">
                    {bestRecommendation.score}%
                  </p>
                </div>

              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">

                {Object.entries(
                  bestRecommendation.factors ??
                    {}
                ).map(
                  ([key, value]: any) => (
                    <div
                      key={key}
                      className="rounded-lg bg-white p-3"
                    >
                      <p className="text-[10px] capitalize text-slate-400">
                        {key.replace(
                          /([A-Z])/g,
                          " $1"
                        )}
                      </p>

                      <p className="font-semibold">
                        {value}%
                      </p>
                    </div>
                  )
                )}

              </div>

              <button
                onClick={handleAssign}
                disabled={
                  !selectedTrailer ||
                  !bestRecommendation?.dock?.dock_id ||
                  assignDock?.isPending
                }
                className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {assignDock?.isPending
                  ? "Assigning..."
                  : `Move ${selectedTrailer} to ${bestRecommendation.dock.dock_id}`}
              </button>

            </div>
          )}

          {!bestRecommendation &&
            !recommendDock?.isPending && (
              <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                Select a trailer and click
                <strong> Recommend Best Dock </strong>
                to calculate the next suitable door.
              </div>
            )}

        </Card>

      </div>
    </>
  );
}
/* =========================================================
   INVOICING
========================================================= */

function Invoicing({
  invoices,
  processInvoice,
  processInvoiceFile,
}: any) {
  const [invoiceId, setInvoiceId] = useState(
    invoices?.[0]?.invoice_id ?? ""
  );

  const [fileName, setFileName] = useState("");
  const [filePayload, setFilePayload] =
    useState<any>(null);

  const result =
    processInvoiceFile.data ??
    processInvoice.data;

  return (
    <>
      <SectionTitle
        eyebrow="PR2 / Invoicing"
        title="Intelligent Invoice Processing"
        description="Upload an invoice for OCR or process a supplied invoice record."
      />

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <div className="flex items-center gap-2">
            <BrainCircuit
              size={18}
              className="text-cyan-600"
            />

            <h3 className="font-semibold">
              OCR intake
            </h3>
          </div>

          <select
            value={invoiceId}
            onChange={(e) =>
              setInvoiceId(e.target.value)
            }
            className="mt-5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            {(invoices ?? [])
              .slice(0, 20)
              .map((invoice: any) => (
                <option
                  key={invoice.invoice_id}
                  value={invoice.invoice_id}
                >
                  {invoice.invoice_id} ·{" "}
                  {invoice.invoice_number}
                </option>
              ))}
          </select>

          <label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 hover:border-cyan-300">
            <input
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];

                if (!file) return;

                setFileName(file.name);

                const reader = new FileReader();

                reader.onload = () => {
                  setFilePayload({
                    fileName: file.name,
                    mimeType: file.type,
                    base64:
                      String(reader.result).split(",")[1] ??
                      "",
                  });
                };

                reader.readAsDataURL(file);
              }}
            />

            {fileName ||
              "Choose invoice PDF or image (optional)"}
          </label>

          <button
            onClick={() => {
              if (filePayload) {
                processInvoiceFile.mutate(filePayload);
              } else if (invoiceId) {
                processInvoice.mutate({
                  invoiceId,
                  fileName,
                });
              } else {
                toast.error(
                  "Please select an invoice record."
                );
              }
            }}
            className="mt-4 w-full rounded-xl bg-[#0b1a2a] px-4 py-2.5 text-sm font-semibold text-white"
          >
            {filePayload
              ? "Run OCR on uploaded file"
              : "Process selected invoice"}
          </button>

          {result && (
            <div className="mt-5 rounded-xl bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                <CheckCircle2 size={17} />
                OCR extraction complete
              </div>

              <p className="mt-1 text-xs text-emerald-700">
                {result.mode} ·{" "}
                {Math.round(
                  Number(result.confidence || 0) * 100
                )}
                % confidence
              </p>

              {Number(result.confidence ?? 0) >= 0.9 ? (
  <p className="mt-2 text-xs font-semibold text-emerald-700">
    ✓ OCR extraction verified — high confidence
  </p>
) : Number(result.confidence ?? 0) >= 0.75 ? (
  <p className="mt-2 text-xs font-semibold text-amber-700">
    ⚠ OCR extraction needs review — medium confidence
  </p>
) : (
  <p className="mt-2 text-xs font-semibold text-red-700">
    ⚠ Manual verification required — low OCR confidence
  </p>
)}

              {result.extracted && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                  {Object.entries(result.extracted)
                    .filter(
                      ([key]) =>
                        key !== "confidenceByField"
                    )
                    .map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded-lg bg-white/70 p-2"
                      >
                        <p className="capitalize text-slate-500">
                          {key.replace(
                            /([A-Z])/g,
                            " $1"
                          )}
                        </p>

                        <p className="font-semibold text-slate-800">
                          {String(
                            value ?? "Unreadable"
                          )}
                        </p>
                      </div>
                    ))}
                </div>
              )}

              
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">
              Invoice register
            </h3>

            <Badge tone="blue">
              {invoices?.length ?? 0} records
            </Badge>
          </div>

          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 border-b border-slate-100 bg-white text-xs text-slate-400">
                <tr>
                  <th className="pb-3">Invoice</th>
                  <th className="pb-3">PO</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">OCR</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {(invoices ?? [])
                  .slice(0, 16)
                  .map((row: any) => (
                    <tr key={row.invoice_id}>
                      <td className="py-3 font-semibold">
                        {row.invoice_number}

                        <p className="text-[11px] font-normal text-slate-400">
                          {row.invoice_id}
                        </p>
                      </td>

                      <td className="py-3 text-xs">
                        {row.po_id}
                      </td>

                      <td className="py-3 text-xs">
                        {money(row.total_amount)}
                      </td>

                      <td className="py-3 text-xs">
                        {Math.round(
                          Number(
                            row.ocr_confidence || 0
                          ) * 100
                        )}
                        %
                      </td>

                      <td className="py-3">
                        <Badge
                          tone={
                            row.status === "Received"
                              ? "amber"
                              : "green"
                          }
                        >
                          {row.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}

/* =========================================================
   MATCHING
========================================================= */

function Matching({
  matches,
  invoices,
  runMatch,
}: any) {
  const [invoiceId, setInvoiceId] = useState(
    invoices?.[0]?.invoice_id ?? ""
  );

  const [result, setResult] = useState<any>(null);

  const selectedInvoice = (invoices ?? []).find(
    (invoice: any) =>
      invoice.invoice_id === invoiceId
  );

  const totalMatches = matches?.length ?? 0;

  const matchedCount = (matches ?? []).filter(
    (row: any) =>
      row.overall_status === "Matched"
  ).length;

  const exceptionCount =
    totalMatches - matchedCount;

  return (
    <>
      <SectionTitle
        eyebrow="PR2 / Matching"
        title="3-Way Matching"
        description="Reconcile Purchase Order, Goods Receipt, and Invoice values."
      />

      {/* Summary cards */}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium text-slate-400">
            Total Records
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-800">
            {totalMatches}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Invoices processed
          </p>
        </Card>

        <Card>
          <p className="text-xs font-medium text-slate-400">
            Matched
          </p>

          <p className="mt-1 text-2xl font-bold text-emerald-600">
            {matchedCount}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Ready for approval
          </p>
        </Card>

        <Card>
          <p className="text-xs font-medium text-slate-400">
            Exceptions
          </p>

          <p className="mt-1 text-2xl font-bold text-rose-600">
            {exceptionCount}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Require review
          </p>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.15fr]">
        {/* LEFT SIDE */}
        <Card>
          <div className="flex items-center gap-2">
            <PackageCheck
              size={18}
              className="text-emerald-600"
            />

            <h3 className="font-semibold">
              Run reconciliation
            </h3>
          </div>

          <select
            value={invoiceId}
            onChange={(e) => {
              setInvoiceId(e.target.value);
              setResult(null);
            }}
            className="mt-5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            {(invoices ?? []).map(
              (invoice: any) => (
                <option
                  key={invoice.invoice_id}
                  value={invoice.invoice_id}
                >
                  {invoice.invoice_id} ·{" "}
                  {invoice.po_id}
                </option>
              )
            )}
          </select>

          {/* Selected document */}
          {selectedInvoice && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] text-slate-400">
                  Invoice
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {selectedInvoice.invoice_id}
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-[11px] text-slate-400">
                  Purchase Order
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {selectedInvoice.po_id}
                </p>
              </div>
            </div>
          )}

          <button
            disabled={
              !invoiceId || runMatch.isPending
            }
            onClick={async () => {
              try {
                const data =
                  await runMatch.mutateAsync({
                    invoiceId,
                  });

                setResult(data);
              } catch (error) {
                console.error(error);

                toast.error(
                  "3-way matching failed."
                );
              }
            }}
            className="mt-4 w-full rounded-xl bg-[#0b1a2a] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {runMatch.isPending
              ? "Checking..."
              : "Run 3-way match"}
          </button>

          {/* Matching result */}
          {result && (
            <div
              className={cn(
                "mt-5 rounded-xl border p-4",
                result.match?.overall_status ===
                  "Matched"
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-rose-200 bg-rose-50"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-800">
                    {result.match
                      ?.overall_status ===
                    "Matched"
                      ? "✓ 3-Way Match Successful"
                      : "⚠ Matching Exception"}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {selectedInvoice?.invoice_id}
                    {" · "}
                    {selectedInvoice?.po_id}
                  </p>
                </div>

                <Badge
                  tone={
                    result.match
                      ?.overall_status ===
                    "Matched"
                      ? "green"
                      : "red"
                  }
                >
                  {result.match
                    ?.overall_status ??
                    "Review"}
                </Badge>
              </div>

              {/* Match information */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-white/70 p-3">
                  <p className="text-[11px] text-slate-400">
                    Match Status
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {result.match
                      ?.overall_status ??
                      "Review"}
                  </p>
                </div>

                <div className="rounded-lg bg-white/70 p-3">
                  <p className="text-[11px] text-slate-400">
                    Confidence
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {result.match?.confidence !=
                    null
                      ? `${Math.round(
                          Number(
                            result.match
                              .confidence
                          ) *
                            100
                        )}%`
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Decision */}
              <div className="mt-3 rounded-lg bg-white/70 p-3">
                <p className="text-[11px] text-slate-400">
                  AI Decision
                </p>

                <p className="mt-1 text-sm font-bold text-slate-800">
                  {result.match?.action ??
                    "Human Review"}
                </p>
              </div>

              {/* Explanation */}
              <div className="mt-3 rounded-lg border border-slate-200 bg-white/60 p-3">
                <p className="text-[11px] font-medium text-slate-400">
                  Matching summary
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {result.match
                    ?.overall_status ===
                  "Matched"
                    ? "Purchase order, goods receipt and invoice successfully passed the reconciliation check."
                    : "A discrepancy was detected during reconciliation. The invoice should be reviewed before approval."}
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* RIGHT SIDE */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">
                Previous matching results
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                Recent reconciliation activity
              </p>
            </div>

            <Badge tone="blue">
              {totalMatches} records
            </Badge>
          </div>

          <div className="max-h-[520px] space-y-3 overflow-auto pr-1">
            {(matches ?? [])
              .slice(0, 12)
              .map((row: any) => (
                <div
                  key={row.match_id}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:bg-white hover:shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {row.invoice_id}
                      </p>

                      <p className="mt-1 text-[11px] text-slate-400">
                        3-way reconciliation
                      </p>
                    </div>

                    <Badge
                      tone={
                        row.overall_status ===
                        "Matched"
                          ? "green"
                          : "red"
                      }
                    >
                      {row.overall_status}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2">
                    <span className="text-[11px] text-slate-400">
                      Decision
                    </span>

                    <span className="text-xs font-semibold text-slate-700">
                      {row.action ??
                        "Human Review"}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </>
  );
}

/* =========================================================
   EXCEPTIONS
========================================================= */

function Exceptions({
  alerts,
  resolve,
  review,
}: any) {
  return (
    <>
      <SectionTitle
        eyebrow="Control Tower / Exceptions"
        title="Alerts & Exceptions"
        description="Prioritize operational risk and route anomalies to human review."
      />

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">
            Exception queue
          </h3>

          <Badge tone="red">
            {alerts?.filter(
              (alert: any) =>
                alert.status === "Open"
            ).length ?? 0}{" "}
            open
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs text-slate-400">
              <tr>
                <th className="pb-3">Severity</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Reference</th>
                <th className="pb-3">Message</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {(alerts ?? []).map((alert: any) => (
                <tr key={alert.alert_id}>
                  <td className="py-3">
                    <Badge
                      tone={
                        alert.severity === "High" ||
                        alert.severity === "Critical"
                          ? "red"
                          : "amber"
                      }
                    >
                      {alert.severity}
                    </Badge>
                  </td>

                  <td className="py-3 text-xs font-semibold">
                    {alert.alert_type}
                  </td>

                  <td className="py-3 text-xs">
                    {alert.reference_id}
                  </td>

                  <td className="max-w-xs py-3 text-xs text-slate-600">
                    {alert.message}

                    <p className="mt-1 text-slate-400">
                      {alert.recommended_action}
                    </p>
                  </td>

                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          resolve.mutate({
                            alertId:
                              alert.alert_id,
                            status:
                              "Acknowledged",
                          })
                        }
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold hover:bg-slate-50"
                      >
                        Acknowledge
                      </button>

                      <button
                        onClick={() =>
                          review.mutate({
                            alertId:
                              alert.alert_id,
                            decision: "Approved",
                          })
                        }
                        className="rounded-lg border border-emerald-200 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
                      >
                        Approve
                      </button>

                      <button
                        onClick={() =>
                          review.mutate({
                            alertId:
                              alert.alert_id,
                            decision: "Rejected",
                          })
                        }
                        className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        Reject
                      </button>

                      <button
                        onClick={() =>
                          resolve.mutate({
                            alertId:
                              alert.alert_id,
                            status: "Resolved",
                          })
                        }
                        className="rounded-lg bg-[#0b1a2a] px-2.5 py-1.5 text-[11px] font-semibold text-white"
                      >
                        Resolve
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

/* =========================================================
   ANALYTICS
========================================================= */

function Analytics({
  summary,
  requisitions,
  pos,
  receipts,
}: any) {
  return (
    <>
      <SectionTitle
        eyebrow="Analytics / E2 + PR2"
        title="Performance analytics"
        description="Procurement, logistics, receiving, and exception health."
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs text-slate-500">
            PO commitment value
          </p>

          <p className="mt-2 text-2xl font-bold">
            {money(
              (pos ?? []).reduce(
                (sum: number, po: any) =>
                  sum + Number(po.total_amount || 0),
                0
              )
            )}
          </p>
        </Card>

        <Card>
          <p className="text-xs text-slate-500">
            Requisitions tracked
          </p>

          <p className="mt-2 text-2xl font-bold">
            {requisitions?.length ?? 0}
          </p>
        </Card>

        <Card>
          <p className="text-xs text-slate-500">
            Receiving acceptance
          </p>

          <p className="mt-2 text-2xl font-bold">
            {receipts?.length
              ? Math.round(
                  (receipts.filter(
                    (receipt: any) =>
                      receipt.status === "Accepted"
                  ).length /
                    receipts.length) *
                    100
                )
              : 0}
            %
          </p>
        </Card>

        <Card>
          <p className="text-xs text-slate-500">
            Open anomalies
          </p>

          <p className="mt-2 text-2xl font-bold">
            {summary?.openAnomalies ?? 0}
          </p>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <h3 className="mb-5 font-semibold">
            Purchase order status
          </h3>

          <BarList
            items={summary?.poStatuses}
            color="bg-blue-500"
          />
        </Card>

        <Card>
          <h3 className="mb-5 font-semibold">
            Invoice outcomes
          </h3>

          <BarList
            items={summary?.invoiceStatuses}
            color="bg-emerald-500"
          />
        </Card>

        <Card>
          <h3 className="mb-5 font-semibold">
            PO value by supplier
          </h3>

          <BarList
            items={summary?.poValueBySupplier}
            color="bg-violet-500"
          />
        </Card>

        <Card>
          <h3 className="mb-5 font-semibold">
            Exception types
          </h3>

          <BarList
            items={summary?.exceptionTypes}
            color="bg-rose-500"
          />
        </Card>
      </div>
    </>
  );
}

/* =========================================================
   MAIN HOME COMPONENT
========================================================= */

export default function Home() {
  const initialModule =
    new URLSearchParams(
      window.location.search
    ).get("module");

  const [active, setActive] = useState(
    initialModule &&
      nav.some(
        (item) => item.id === initialModule
      )
      ? initialModule
      : "Control Tower"
  );

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [search, setSearch] = useState("");

  /* -------------------------
     QUERIES
  ------------------------- */

  const summary =
    trpc.dashboard.summary.useQuery();

  const requisitions =
    trpc.requisitions.list.useQuery(
      search ? { search } : undefined
    );

  const pos =
    trpc.purchaseOrders.list.useQuery(
      search ? { search } : undefined
    );

  const shipments =
    trpc.shipments.list.useQuery(
      search ? { search } : undefined
    );

  const trailers =
    trpc.trailers.useQuery();

  const docks =
    trpc.docks.useQuery();

  const yard =
    trpc.yard.useQuery();

  const receipts =
    trpc.goodsReceipts.list.useQuery();

  const invoices =
    trpc.invoices.list.useQuery();

  const matches =
    trpc.matching.list.useQuery();

  const alerts =
    trpc.alerts.list.useQuery();

  const decisions =
    trpc.aiDecisions.useQuery();

  const utils = trpc.useUtils();

  const recommendDock = trpc.dock.recommend.useMutation();

const assignDock = trpc.dock.assign.useMutation({
  onSuccess: () => {
    toast.success("Dock assigned successfully");

    void utils.docks.invalidate();
    void utils.trailers.invalidate();
  },
  onError: (error) => {
    console.error("Dock assignment failed:", error);
    toast.error("Failed to assign dock");
  },
});

  /* -------------------------
     PROCUREMENT MUTATIONS
  ------------------------- */

  const extract =
    trpc.procurement.extract.useMutation();

  const createReq =
    trpc.requisitions.create.useMutation({
      onSuccess: () => {
        toast.success(
          "Requisition created successfully"
        );

        void utils.requisitions.list.invalidate();
        void utils.dashboard.summary.invalidate();
      },
      onError: (error) => {
        console.error(error);
        toast.error(
          "Failed to create requisition"
        );
      },
    });

 const createPo =
  trpc.purchaseOrders.create.useMutation({
    onSuccess: (data) => {
      console.log("PO CREATED:", data);

      // Save the generated PO so it appears in the UI
      setGeneratedPo(data);

      toast.success(
        "Purchase order and shipment created successfully"
      );

      void utils.purchaseOrders.list.invalidate();
      void utils.shipments.list.invalidate();
      void utils.requisitions.list.invalidate();
      void utils.dashboard.summary.invalidate();
    },

    onError: (error) => {
      console.error(
        "Purchase order creation failed:",
        error
      );

      toast.error(
        "Purchase order creation failed"
      );
    },
  });

  /* -------------------------
     PROCUREMENT STATE
  ------------------------- */

  const [request, setRequest] =
    useState(
      "I need 500 temperature sensors for the Kolkata warehouse."
    );

  const [extracted, setExtracted] =
    useState<any>(null);

  const [createdReqId, setCreatedReqId] =
    useState("");

  const [generatedPo, setGeneratedPo] =
  useState<any>(null);

  /* -------------------------
     SHIPMENT STATE
  ------------------------- */

  const initialShipmentId =
    new URLSearchParams(
      window.location.search
    ).get("shipmentId") ?? "";

  const [
    selectedShipmentId,
    setSelectedShipmentId,
  ] = useState(initialShipmentId);

  const shipmentDetail =
    trpc.shipments.detail.useQuery(
      {
        shipmentId:
          selectedShipmentId || "SHP00001",
      },
      {
        enabled:
          Boolean(selectedShipmentId),
      }
    );

  /* -------------------------
     TRAILER STATE
  ------------------------- */

  const [
    selectedTrailer,
    setSelectedTrailer,
  ] = useState("TR0001");

  /* -------------------------
     SUPPLIER RECOMMENDATION
  ------------------------- */

  const recommendationInput =
    useMemo(
      () => ({
        productId:
          extracted?.productId ??
          "PROD001",

        quantity:
          extracted?.quantity ??
          500,

        requiredDate:
          extracted?.requiredDate ??
          new Date(
            Date.now() +
              14 * 86400000
          )
            .toISOString()
            .slice(0, 10),
      }),
      [extracted]
    );

  const recommend =
    trpc.procurement.recommendSuppliers.useQuery(
      recommendationInput
    );

  /* -------------------------
     INVOICE
  ------------------------- */

  const processInvoice =
    trpc.invoices.process.useMutation({
      onSuccess: (data) => {
        toast.success(
          `OCR extracted ${
            data.extracted.invoiceNumber
          }`
        );
      },

      onError: (error) => {
        console.error(error);
        toast.error(
          "Invoice processing failed"
        );
      },
    });

  const processInvoiceFile =
    trpc.invoices.processFile.useMutation({
      onSuccess: (data) => {
        toast.success(
          `File OCR completed at ${Math.round(
            Number(data.confidence || 0) * 100
          )}% confidence`
        );
      },

      onError: (error) => {
        console.error(error);
        toast.error(
          "File OCR failed"
        );
      },
    });

  /* -------------------------
     MATCHING
  ------------------------- */

  const runMatch =
    trpc.matching.run.useMutation({
      onSuccess: (data) => {
        toast.success(
          data.match?.overall_status ===
            "Matched"
            ? "3-Way Match Successful"
            : "Exception routed to Human Review"
        );

        void utils.matching.list.invalidate();
        void utils.alerts.list.invalidate();
        void utils.dashboard.summary.invalidate();
      },

      onError: (error) => {
        console.error(error);
        toast.error(
          "3-way matching failed"
        );
      },
    });

  /* -------------------------
     EXCEPTIONS
  ------------------------- */

  const resolve =
    trpc.alerts.resolve.useMutation({
      onSuccess: () => {
        toast.success(
          "Exception updated"
        );

        void utils.alerts.list.invalidate();
        void utils.dashboard.summary.invalidate();
      },

      onError: (error) => {
        console.error(error);
        toast.error(
          "Could not update exception"
        );
      },
    });

  const review =
    trpc.alerts.review.useMutation({
      onSuccess: () => {
        toast.success(
          "Exception decision saved"
        );

        void utils.alerts.list.invalidate();
        void utils.dashboard.summary.invalidate();
      },

      onError: (error) => {
        console.error(error);
        toast.error(
          "Could not save exception decision"
        );
      },
    });

  /* =========================================================
     PROCUREMENT FUNCTIONS
  ========================================================= */

  const runExtraction = async () => {
    try {
      const result =
        await extract.mutateAsync({
          text: request,
        });

      setExtracted(result);

      toast.success(
        "Procurement fields extracted"
      );
    } catch (error) {
      console.error(error);

      toast.error(
        "Failed to extract procurement fields"
      );
    }
  };

  const createFromExtraction =
    async () => {
      try {
        const data =
          extracted ??
          (await extract.mutateAsync({
            text: request,
          }));

        setExtracted(data);

        const req =
          await createReq.mutateAsync({
            requester:
              "Control Tower User",

            department:
              "Operations",

            productId:
              data.productId ??
              "PROD001",

            quantity:
              Number(data.quantity ?? 500),

            requiredDate:
              data.requiredDate ??
              new Date(
                Date.now() +
                  14 * 86400000
              )
                .toISOString()
                .slice(0, 10),

            destination:
              data.destination ??
              "Kolkata Warehouse",

            priority:
              data.priority ??
              "Medium",
          });

        setCreatedReqId(
          req.requisition_id
        );
      } catch (error) {
        console.error(error);

        toast.error(
          "Failed to create requisition"
        );
      }
    };

 const generatePo = async () => {
  try {
    // 1. Extract procurement information
    const data =
      extracted ??
      (await extract.mutateAsync({
        text: request,
      }));

    setExtracted(data);

    // 2. Get recommended supplier
    const supplier =
      recommend.data?.[0]?.supplier;

    if (!supplier) {
      toast.error(
        "No supplier recommendation is available"
      );
      return;
    }

    // 3. Make sure a real requisition exists
    let reqId = createdReqId;

    if (!reqId) {
      const req =
        await createReq.mutateAsync({
          requester:
            "Control Tower User",

          department:
            "Operations",

          productId:
            data.productId ??
            "PROD001",

          quantity:
            Number(
              data.quantity ?? 500
            ),

          requiredDate:
            data.requiredDate ??
            new Date(
              Date.now() +
                14 * 86400000
            )
              .toISOString()
              .slice(0, 10),

          destination:
            data.destination ??
            "Kolkata Warehouse",

          priority:
            data.priority ??
            "Medium",
        });

      reqId = req.requisition_id;

      setCreatedReqId(reqId);
    }

    console.log(
      "Using requisition:",
      reqId
    );

    // 4. Create PO
    const result =
      await createPo.mutateAsync({
        requisitionId:
          reqId,

        supplierId:
          supplier.supplier_id,

        productId:
          data.productId ??
          "PROD001",

        quantity:
          Number(
            data.quantity ?? 500
          ),

        unitPrice:
          Number(
            data.unitPrice ?? 250
          ),

        priority:
          data.priority ??
          "Medium",

        destination:
          data.destination ??
          "Kolkata Warehouse",
      });

    console.log(
  "NEW PO:",
  result.po
);

    // 5. Show generated PO in UI
    setGeneratedPo(result);

    // Refresh PO and dashboard data
await utils.purchaseOrders.list.invalidate();
await utils.dashboard.summary.invalidate();

    toast.success(
      "Purchase Order generated successfully"
    );
    await utils.purchaseOrders.list.invalidate();

    // 6. Refresh data
    void utils.purchaseOrders.list.invalidate();
    void utils.shipments.list.invalidate();
    void utils.requisitions.list.invalidate();
    void utils.dashboard.summary.invalidate();

  } catch (error: any) {
  console.error("========== PO GENERATION ERROR ==========");
  console.error("Full error:", error);
  console.error("Message:", error?.message);
  console.error("Data:", error?.data);
  console.error("Shape:", error?.shape);
  console.error("Cause:", error?.cause);
  console.error("=========================================");

  toast.error(
    error?.message ||
    error?.data?.message ||
    "Failed to generate purchase order"
  );
}
 };

  /* =========================================================
     MAIN PAGE CONTENT
  ========================================================= */

  let main: ReactNode;

  if (active === "Control Tower") {
    main = (
      <Dashboard
        summary={summary.data}
        alerts={
          summary.data?.criticalAlerts ??
          alerts.data
        }
        decisions={
          summary.data?.recentDecisions ??
          decisions.data
        }
        onNavigate={setActive}
      />
    );
  } else if (active === "Procurement") {
    main = (
      <Procurement
        request={request}
        setRequest={setRequest}
        extracted={extracted}
        runExtraction={runExtraction}
        createFromExtraction={
          createFromExtraction
        }
        generatePo={generatePo}
        createdReqId={createdReqId}
        generatedPo={generatedPo}
        extractPending={
          extract.isPending
        }
        poPending={
          createPo.isPending
        }
        recommendations={
          recommend.data
        }
      />
    );
  } else if (active === "Logistics") {
    /*
      Use the existing ShipmentTracking
      component from your project.
    */
    main = (
      <ShipmentTracking
        shipments={shipments.data}
        detail={shipmentDetail.data}
        selectedShipmentId={
          selectedShipmentId
        }
        setSelectedShipmentId={
          setSelectedShipmentId
        }
      />
    );
  } else if (active === "Yard and Dock") {
    main = (
      <YardDock
  docks={docks.data}
  yard={yard.data}
  trailers={trailers.data}
  selectedTrailer={selectedTrailer}
  setSelectedTrailer={setSelectedTrailer}
  recommendDock={recommendDock}
  assignDock={assignDock}
/>
    );
  } else if (active === "Invoicing") {
    main = (
      <Invoicing
        invoices={invoices.data}
        processInvoice={processInvoice}
        processInvoiceFile={
          processInvoiceFile
        }
      />
    );
  } else if (active === "Matching") {
    main = (
      <Matching
        matches={matches.data}
        invoices={invoices.data}
        runMatch={runMatch}
      />
    );
  } else if (active === "Exceptions") {
    main = (
      <Exceptions
        alerts={alerts.data}
        resolve={resolve}
        review={review}
      />
    );
  } else {
    main = (
      <Analytics
        summary={summary.data}
        requisitions={requisitions.data}
        pos={pos.data}
        receipts={receipts.data}
      />
    );
  }

  /* =========================================================
     PAGE LAYOUT
  ========================================================= */

  return (
    <div className="min-h-screen bg-[#f5f8fb] text-slate-900">
      {/* SIDEBAR */}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-[258px] border-r border-slate-200 bg-[#0b1a2a] text-white transition-transform lg:translate-x-0",
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full"
        )}
      >
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400 text-[#0b1a2a]">
            <Boxes size={21} />
          </div>

          <div>
            <p className="text-sm font-bold tracking-wide">
              NPN CONTROL TOWER
            </p>

            <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">
              E2 × PR2 / v1.0
            </p>
          </div>
        </div>

        <div className="px-3 py-6">
          <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Operations workspace
          </p>

          {nav.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActive(item.id);
                  setMobileOpen(false);
                }}
                className={cn(
                  "mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition",
                  active === item.id
                    ? "bg-cyan-400 font-semibold text-[#0b1a2a]"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon size={17} />

                <span>{item.id}</span>

                {active === item.id && (
                  <ChevronRight
                    className="ml-auto"
                    size={15}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-cyan-400 text-xs font-bold text-[#0b1a2a]">
              CT
            </div>

            <div>
              <p className="text-xs font-semibold">
                Control Tower User
              </p>

              <p className="text-[10px] text-slate-400">
                Operations Admin
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}

      <div className="lg:pl-[258px]">
        {/* HEADER */}

        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                setMobileOpen(
                  (value) => !value
                )
              }
              className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
            >
              <Menu size={20} />
            </button>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Supply chain intelligence /{" "}
                {active}
              </p>

              <h2 className="text-lg font-semibold">
                AI-Powered Autonomous Supply
                Chain Control Tower
              </h2>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <div className="relative">
              <Search
                className="absolute left-3 top-2.5 text-slate-400"
                size={16}
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search records..."
                className="h-10 w-64 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-cyan-400"
              />
            </div>

            <div className="grid h-10 w-10 place-items-center rounded-full bg-cyan-50 text-xs font-bold text-cyan-700">
              CT
            </div>
          </div>
        </header>

        {/* CONTENT */}

        <main className="mx-auto max-w-[1600px] p-5 md:p-8">
          {main}
        </main>
      </div>

      {/* MOBILE OVERLAY */}

      {mobileOpen && (
        <button
          aria-label="Close menu"
          onClick={() =>
            setMobileOpen(false)
          }
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
        />
      )}
    </div>
  );
}