# Project TODO

- [x] Inspect the attached Cognizant NPN specification and extract the E2 + PR2 requirements
- [x] Inventory every supplied CSV file and document its actual columns
- [x] Map CSV relationships across suppliers, requisitions, purchase orders, shipments, trailers, yard, docks, goods receipts, and invoices
- [x] Define the modular E2 + PR2 domain model and application architecture
- [x] Implement CSV-backed data layer and source-preserving import pipeline using only supplied demo data
- [x] Implement tRPC APIs for dashboard, Procurement, Logistics, Yard and Dock, Invoicing, Matching, Exceptions, and Analytics
- [x] Implement conversational NLP procurement request intake
- [x] Implement requisition creation and supplier recommendation with explainable scoring and confidence
- [x] Implement purchase order generation
- [x] Implement shipment creation, trailer tracking, and logistics status updates
- [x] Implement yard visibility, dock scheduling, AI dock recommendation, and dock assignment with explanations
- [x] Implement goods receipt capture linked to purchase orders, shipments, and trailers
- [x] Implement invoice image/PDF upload and intelligent OCR extraction
- [x] Implement PO–Goods Receipt–Invoice 3-way matching with tolerance checks
- [x] Implement anomaly detection for mismatches, price deviations, and duplicate invoices
- [x] Implement human review queue with approve and reject actions
- [x] Implement enterprise dashboard with KPI analytics, charts, and real-time exception summary
- [x] Implement modular sidebar navigation with exact labels: Procurement, Logistics, Yard and Dock, Invoicing, Matching, Exceptions, and Analytics
- [x] Preserve E2 and PR2 identifiers throughout the UI and codebase
- [x] Add backend/unit tests for core business logic and workflow transitions
- [x] Run type-check, tests, and production build; fix all errors
- [x] Verify the complete demo workflow locally in the browser
- [x] Save the final checkpoint and document project structure, technologies, run commands, AI/API configuration, and judge demonstration steps
- [x] Extract and ingest cognizant_e2_pr2_dummy_data.zip into the project data layer without altering source records

## Functional Upgrade from pasted_content_2.txt

- [x] Make procurement flow support arbitrary natural-language requests with extracted field confidence and traceable requisition-to-PO linkage
- [x] Expand supplier recommendation UI to show weights, individual contributions, total score, and reasons
- [x] Add shipment operational timeline with complete PO, trailer, ETA, yard, dock, and goods receipt traceability
- [x] Make dock recommendation dynamic from actual shipment/trailer/dock data with factor contributions and explanation
- [x] Implement actual invoice PDF/image OCR processing with field-level confidence and local fallback
- [x] Expand 3-way matching with side-by-side values, quantity/price/total variances, supplier and PO mismatch checks, and configurable tolerances
- [x] Calculate anomaly rules dynamically and link each exception to its source records
- [x] Ensure exception approve, reject, acknowledge, and resolve actions persist state changes
- [x] Make KPI cards actionable and add requested analytics charts
- [x] Test the upgraded workflow end to end and document AI methods, APIs, relationships, OCR, NLP, anomaly detection, and run commands

## Backend Reality Audit

- [x] Trace every dashboard and workflow UI action to its tRPC procedure and service implementation
- [x] Verify whether supplied CSV data is read from source files and identify any in-memory versus persistent state
- [x] Verify whether mutations persist across requests and restarts
- [x] Verify the AI/NLP, supplier scoring, dock recommendation, OCR, matching, and anomaly implementations and fallbacks
- [x] Add a backend audit endpoint exposing data provenance, persistence mode, route catalog, and workflow evidence
- [x] Add a workflow verification endpoint that runs a non-destructive end-to-end trace using supplied records
- [x] Add tests for audit and workflow verification endpoints
- [x] Validate exposed endpoints locally and document clear access instructions and findings

## Audit Evidence Follow-up

- [x] Create a backend audit document mapping each major UI action to its tRPC procedure and service/helper
- [x] Enumerate concrete AI/NLP, supplier scoring, dock recommendation, OCR, matching, anomaly, and fallback implementations in the audit evidence
- [x] Add appRouter-level tests for audit.backend and audit.workflow procedures
- [x] Document audit endpoint access, sample findings, and the in-memory persistence limitation in README

## E2 Shipment Tracking Repair

- [x] Inspect shipments.csv, trailers.csv, purchase_orders.csv and current tracking procedures/components
- [x] Correct backend shipment projection and PO → shipment → trailer → yard → dock joins
- [x] Display all required shipment fields from backend data, including delay duration when available
- [x] Add searchable and filterable shipment table without redesigning unrelated modules
- [x] Add selected-shipment detail view with PO, trailer, location, ETA, risk, and operational timeline
- [x] Render an actual-data route/tracking visualization using coordinates when available or a data-derived simulated route otherwise
- [x] Add unit/API coverage for shipment projection and relationship joins
- [x] Validate tracking UI, type-check, tests, build, and runtime rendering

## E2 Tracking Evidence Follow-up

- [x] Drive the shipment route visualization positions from actual current latitude/longitude values when present
- [x] Capture and inspect a browser screenshot of the repaired Shipment Tracking screen with the table, filters, detail view, and route panel

## E2 Independent Shipment Tracking Repair

- [x] Inspect shipments.csv, trailers.csv, yard_locations.csv, and purchase_orders.csv and report unique origins, destinations, location columns, and coordinate availability
- [x] Add shipment-specific deterministic route generation from actual origin and destination values
- [x] Add stable shipment-specific tracking state with progress, current location, latitude, longitude, and ETA
- [x] Ensure the backend shipment list/detail projection exposes independent route and tracking fields per shipment
- [x] Preserve selected-shipment isolation so truck, route, location, ETA, and progress belong only to the selected shipment
- [x] Verify at least five shipments have differentiated origins, shipment-specific routes, current locations, coordinates, trailers, and progress; all share the single CSV destination Kolkata Warehouse by source-data design
- [x] Add tests proving deterministic refresh-stable state and no accidental shared location assignments
- [x] Run type-check, tests, build, live endpoint checks, and tracking UI verification
- [x] Explicitly verify five shipments differ on all feasible tracking fields and report the single shared destination required by shipments.csv
