import fs from "node:fs";
import path from "node:path";
import { buildShipmentTrackingState } from "./trackingState";

export type Row = Record<string, string>;

function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; i += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === "," && !quoted) { row.push(cell); cell = ""; continue; }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell); cell = "";
      if (row.some(value => value.length > 0)) rows.push(row);
      row = [];
      continue;
    }
    cell += char;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  const [header = [], ...body] = rows;
  return body.map(values => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""])));
}

const dataDirectory = path.resolve(process.cwd(), "data");
const files = ["suppliers", "products", "requisitions", "purchase_orders", "shipments", "trailers", "yard_locations", "dock_doors", "dock_assignments", "goods_receipts", "invoices", "three_way_matching", "alerts", "ai_decisions"] as const;
export type Dataset = typeof files[number];

const datasets: Record<Dataset, Row[]> = Object.fromEntries(files.map(name => {
  const filePath = path.join(dataDirectory, `${name}.csv`);
  return [name, fs.existsSync(filePath) ? parseCsv(fs.readFileSync(filePath, "utf8")) : []];
})) as Record<Dataset, Row[]>;

export const store = {
  list<T extends Dataset>(name: T): Row[] { return datasets[name]; },
  add<T extends Dataset>(name: T, row: Row) { datasets[name].unshift(row); return row; },
  update<T extends Dataset>(name: T, key: string, value: string, patch: Row) {
    const row = datasets[name].find(item => item[key] === value);
    if (row) Object.assign(row, patch);
    return row;
  },
  get<T extends Dataset>(name: T, key: string, value: string) { return datasets[name].find(item => item[key] === value); },
  count<T extends Dataset>(name: T) { return datasets[name].length; },
};

export function num(value: string | undefined) { return Number(value ?? 0); }
export function dateLabel(value: string | undefined) { return value ? new Date(value).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "—"; }
export function nextId(prefix: string, dataset: Dataset, field: string) {
  const max = store.list(dataset).reduce((acc, row) => Math.max(acc, Number((row[field] ?? "").replace(/\D/g, "")) || 0), 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export function dashboardSummary() {
  const pos = store.list("purchase_orders");
  const shipments = store.list("shipments");
  const invoices = store.list("invoices");
  const docks = store.list("dock_doors");
  const alerts = store.list("alerts");
  const matching = store.list("three_way_matching");
  return {
    activePurchaseOrders: pos.filter(row => !["Closed", "Cancelled"].includes(row.status)).length,
    inboundShipments: shipments.filter(row => ["In Transit", "At Yard"].includes(row.status)).length,
    delayedTrucks: shipments.filter(row => row.status === "Delayed").length,
    availableDocks: docks.filter(row => row.status === "Available").length,
    pendingInvoices: invoices.filter(row => !["Matched", "Approved"].includes(row.status)).length,
    openAnomalies: alerts.filter(row => row.status === "Open").length,
    shipmentStatuses: groupBy(shipments, "status"),
    poStatuses: groupBy(pos, "status"),
    invoiceStatuses: groupBy(matching, "overall_status"),
    poValueBySupplier: Object.entries(pos.reduce<Record<string, number>>((acc, row) => { const supplier = store.get("suppliers", "supplier_id", row.supplier_id)?.supplier_name ?? row.supplier_id; acc[supplier] = (acc[supplier] ?? 0) + num(row.total_amount); return acc; }, {})).map(([name, value]) => ({ name, value })),
    exceptionTypes: groupBy(alerts, "alert_type"),
    procurementThroughput: groupBy(store.list("requisitions"), "status"),
    yard: { occupied: store.list("yard_locations").filter(row => row.status === "Occupied").length, total: store.count("yard_locations") },
    recentDecisions: store.list("ai_decisions").slice(0, 5),
    criticalAlerts: alerts.filter(row => ["Critical", "High"].includes(row.severity) && row.status === "Open").slice(0, 5),
  };
}
function groupBy(rows: Row[], field: string) { return Object.entries(rows.reduce<Record<string, number>>((acc, row) => { const key = row[field] || "Unknown"; acc[key] = (acc[key] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value })); }

export function joinPo(poId: string) {
  const po = store.get("purchase_orders", "po_id", poId);
  if (!po) return undefined;
  const supplier = store.get("suppliers", "supplier_id", po.supplier_id);
  const product = store.get("products", "product_id", po.product_id);
  const shipment = store.get("shipments", "po_id", poId);
  const receipt = store.get("goods_receipts", "po_id", poId);
  const invoice = store.get("invoices", "po_id", poId);
  const matching = store.get("three_way_matching", "po_id", poId);
  return { po, supplier, product, shipment, receipt, invoice, matching };
}


export function shipmentTrackingView(shipmentId?: string) {
  const rows = normalizeDemoShipmentDates(store.list("shipments").filter(row => !shipmentId || row.shipment_id === shipmentId));
  return rows.map(shipment => {
    const trailer = store.get("trailers", "trailer_id", shipment.trailer_id);
    const po = store.get("purchase_orders", "po_id", shipment.po_id);
    const supplier = po ? store.get("suppliers", "supplier_id", po.supplier_id) : undefined;
    const yard = trailer ? store.get("yard_locations", "trailer_id", trailer.trailer_id) : undefined;
    const assignment = trailer ? store.get("dock_assignments", "trailer_id", trailer.trailer_id) : undefined;
    const scheduled = Date.parse(shipment.scheduled_arrival ?? "");
    const eta = Date.parse(shipment.eta ?? "");
    const delayMinutes = shipment.status === "Delayed" && Number.isFinite(scheduled) && Number.isFinite(eta) ? Math.max(0, Math.round((eta - scheduled) / 60000)) : 0;
    const tracking = buildShipmentTrackingState(shipment);
    return {
      ...shipment,
      ...tracking,
      po_id: shipment.po_id,
      trailer_id: shipment.trailer_id,
      current_location: tracking.current_location || (trailer?.current_yard_location ?? "Unknown"),
      current_lat: shipment.current_lat ?? "",
      current_lon: shipment.current_lon ?? "",
      scheduled_arrival: shipment.scheduled_arrival ?? "",
      eta: shipment.eta ?? shipment.scheduled_arrival ?? "",
      priority: shipment.priority ?? po?.priority ?? trailer?.priority ?? "Normal",
      delay_minutes: String(delayMinutes),
      delay_duration: delayMinutes > 0 ? `${Math.floor(delayMinutes / 60)}h ${delayMinutes % 60}m` : "—",
      trailer_status: trailer?.status ?? "Unknown",
      trailer_type: trailer?.trailer_type ?? "Unknown",
      load_type: trailer?.load_type ?? "Unknown",
      yard_location_id: yard?.yard_location_id ?? trailer?.current_yard_location ?? "—",
      yard_status: yard?.status ?? "—",
      dock_id: assignment?.dock_id ?? "—",
      dock_status: assignment?.status ?? "—",
      supplier_name: supplier?.supplier_name ?? "—",
      po_status: po?.status ?? "—",
    };
  });
}

export function shipmentTrackingDetail(shipmentId: string) {
  const shipment = shipmentTrackingView(shipmentId)[0];
  const rawShipment = normalizeDemoShipmentDates([store.get("shipments", "shipment_id", shipmentId) ?? {} as Row])[0] as Row | undefined;
  if (!shipment || !rawShipment) return undefined;
  const po = store.get("purchase_orders", "po_id", shipment.po_id);
  const supplier = po ? store.get("suppliers", "supplier_id", po.supplier_id) : undefined;
  const product = po ? store.get("products", "product_id", po.product_id) : undefined;
  const trailer = store.get("trailers", "trailer_id", shipment.trailer_id);
  const yard = trailer ? store.get("yard_locations", "trailer_id", trailer.trailer_id) : undefined;
  const assignment = trailer ? store.get("dock_assignments", "trailer_id", trailer.trailer_id) : undefined;
  const receipt = po ? store.get("goods_receipts", "po_id", po.po_id) : undefined;
  const invoice = po ? store.get("invoices", "po_id", po.po_id) : undefined;
  const matching = invoice ? store.get("three_way_matching", "invoice_id", invoice.invoice_id) : undefined;
  const risk = rawShipment.status === "Delayed" ? "High delay risk" : rawShipment.status === "At Yard" ? "Dock/receiving coordination required" : shipment.priority === "High" ? "Priority movement" : "On plan";
  return {
    shipment,
    po: po ? { ...po, supplier_name: supplier?.supplier_name ?? "—", product_name: product?.product_name ?? "—" } : undefined,
    trailer,
    yard,
    assignment,
    receipt,
    invoice,
    matching,
    risk,
    timeline: [
      { label: "Purchase Order", id: po?.po_id, status: po?.status, timestamp: po?.order_date },
      { label: "Departure", id: rawShipment.shipment_id, status: "Departed origin", timestamp: rawShipment.departure_time },
      { label: "Current location", id: shipment.current_location, status: rawShipment.status, timestamp: rawShipment.eta },
      { label: "Scheduled arrival", id: rawShipment.shipment_id, status: rawShipment.scheduled_arrival, timestamp: rawShipment.scheduled_arrival },
      { label: "Yard", id: yard?.yard_location_id ?? trailer?.current_yard_location, status: yard?.status ?? "Not in yard", timestamp: yard?.updated_at },
      { label: "Dock", id: assignment?.dock_id, status: assignment?.status ?? "Not assigned", timestamp: assignment?.scheduled_start },
      { label: "Goods Receipt", id: receipt?.gr_id, status: receipt?.status ?? "Pending", timestamp: receipt?.received_at },
    ],
  };
}

function parseShipmentDate(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatShipmentDate(value: Date) {
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function normalizeDemoShipmentDates(rows: Row[] = []) {
  if (!rows.length) return rows;
  const activeRows = rows.filter(row => row && row.status !== "Delivered");
  const candidateDates = activeRows.flatMap(row => {
    return [row.scheduled_arrival, row.eta, row.departure_time].map(value => parseShipmentDate(value)).filter((date): date is Date => Boolean(date));
  });

  if (!candidateDates.length) return rows;
  const referenceStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
  const minDate = new Date(Math.min(...candidateDates.map(date => date.getTime())));
  const dayShiftMs = referenceStart - minDate.getTime();

  return rows.map(row => {
    if (!row || row.status === "Delivered") return row;
    const normalized = { ...row };
    for (const key of ["scheduled_arrival", "eta", "departure_time"]) {
      const value = normalized[key];
      const parsed = parseShipmentDate(value);
      if (parsed) normalized[key] = formatShipmentDate(new Date(parsed.getTime() + dayShiftMs));
    }
    return normalized;
  });
}
