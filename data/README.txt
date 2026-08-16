Cognizant NPN SCM Hackathon — E2 + PR2 Dummy Data
========================================================

These CSVs are synthetic demo data designed for the proposed E2 + PR2 prototype.

Main flow:
Requisition -> Purchase Order -> Shipment -> Trailer -> Yard -> Dock Assignment
-> Goods Receipt -> Invoice -> 3-Way Match -> Payment/Alert

Key anomaly cases:
- Truck delays: shipments around records 17, 42, 68, 91
- Quantity mismatches: goods receipts around records 23, 57, 83
- Invoice price mismatches: invoices around records 12, 31, 64, 78, 96
- Extra dock-unavailable alerts are included for dashboard demonstrations.

Important IDs:
- requisition_id links to purchase_orders.requisition_id
- po_id links purchase_orders, shipments, goods_receipts and invoices
- shipment_id links shipments and goods_receipts
- trailer_id links shipments, trailers and dock_assignments
- invoice_id links invoices and three_way_matching
- gr_id links goods_receipts and three_way_matching

The data is synthetic and should be treated as prototype/demo data, not real enterprise data.
