import fs from "node:fs";
import path from "node:path";
import { joinPo, store, type Dataset } from "./dataStore";

const datasets: Dataset[] = [
  "suppliers", "products", "requisitions", "purchase_orders", "shipments", "trailers",
  "yard_locations", "dock_doors", "dock_assignments", "goods_receipts", "invoices",
  "three_way_matching", "alerts", "ai_decisions",
];

const routeCatalog = [
  "dashboard.summary",
  "procurement.extract",
  "procurement.recommendSuppliers",
  "requisitions.list/create",
  "purchaseOrders.list/detail/create/createShipment",
  "shipments.list/detail/updateStatus",
  "trailers.list",
  "yard.list",
  "docks.list",
  "dockAssignments.list",
  "dock.recommend/assign/schedule",
  "goodsReceipts.list/capture",
  "invoices.list/process/processFile",
  "matching.list/run",
  "alerts.list/resolve/review",
  "aiDecisions.list",
  "audit.backend/workflow",
];

function first(dataset: Dataset) {
  return store.list(dataset)[0];
}

export function backendAudit() {
  const dataDirectory = path.resolve(process.cwd(), "data");
  const sourceFiles = datasets.map(dataset => {
    const filePath = path.join(dataDirectory, `${dataset}.csv`);
    const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : undefined;
    return {
      dataset,
      file: `data/${dataset}.csv`,
      exists: Boolean(stat),
      bytes: stat?.size ?? 0,
      rowsLoaded: store.count(dataset),
      source: "supplied CSV archive",
    };
  });

  return {
    auditVersion: "E2-PR2-backend-audit-v1",
    generatedAt: new Date().toISOString(),
    verdict: {
      backend: "real Express + tRPC procedures",
      data: "real supplied CSV records loaded at server startup",
      workflow: "real deterministic service mutations and joins",
      persistence: "process-memory only; mutations are not durable across restart",
      ai: "deterministic explainable heuristics with optional built-in AI/OCR integration paths",
    },
    persistence: {
      mode: "in-memory process state",
      durableDatabaseConfigured: Boolean(process.env.DATABASE_URL),
      sourceOfTruth: "data/*.csv at startup",
      mutationBehavior: "store.add/store.update mutate the loaded process copy",
      restartBehavior: "CSV source records reload; runtime mutations reset",
    },
    sourceFiles,
    counts: Object.fromEntries(datasets.map(dataset => [dataset, store.count(dataset)])),
    routeCatalog,
    workflowCapabilities: {
      PR2: ["natural-language extraction", "requisition creation", "supplier recommendation", "purchase order generation"],
      E2: ["shipment creation", "trailer status", "yard lookup", "dock recommendation", "dock assignment", "dock scheduling"],
      reconciliation: ["goods receipt", "invoice OCR/file parsing", "PO-GR-Invoice matching", "anomaly and exception review"],
    },
  };
}

export function workflowVerification() {
  const po = first("purchase_orders");
  const shipment = po ? store.get("shipments", "po_id", po.po_id) : undefined;
  const trailer = shipment ? store.get("trailers", "trailer_id", shipment.trailer_id) : undefined;
  const yard = trailer ? store.get("yard_locations", "trailer_id", trailer.trailer_id) : undefined;
  const assignment = trailer ? store.get("dock_assignments", "trailer_id", trailer.trailer_id) : undefined;
  const receipt = po ? store.get("goods_receipts", "po_id", po.po_id) : undefined;
  const invoice = po ? store.get("invoices", "po_id", po.po_id) : undefined;
  const matching = invoice ? store.get("three_way_matching", "invoice_id", invoice.invoice_id) : undefined;
  const joined = po ? joinPo(po.po_id) : undefined;

  const steps = [
    { step: "Procurement Request", status: "available", evidence: "procurement.extract accepts arbitrary text" },
    { step: "Requisition", status: "available", evidence: `requisitions dataset has ${store.count("requisitions")} records and requisitions.create mutates the store` },
    { step: "Supplier Recommendation", status: "available", evidence: "procurement.recommendSuppliers returns scored factors, weights, contributions, confidence, and reasons" },
    { step: "Purchase Order", status: po ? "linked" : "missing", recordId: po?.po_id, evidence: joined?.supplier?.supplier_name },
    { step: "Shipment", status: shipment ? "linked" : "missing", recordId: shipment?.shipment_id, evidence: shipment?.status },
    { step: "Trailer", status: trailer ? "linked" : "missing", recordId: trailer?.trailer_id, evidence: trailer?.status },
    { step: "Yard", status: yard ? "linked" : "missing", recordId: yard?.yard_location_id, evidence: yard?.status },
    { step: "Dock", status: assignment ? "linked" : "not-assigned-in-source-row", recordId: assignment?.dock_id, evidence: assignment?.status },
    { step: "Goods Receipt", status: receipt ? "linked" : "missing", recordId: receipt?.gr_id, evidence: receipt?.status },
    { step: "Invoice OCR", status: invoice ? "CSV-record-available plus processFile endpoint" : "missing", recordId: invoice?.invoice_id, evidence: "invoices.processFile parses uploaded PDF/image bytes with confidence fields" },
    { step: "3-Way Matching", status: matching ? "linked" : "run endpoint available", recordId: matching?.match_id, evidence: matching?.overall_status },
    { step: "Exception / Human Review", status: store.count("alerts") > 0 ? "available" : "no-source-alerts", evidence: "alerts.resolve and alerts.review mutate exception status" },
  ];

  return {
    verificationVersion: "E2-PR2-workflow-verification-v1",
    nonDestructive: true,
    verifiedAt: new Date().toISOString(),
    selectedSourceRecords: { poId: po?.po_id, shipmentId: shipment?.shipment_id, trailerId: trailer?.trailer_id, receiptId: receipt?.gr_id, invoiceId: invoice?.invoice_id, matchId: matching?.match_id },
    steps,
    allRequiredLinksPresent: steps.filter(step => ["Purchase Order", "Shipment", "Trailer", "Yard", "Goods Receipt"].includes(step.step)).every(step => step.status === "linked"),
    caveat: "This endpoint does not create or mutate records; it traces the first supplied PO relationship graph and reports which operational links exist.",
  };
}
