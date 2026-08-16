# E2 + PR2 Backend Reality Audit

Generated for the Cognizant NPN Control Tower. The application uses a real Express server with typed tRPC procedures. The supplied CSV archive is loaded from `data/*.csv` at server startup into a process-memory store. The current project has `DATABASE_URL` available for the scaffold, but the E2 + PR2 demo services do not persist operational mutations to that database; mutations reset when the Node process restarts.

## UI-to-backend trace

| UI module/action | tRPC procedure | Implementation | Source/data behavior |
|---|---|---|---|
| Control Tower KPI and charts | `dashboard.summary` | `dashboardSummary()` in `server/services/dataStore.ts` | Aggregates supplied purchase orders, shipments, invoices, docks, matching, alerts, requisitions |
| Procurement request extraction | `procurement.extract` | `extractProcurementRequest()` in `server/services/workflow.ts` | Deterministic natural-language parsing; returns fields, confidence, and reasoning |
| Supplier recommendation | `procurement.recommendSuppliers` | `recommendSuppliers()` | Scores supplied suppliers using product, quantity, required date, price, delivery, reliability, and capacity factors; returns weights, contributions, reasons, confidence |
| Requisition creation | `requisitions.create` | `store.add("requisitions", ...)` | Adds a runtime record based on extracted fields; source CSV rows remain unchanged |
| PO generation | `purchaseOrders.create` | `store.add("purchase_orders", ...)` | Creates a runtime PO linked to the requisition and supplier recommendation |
| Shipment creation/status | `purchaseOrders.createShipment`, `shipments.updateStatus` | `createShipmentForPo()`, `updateShipmentStatus()` | Mutates the process-memory copy of shipment/PO records |
| Shipment traceability | `shipments.detail` | `joinPo()` plus shipment/trailer/yard/dock joins | Links PO, shipment, trailer, yard, dock assignment, receipt, invoice, matching |
| Dock recommendation | `dock.recommend` | `recommendDock()` | Deterministic weighted recommendation using ETA, priority, load type, availability, and wait; returns factor contributions and explanation |
| Dock assignment/scheduling | `dock.assign`, `dock.schedule` | `assignDock()`, `scheduleDock()` | Mutates process-memory dock/trailer/assignment rows and detects occupied windows |
| Goods receipt | `goodsReceipts.capture` | `captureGoodsReceipt()` | Adds a receipt linked to PO and shipment and derives accepted/damaged condition |
| Invoice list/CSV fallback | `invoices.list`, `invoices.process` | `processInvoice()` | Uses the supplied invoice row and reports CSV-backed fallback mode |
| Invoice PDF/image OCR | `invoices.processFile` | `processInvoiceFile()` | Extracts PDF text with `pdf-parse`; uses available image OCR integration path; falls back to text/CSV-compatible parsing and returns field confidence |
| Three-way matching | `matching.run` | `runMatching(invoiceId, tolerancePct)` | Compares PO, goods receipt, and invoice quantities/prices/totals with configurable tolerance and mismatch anomalies |
| Exception queue actions | `alerts.resolve`, `alerts.review` | `store.update()`, `reviewException()` | Mutates acknowledgement, resolution, approval, and rejection state in process memory |
| Analytics charts | `dashboard.summary` and list procedures | `dashboardSummary()`, `store.list()` | Derived from the supplied CSV datasets and runtime state |

## AI and fallback evidence

The procurement assistant is a deterministic NLP-style parser that extracts product, quantity, destination, priority, and required date from arbitrary text and exposes reasoning and confidence. Supplier and dock recommendations use explicit weighted heuristics rather than opaque placeholders; each recommendation includes factor values, weights, contributions, total score, and reasons. Invoice processing uses server-side PDF text extraction and structured field regex parsing, with field-level confidence. When a source invoice record is selected rather than a file, the UI explicitly reports the CSV-backed local fallback. Matching and anomaly detection are deterministic rule engines with configurable tolerance, duplicate detection, supplier/PO mismatch checks, quantity variance, price variance, total variance, and linked alert references.

## Direct verification endpoints

The server exposes two non-destructive public tRPC queries:

```text
GET /api/trpc/audit.backend?input=%7B%7D
GET /api/trpc/audit.workflow?input=%7B%7D
```

The first returns the loaded dataset names, file existence, byte sizes, row counts, route catalog, persistence mode, mutation behavior, and implementation verdict. The second traces the first supplied PO through shipment, trailer, yard, dock, goods receipt, invoice, matching, and exception records without mutating anything.

The verified current verdict is: **real backend procedures, real supplied CSV records, real deterministic workflow logic, and process-memory mutations that are not durable across restart**. This is a functional hackathon prototype, not yet a durable production transaction system.
