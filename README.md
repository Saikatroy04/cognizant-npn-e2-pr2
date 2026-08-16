# AI-Powered Autonomous Supply Chain Control Tower

This prototype implements the combined **E2 + PR2** Cognizant NPN hackathon workflow as a full-stack enterprise control tower. It uses the supplied CSV archive as the source of demo truth and keeps the data-access and workflow services modular so a production database or external OCR/LLM provider can be introduced later.

## Implemented workflow

> Procurement Request → Requisition → Supplier Recommendation → Purchase Order → Shipment → Trailer Tracking → Yard → Dock Recommendation → Dock Assignment → Goods Receipt → Invoice OCR → 3-Way Matching → Approval or Exception/Human Review

The sidebar labels are the required operating modules: **Procurement**, **Logistics**, **Yard and Dock**, **Invoicing**, **Matching**, **Exceptions**, and **Analytics**. The dashboard and code preserve the workflow identifiers **E2** and **PR2**.

## Technology

| Layer | Implementation |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, Lucide React |
| Backend | Node.js, Express runtime, tRPC 11, Zod validation |
| Data layer | CSV-backed typed service in `server/services/dataStore.ts`, with in-memory runtime mutations and PostgreSQL-ready service boundaries |
| AI / decision support | Deterministic local NLP extraction, explainable supplier scoring, explainable dock scoring, deterministic anomaly rules, CSV-backed OCR fallback |
| Testing | Vitest, TypeScript check, production Vite/esbuild build |

## Project structure

```text
client/src/pages/Home.tsx              Enterprise dashboard and workflow modules
client/src/App.tsx                    Application shell
client/src/index.css                  Visual system and responsive base styles
server/routers.ts                     Typed tRPC API surface
server/services/dataStore.ts          CSV parser, joins, KPI aggregation, runtime data store
server/services/workflow.ts            Procurement, dock, OCR, matching, anomaly services
server/workflow.test.ts                E2 + PR2 service tests
data/*.csv                             Supplied demo data, preserved without substitution
data_inventory.txt                    Source-data headers, counts, and samples
todo.md                                Implementation checklist
```

## Run locally

From the project directory:

```bash
cd /home/ubuntu/cognizant-npn-e2-pr2
pnpm install
pnpm dev
```

The managed development server serves both the React frontend and the tRPC backend. The application uses the configured Manus runtime environment for the server process. There is no separate frontend or backend process to start in this scaffold.

To validate the project:

```bash
pnpm check
pnpm test
pnpm build
```

## API surface

The backend is tRPC-first and is mounted under `/api/trpc`. The main procedures are grouped as `dashboard.summary`, `procurement.extract`, `procurement.recommendSuppliers`, `requisitions.list/create`, `purchaseOrders.list/detail/create/createShipment`, `shipments.list/detail/updateStatus`, `trailers`, `yard`, `docks`, `dock.recommend/assign/schedule`, `goodsReceipts.list/capture`, `invoices.list/process/processFile`, `matching.list/run`, `alerts.list/resolve/review`, and `aiDecisions`. Matching returns quantity, price, total, supplier, and PO variances with a configurable tolerance parameter. Dock recommendations return factor values, weighted contributions, confidence, and reasons.

## AI and OCR configuration

The current demo is fully usable without user-provided API keys. Procurement extraction, supplier recommendations, dock recommendations, matching, and anomaly detection run server-side using deterministic business logic over the supplied CSV records. Invoice processing now accepts real PDF/image bytes: PDFs use server-side `pdf-parse` text extraction, while images use the server-side built-in vision model with structured JSON output and field-level confidence. The CSV-backed record processor remains available as a deterministic fallback. Numeric reconciliation is not delegated entirely to an LLM.

The scaffold already provides server-side built-in AI environment variables through `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY`. An external LLM or OCR provider can be connected inside `server/services/workflow.ts` or a new service module without exposing credentials to the frontend. If an external provider is added, use environment variables through the project secret manager and retain the local fallback for judges.

## Judge demonstration script

1. Open **Control Tower** and point out the six KPIs, E2 shipment status, PR2 purchase-order status, invoice matching outcomes, critical alerts, and recent explainable AI decisions.
2. Open **Procurement** and submit the prefilled request: `I need 500 temperature sensors for the Kolkata warehouse.` Run extraction and show product, quantity, destination, priority, required date, confidence, and reasoning.
3. Create the requisition and show the supplier recommendation panel. Explain the score using price fit, rating, reliability, delivery speed, and category alignment.
4. Open **Logistics** and show the shipment list, trailer identifiers, ETA, status, origin/destination, and simulated route visualization.
5. Open **Yard and Dock**, select a trailer, run the AI dock recommendation, show the score and reasons, then assign the recommended dock.
6. Open **Invoicing**, choose an invoice from the supplied records, optionally select a PDF/image filename, and run the OCR abstraction. Show extracted invoice number, PO, supplier, product, quantity, unit price, total, and confidence.
7. Open **Matching**, run the deterministic PO–Goods Receipt–Invoice reconciliation, and demonstrate both `Matched → Auto Approve` and an exception record that produces `Payment On Hold → Human Review Required`. Review the visible quantity, price, total, supplier, and PO variances.
8. Open **Exceptions** and use **Acknowledge**, **Resolve**, or the review procedures for exception handling. Explain price, quantity, damaged-goods, duplicate-invoice, low-confidence, truck-delay, and dock-conflict rules.
9. Finish in **Analytics** to show commitment value, requisition coverage, receiving acceptance, anomaly rate, and matching outcome distribution.

## Source-data note

The archive supplied for this prototype contains `suppliers.csv`, `products.csv`, `requisitions.csv`, `purchase_orders.csv`, `shipments.csv`, `trailers.csv`, `yard_locations.csv`, `dock_doors.csv`, `dock_assignments.csv`, `goods_receipts.csv`, `invoices.csv`, `three_way_matching.csv`, `alerts.csv`, and `ai_decisions.csv`. The application reads those records directly and does not generate replacement demo datasets.

## Backend Reality Audit

The project includes `BACKEND_AUDIT.md`, which maps dashboard and E2 + PR2 actions to their exact tRPC procedures, service implementations, CSV sources, AI methods, and fallback paths.

Call the live audit endpoints directly:

```bash
curl 'https://cognizantnpn-nqhpfzux.manus.space/api/trpc/audit.backend?input=%7B%7D'
curl 'https://cognizantnpn-nqhpfzux.manus.space/api/trpc/audit.workflow?input=%7B%7D'
```

`audit.backend` reports source-file existence, byte sizes, row counts, the tRPC route catalog, persistence mode, and implementation verdict. `audit.workflow` performs a non-destructive trace of the first supplied PO through shipment, trailer, yard, dock, receipt, invoice, matching, and exception records. The audit confirms a real Express + tRPC backend reading supplied CSV files, while the current demo mutations are process-memory changes and reset when the server restarts. Durable production persistence requires wiring the operational services to database tables and migrations.
