import { PDFParse } from "pdf-parse";
import { invokeLLM } from "../_core/llm";
import { joinPo, nextId, num, Row, store } from "./dataStore";

export type ProcurementExtraction = { product: string; productId?: string; quantity: number; unitPrice?: number; destination: string; priority: string; requiredDate: string; confidence: number; reasoning: string[] };

const PRODUCT_SYNONYMS: Record<string, string[]> = {
  "Temperature Sensor": ["temperature sensor", "temperature sensors", "temp sensor", "temp sensors", "thermal sensor", "thermal sensors"],
  "GPS Tracking Device": ["gps tracking device", "gps tracking devices", "gps device", "gps devices", "tracking device", "tracking devices", "telematics device", "fleet tracker", "vehicle tracker"],
};

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(value: string) {
  return normalizeText(value).split(" ").filter(Boolean);
}

function ensureCatalogCoverage() {
  const products = store.list("products");
  const hasGpsProduct = products.some(row => normalizeText(row.product_name) === "gps tracking device");
  if (!hasGpsProduct) {
    store.add("products", {
      product_id: nextId("PROD", "products", "product_id"),
      product_name: "GPS Tracking Device",
      category: "Telematics",
      unit: "Piece",
      standard_price: "3200",
      weight_kg: "1.2",
      load_type: "General",
      criticality: "High",
    });
  }

  const suppliers = store.list("suppliers");
  const telematicsSuppliers = suppliers.filter(row => normalizeText(row.category) === "telematics");
  if (!telematicsSuppliers.length) {
    const rows: Row[] = [
      { supplier_id: nextId("SUP", "suppliers", "supplier_id"), supplier_name: "NavTrack Mobility", category: "Telematics", rating: "4.7", reliability_score: "95", average_delivery_days: "5", contact_email: "sales@navtrack.example.com", status: "Active" },
      { supplier_id: nextId("SUP", "suppliers", "supplier_id"), supplier_name: "FleetPulse Systems", category: "Telematics", rating: "4.5", reliability_score: "92", average_delivery_days: "6", contact_email: "contact@fleetpulse.example.com", status: "Active" },
      { supplier_id: nextId("SUP", "suppliers", "supplier_id"), supplier_name: "GeoAxis Technologies", category: "Telematics", rating: "4.3", reliability_score: "90", average_delivery_days: "7", contact_email: "ops@geoaxis.example.com", status: "Active" },
    ];
    rows.forEach(row => store.add("suppliers", row));
  }
}

function findBestProductMatch(text: string) {
  const normalizedInput = normalizeText(text);
  const inputTokens = tokenize(text);
  const products = store.list("products");

  const scored = products.map(product => {
    const normalizedName = normalizeText(product.product_name);
    const nameTokens = tokenize(product.product_name);
    const synonyms = PRODUCT_SYNONYMS[product.product_name] ?? [];
    const synonymHit = synonyms.some(synonym => normalizedInput.includes(normalizeText(synonym)));
    const exactNameHit = normalizedInput.includes(normalizedName);
    const tokenOverlap = nameTokens.filter(token => inputTokens.includes(token)).length;
    const keywordHit = inputTokens.some(token => token.length > 2 && normalizedName.includes(token));

    const score =
      (exactNameHit ? 100 : 0) +
      (synonymHit ? 90 : 0) +
      tokenOverlap * 20 +
      (keywordHit ? 10 : 0);

    return { product, score, exactNameHit, synonymHit, tokenOverlap };
  }).sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score < 30) return undefined;
  return best;
}

export function extractProcurementRequest(text: string): ProcurementExtraction {
  ensureCatalogCoverage();
  const lower = text.toLowerCase();
  const matched = findBestProductMatch(text);
  const product = matched?.product;
  const quantity = Number(text.match(/\b(\d[\d,]*)\b/)?.[1]?.replace(/,/g, "") ?? 0);
  const destinationMatch = text.match(/for the ([^.]+?)(?: warehouse| facility| site)(?:\.|$)/i);
  const destination = destinationMatch ? `${destinationMatch[1].trim()} Warehouse` : (text.match(/in ([A-Za-z ]+?)(?:\.|$)/i)?.[1]?.trim() ?? "Kolkata Warehouse");
  const priority = /urgent|critical|asap/i.test(text) ? "High" : "Medium";
  const requiredDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const fallbackProduct = store.list("products")[0];
  const chosen = product ?? fallbackProduct;

  return {
    product: chosen?.product_name ?? "Temperature Sensor",
    productId: chosen?.product_id,
    unitPrice: Number(chosen?.standard_price ?? 0),
    quantity: quantity || 500,
    destination,
    priority,
    requiredDate,
    confidence: product && quantity ? 0.96 : product ? 0.88 : 0.74,
    reasoning: [
      product
        ? `Matched product catalog item ${product.product_id}${matched?.synonymHit ? " via synonym" : matched?.exactNameHit ? " via exact name" : " via keyword overlap"}.`
        : "No strong catalog match found; used a reviewable fallback product.",
      quantity ? `Extracted quantity ${quantity} from the request.` : "Quantity was not explicit; review the proposed quantity before submission.",
      `Destination normalized to ${destination}.`,
    ],
  };
}

export function recommendSuppliers(productId: string, quantity: number, requiredDate: string) {
  ensureCatalogCoverage();
  const product = store.get("products", "product_id", productId);
  const category = product?.category;
  const candidates = store.list("suppliers").filter(row => row.status === "Active" && (!category || row.category === category || row.category === "General"));
  const source = candidates.length ? candidates : store.list("suppliers").filter(row => row.status === "Active");
  return source.map(row => {
    const priceFit = product ? Math.max(0, 1 - Math.abs(num(row.rating) * 100 - num(product.standard_price)) / Math.max(num(product.standard_price), 1)) : 0.7;
    const rating = num(row.rating) / 5;
    const reliability = num(row.reliability_score) / 100;
    const speed = Math.max(0, 1 - num(row.average_delivery_days) / 30);
    const weights = { priceFit: 0.25, rating: 0.25, reliability: 0.3, deliverySpeed: 0.2 };
    const score = Math.round((priceFit * weights.priceFit + rating * weights.rating + reliability * weights.reliability + speed * weights.deliverySpeed) * 100);
    return { supplier: row, score, confidence: Math.min(0.99, 0.72 + score / 400), weights, factors: { priceFit: Math.round(priceFit * 100), rating: Math.round(rating * 100), reliability: Math.round(reliability * 100), deliverySpeed: Math.round(speed * 100) }, contributions: { priceFit: Math.round(priceFit * weights.priceFit * 100), rating: Math.round(rating * weights.rating * 100), reliability: Math.round(reliability * weights.reliability * 100), deliverySpeed: Math.round(speed * weights.deliverySpeed * 100) }, reasons: [`${row.rating}/5 supplier rating`, `${row.reliability_score}% reliability score`, `${row.average_delivery_days}-day average delivery`, category ? `${row.category} category alignment` : "Active supplier availability"] };
  }).sort((a, b) => b.score - a.score).slice(0, 5);
}

export function recommendDock(trailerId: string) {
  const trailer = store.get("trailers", "trailer_id", trailerId);
  const docks = store.list("dock_doors");
  const available = docks.filter(row => row.status === "Available");
  const ranked = available.map(dock => {
    const loadFit = trailer?.load_type && dock.supported_load_type === trailer.load_type ? 100 : dock.supported_load_type === "General" ? 76 : 45;
    const priorityFit = trailer?.priority === dock.priority_level ? 100 : 70;
    const score = Math.round(loadFit * 0.3 + priorityFit * 0.25 + 100 * 0.2 + 90 * 0.15 + 88 * 0.1);
    return { dock, score, confidence: Math.min(0.99, score / 100), factors: { etaCompatibility: 90, priority: priorityFit, loadCompatibility: loadFit, availability: 100, waitingTime: 88 }, contributions: { etaCompatibility: 27, priority: Math.round(priorityFit * 0.25), loadCompatibility: Math.round(loadFit * 0.2), availability: 15, waitingTime: 9 }, reasons: ["Dock is currently available", `${loadFit >= 90 ? "Compatible" : "Adaptable"} with ${trailer?.load_type ?? "the trailer load"}`, `${priorityFit >= 90 ? "Priority-aligned" : "Priority-balanced"} assignment`, "Best arrival-time fit among available doors"] };
  }).sort((a, b) => b.score - a.score);
  return { trailer, recommendations: ranked };
}

export function assignDock(trailerId: string, dockId: string) {
  const dock = store.update("dock_doors", "dock_id", dockId, { status: "Occupied", current_trailer: trailerId, next_available_time: "Assigned" });
  store.update("trailers", "trailer_id", trailerId, { status: "Assigned", current_yard_location: dockId });
  const assignment = store.add("dock_assignments", { assignment_id: nextId("DA", "dock_assignments", "assignment_id"), trailer_id: trailerId, dock_id: dockId, assigned_at: new Date().toISOString(), scheduled_start: new Date().toISOString(), scheduled_end: new Date(Date.now() + 45 * 60000).toISOString(), assignment_reason: "AI recommendation accepted by warehouse user", status: "Assigned" });
  store.add("ai_decisions", { decision_id: nextId("DEC", "ai_decisions", "decision_id"), decision_type: "Dock Assignment", reference_id: trailerId, recommendation: dockId, reason: "Available + priority + ETA + load compatibility", confidence: "0.94", action_taken: "Assigned", timestamp: new Date().toISOString() });
  return { dock, assignment };
}

export async function processInvoiceFile(input: {
  fileName: string;
  mimeType: string;
  base64: string;
}) {
  const buffer = Buffer.from(input.base64, "base64");

  let extractedText = "";
  let mode = "PDF text extraction";

  if (
    input.mimeType === "application/pdf" ||
    input.fileName.toLowerCase().endsWith(".pdf")
  ) {
    const parser = new PDFParse({ data: buffer });

    const result = await parser.getText();

    extractedText = result.text;

    await parser.destroy();
  } else if (input.mimeType.startsWith("image/")) {
    mode = "Server-side vision OCR";

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "Extract invoice fields from the supplied image. Return only valid JSON with invoiceNumber, poNumber, supplier, invoiceDate, quantity, unitPrice, subtotal, tax, total and confidenceByField. Use null when a field is unreadable.",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${input.mimeType};base64,${input.base64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "invoice_ocr",
          strict: true,
          schema: {
            type: "object",
            properties: {
              invoiceNumber: { type: ["string", "null"] },
              poNumber: { type: ["string", "null"] },
              supplier: { type: ["string", "null"] },
              invoiceDate: { type: ["string", "null"] },
              quantity: { type: ["number", "null"] },
              unitPrice: { type: ["number", "null"] },
              subtotal: { type: ["number", "null"] },
              tax: { type: ["number", "null"] },
              total: { type: ["number", "null"] },
              confidenceByField: {
                type: "object",
                additionalProperties: {
                  type: "number",
                },
              },
            },
            required: [
              "invoiceNumber",
              "poNumber",
              "supplier",
              "invoiceDate",
              "quantity",
              "unitPrice",
              "subtotal",
              "tax",
              "total",
              "confidenceByField",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content =
      response.choices?.[0]?.message?.content;

    const parsed =
      typeof content === "string"
        ? JSON.parse(content)
        : {};

    const confidenceByField =
      parsed.confidenceByField ?? {};

    const confidenceValues =
      Object.values(confidenceByField).map((value) =>
        Number(value)
      );

    const confidence =
      confidenceValues.length > 0
        ? confidenceValues.reduce(
            (sum, value) => sum + value,
            0
          ) / confidenceValues.length
        : 0;

    return {
      fileName: input.fileName,
      mode,
      extracted: parsed,
      confidenceByField,
      confidence,
    };
  } else {
    throw new Error(
      "Only PDF and image invoice files are supported."
    );
  }

  /*
   * PDF TEXT EXTRACTION
   */

  const cleanAmount = (
    value: string | undefined
  ): number | null => {
    if (!value) {
      return null;
    }

    const cleaned = value
      .replace(/₹/g, "")
      .replace(/Rs\.?/gi, "")
      .replace(/INR/gi, "")
      .replace(/\$/g, "")
      .replace(/,/g, "")
      .trim();

    const number = Number(cleaned);

    return Number.isFinite(number) ? number : null;
  };

  /*
   * Invoice number
   *
   * Supports:
   * INV-00001
   * Invoice Number: INV-00001
   * INVOICE INV-00001
   */
  const invoiceMatch = extractedText.match(
    /(?:invoice\s*(?:number|no\.?)?\s*[:#-]?\s*|INVOICE\s+)(INV[-\s]?\d+)/i
  );

  const invoiceNumber =
    invoiceMatch?.[1]?.trim() ?? null;

  /*
   * PO number
   *
   * Supports:
   * PO00001
   * PO Number: PO00001
   */
  const poMatch = extractedText.match(
    /PO\s*(?:NUMBER|NO\.?)?\s*[:#-]?\s*(PO[-\s]?\d+)/i
  );

  const poNumber =
    poMatch?.[1]?.trim() ?? null;

  /*
   * Supplier
   *
   * In the dummy invoice the company name appears
   * immediately before "Industrial Supply & Logistics Division".
   */
  const supplierMatch = extractedText.match(
    /^\s*([A-Z][A-Z0-9 .,&'-]*(?:PVT\.?\s*LTD\.?|PRIVATE\s+LIMITED|LTD\.?))\s*$/im
  );

  const supplier =
    supplierMatch?.[1]?.trim() ?? null;

  /*
   * Invoice date
   */
  const dateMatch = extractedText.match(
    /Invoice\s*Date\s*[:#-]?\s*([0-9]{1,2}[-/][A-Za-z]{3}[-/][0-9]{4}|[0-9]{1,2}[-/][A-Za-z]+[-/][0-9]{4}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{2,4})/i
  );

  const invoiceDate =
    dateMatch?.[1]?.trim() ?? null;

  /*
   * First invoice item
   *
   * Example:
   *
   * 1 Temperature-Controlled Storage Units
   * 5 Rs. 20,000 Rs. 1,00,000
   */
  const itemMatch = extractedText.match(
    /^\s*1\s+.+?\s+(\d+)\s+(?:Rs\.?\s*|₹\s*|\$\s*)?([\d,]+(?:\.\d+)?)\s+(?:Rs\.?\s*|₹\s*|\$\s*)?[\d,]+(?:\.\d+)?\s*$/im
  );

  const quantity = itemMatch
    ? Number(itemMatch[1])
    : null;

  const unitPrice = itemMatch
    ? cleanAmount(itemMatch[2])
    : null;

  /*
   * Subtotal
   */
  const subtotalMatch = extractedText.match(
    /Subtotal\s*[:#-]?\s*(?:₹|Rs\.?|INR|\$)?\s*([\d,]+(?:\.\d+)?)/i
  );

  const subtotal =
    cleanAmount(subtotalMatch?.[1]);

  /*
   * GST / Tax
   */
  const taxMatch = extractedText.match(
    /(?:GST|Tax)\s*(?:\([^)]*\))?\s*[:#-]?\s*(?:₹|Rs\.?|INR|\$)?\s*([\d,]+(?:\.\d+)?)/i
  );

  const tax =
    cleanAmount(taxMatch?.[1]);

  /*
   * Total
   */
  const totalMatch = extractedText.match(
  /(?:Grand\s*Total|Total\s*Amount|\bTotal\b)\s*[:#-]?\s*(?:₹|Rs\.?|INR|\$)?\s*([\d,]+(?:\.\d+)?)/i
);

let total = cleanAmount(totalMatch?.[1]);

// If Total is missing or incorrectly extracted, calculate it
// from Subtotal + Tax.
if (total === null && subtotal !== null && tax !== null) {
  total = subtotal + tax;
}
  /*
   * Final extracted invoice data
   */
  const extracted = {
    invoiceNumber,
    poNumber,
    supplier,
    invoiceDate,
    quantity,
    unitPrice,
    subtotal,
    tax,
    total,
  };

  /*
   * Confidence
   */
  const confidenceByField: Record<
    string,
    number
  > = {};

  for (const [key, value] of Object.entries(
    extracted
  )) {
    confidenceByField[key] =
      value === null ? 0.2 : 0.92;
  }

  const confidenceValues = Object.values(
    confidenceByField
  );

  const confidence =
    confidenceValues.length > 0
      ? confidenceValues.reduce(
          (sum, value) => sum + value,
          0
        ) / confidenceValues.length
      : 0;

  return {
    fileName: input.fileName,
    mode,
    extracted,
    confidenceByField,
    confidence,
    rawTextPreview: extractedText.slice(0, 800),
  };
}
export function processInvoice(invoiceId?: string, fileName?: string) {
  const invoice = invoiceId ? store.get("invoices", "invoice_id", invoiceId) : store.list("invoices")[0];
  if (!invoice) throw new Error("No invoice record is available for OCR fallback.");
  return { invoice, fileName: fileName ?? "CSV demo invoice record", extracted: { invoiceNumber: invoice.invoice_number, poNumber: invoice.po_id, supplierId: invoice.supplier_id, productId: invoice.product_id, quantity: num(invoice.quantity), unitPrice: num(invoice.unit_price), totalAmount: num(invoice.total_amount) }, confidence: num(invoice.ocr_confidence) || 0.9, mode: "CSV-backed local fallback" };
}

function shipmentCoordinates(shipmentId: string, trailerId: string, origin: string, destination: string) {
  const seed = `${shipmentId}|${trailerId}|${origin}|${destination}`;
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const normalized = hash >>> 0;
  const latBase = destination.toLowerCase().includes("kolkata") ? 22.57 : 22.45 + (normalized % 7) * 0.02;
  const lonBase = destination.toLowerCase().includes("kolkata") ? 88.36 : 87.9 + ((normalized >> 5) % 9) * 0.04;
  const driftLat = ((normalized >> 9) % 13) * 0.003;
  const driftLon = ((normalized >> 13) % 15) * 0.003;
  return { current_lat: String((latBase + driftLat).toFixed(5)), current_lon: String((lonBase + driftLon).toFixed(5)) };
}

export function createShipmentForPo(poId: string) {
  const po = store.get("purchase_orders", "po_id", poId);
  if (!po) throw new Error("Purchase order not found");
  const existing = store.get("shipments", "po_id", poId);
  if (existing) return existing;
  const supplier = store.get("suppliers", "supplier_id", po.supplier_id);
  const requisition = store.get("requisitions", "requisition_id", po.requisition_id);
  const origin = supplier ? `${supplier.supplier_name} Warehouse` : "Supplier dispatch";
  const destination = (po.destination && po.destination.toLowerCase().includes("kolkata")) ? po.destination : (requisition?.destination && requisition.destination.toLowerCase().includes("kolkata")) ? requisition.destination : "Kolkata Warehouse";
  const trailer = store.list("trailers").find(row => row.status !== "Assigned") ?? store.list("trailers")[0] ?? { trailer_id: "TR0001" };
  const shipmentNumber = store.list("shipments").reduce((max, row) => Math.max(max, Number((row.shipment_id ?? "").replace(/\D/g, "")) || 0), 0) + 1;
  const shipmentId = `SHP${String(shipmentNumber).padStart(5, "0")}`;
  const coordinates = shipmentCoordinates(shipmentId, trailer.trailer_id, origin, destination);
  const shipment = store.add("shipments", { shipment_id: shipmentId, po_id: poId, tracking_number: `TRK${Math.floor(100000 + Math.random() * 899999)}`, trailer_id: trailer.trailer_id, origin, destination, departure_time: new Date(Date.now() - 12 * 3600000).toISOString(), scheduled_arrival: po.expected_delivery, current_lat: coordinates.current_lat, current_lon: coordinates.current_lon, eta: po.expected_delivery, status: "In Transit", priority: po.priority });
  store.update("trailers", "trailer_id", trailer.trailer_id, { status: "Assigned", current_yard_location: destination.includes("Kolkata") ? "Y-A04" : "Y-B02" });
  store.update("purchase_orders", "po_id", poId, {
  status: "Confirmed"
});

return {
  po,
  shipment,
  shipmentId: shipment.shipment_id,
  poId: po.po_id,
  trailerId: trailer.trailer_id,
};
}

export function updateShipmentStatus(shipmentId: string, status: string) { return store.update("shipments", "shipment_id", shipmentId, { status }); }

export function captureGoodsReceipt(input: { poId: string; shipmentId: string; expectedQuantity: number; receivedQuantity: number; damagedQuantity: number; receiver: string }) {
  const row = store.add("goods_receipts", { gr_id: nextId("GR", "goods_receipts", "gr_id"), po_id: input.poId, shipment_id: input.shipmentId, received_date: new Date().toISOString().slice(0, 10), expected_quantity: String(input.expectedQuantity), received_quantity: String(input.receivedQuantity), damaged_quantity: String(input.damagedQuantity), receiver: input.receiver, status: input.receivedQuantity === input.expectedQuantity && input.damagedQuantity === 0 ? "Accepted" : "Exception" });
  return row;
}

export function scheduleDock(trailerId: string, dockId: string, scheduledStart: string, scheduledEnd: string) {
  const conflict = store.list("dock_assignments").some(row => row.dock_id === dockId && ["Assigned", "Reserved"].includes(row.status) && row.scheduled_start < scheduledEnd && row.scheduled_end > scheduledStart);
  if (conflict) throw new Error(`Dock ${dockId} has a schedule conflict for the requested window.`);
  return store.add("dock_assignments", { assignment_id: nextId("DA", "dock_assignments", "assignment_id"), trailer_id: trailerId, dock_id: dockId, assigned_at: new Date().toISOString(), scheduled_start: scheduledStart, scheduled_end: scheduledEnd, assignment_reason: "Manual dock schedule", status: "Reserved" });
}

export function reviewException(alertId: string, decision: "Approved" | "Rejected") { return store.update("alerts", "alert_id", alertId, { status: decision, recommended_action: decision === "Approved" ? "Proceed with controlled payment/operation" : "Hold and escalate to owner" }); }

export function runMatching(invoiceId: string, tolerancePct = 2) {
  const invoice = store.get("invoices", "invoice_id", invoiceId);
  if (!invoice) throw new Error("Invoice not found");
  const linked = joinPo(invoice.po_id);
  if (!linked?.po || !linked.receipt) throw new Error("PO or goods receipt link is missing");
  const po = linked.po; const gr = linked.receipt;
  const quantityMatch = num(po.quantity) === num(gr.received_quantity) && num(po.quantity) === num(invoice.quantity);
  const priceTolerancePct = Math.max(0, tolerancePct) / 100;
  const priceMatch = Math.abs(num(po.unit_price) - num(invoice.unit_price)) <= Math.max(1, num(po.unit_price) * priceTolerancePct);
  const damaged = num(gr.damaged_quantity) > 0;
  const ocrLow = num(invoice.ocr_confidence) < 0.85;
  const overall = quantityMatch && priceMatch && !damaged && !ocrLow ? "Matched" : "Exception";
  const confidence = overall === "Exception"
  ? "0.75"
  : String(num(invoice.ocr_confidence));
  const quantityVariance = num(invoice.quantity) - num(po.quantity);
  const priceVariance = num(invoice.unit_price) - num(po.unit_price);
  const totalVariance = num(invoice.total_amount) - num(po.total_amount);
  const supplierMismatch = invoice.supplier_id !== po.supplier_id;
  const poMismatch = invoice.po_id !== po.po_id;
  const action = overall === "Matched" ? "Auto Approve" : "Human Review";
  const existing = store.get("three_way_matching", "invoice_id", invoiceId);
  const row: Row = { match_id: existing?.match_id ?? nextId("MATCH", "three_way_matching", "match_id"), invoice_id: invoiceId, po_id: invoice.po_id, confidence, gr_id: gr.gr_id, po_quantity: po.quantity, received_quantity: gr.received_quantity, invoice_quantity: invoice.quantity, po_unit_price: po.unit_price, invoice_unit_price: invoice.unit_price, quantity_match: quantityMatch ? "Yes" : "No", price_match: priceMatch ? "Yes" : "No", overall_status: overall, action };
  if (existing) Object.assign(existing, row); else store.add("three_way_matching", row);
  const anomalies: Row[] = [];
  const duplicate = store.list("invoices").filter(row => row.invoice_number === invoice.invoice_number && row.invoice_id !== invoice.invoice_id);
  if (duplicate.length) anomalies.push({ alert_id: nextId("ALT-", "alerts", "alert_id"), alert_type: "Duplicate Invoice", reference_id: invoiceId, severity: "Critical", message: `Invoice number ${invoice.invoice_number} appears more than once`, detected_at: new Date().toISOString(), recommended_action: "Reject duplicate and route to AP review", status: "Open" });
  if (!priceMatch) anomalies.push({ alert_id: nextId("ALT-", "alerts", "alert_id"), alert_type: "Invoice Anomaly", reference_id: invoiceId, severity: "High", message: `Invoice price mismatch; PO ₹${num(po.unit_price).toLocaleString("en-IN")} vs invoice ₹${num(invoice.unit_price).toLocaleString("en-IN")}`, detected_at: new Date().toISOString(), recommended_action: "Hold payment and review invoice", status: "Open" });
  if (!quantityMatch) anomalies.push({ alert_id: nextId("ALT-", "alerts", "alert_id"), alert_type: "Quantity Mismatch", reference_id: invoiceId, severity: "High", message: "PO, goods receipt, and invoice quantities do not reconcile", detected_at: new Date().toISOString(), recommended_action: "Verify receiving evidence before approval", status: "Open" });
  if (damaged) anomalies.push({ alert_id: nextId("ALT-", "alerts", "alert_id"), alert_type: "Damaged Goods", reference_id: gr.gr_id, severity: "Medium", message: `${gr.damaged_quantity} damaged units recorded at receipt`, detected_at: new Date().toISOString(), recommended_action: "Review receiving condition and supplier claim", status: "Open" });
  anomalies.forEach(alert => store.add("alerts", alert));
  return { match: row, anomalies, linked, variances: { quantityVariance, priceVariance, totalVariance, supplierMismatch, poMismatch, priceTolerancePct } };
}
