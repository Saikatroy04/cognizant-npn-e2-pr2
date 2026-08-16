import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { dashboardSummary, joinPo, shipmentTrackingDetail, shipmentTrackingView, store } from "./services/dataStore";
import { assignDock, captureGoodsReceipt, createShipmentForPo, extractProcurementRequest, processInvoice, processInvoiceFile, recommendDock, recommendSuppliers, reviewException, runMatching, scheduleDock, updateShipmentStatus } from "./services/workflow";
import { backendAudit, workflowVerification } from "./services/audit";

const listInput = z.object({ search: z.string().optional(), status: z.string().optional(), priority: z.string().optional() }).optional();
function filterRows(rows: Array<Record<string, unknown>>, input?: z.infer<typeof listInput>) {
  if (!input) return rows;
  return rows.filter(row => (!input.search || Object.values(row).some(value => String(value ?? "").toLowerCase().includes(input.search!.toLowerCase()))) && (!input.status || row.status === input.status) && (!input.priority || row.priority === input.priority));
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  dashboard: router({ summary: publicProcedure.query(() => dashboardSummary()) }),
  suppliers: publicProcedure.input(listInput).query(({ input }) => filterRows(store.list("suppliers"), input)),
  products: publicProcedure.input(listInput).query(({ input }) => filterRows(store.list("products"), input)),
  requisitions: router({ list: publicProcedure.input(listInput).query(({ input }) => filterRows(store.list("requisitions"), input)), create: publicProcedure.input(z.object({ requester: z.string(), department: z.string(), productId: z.string(), quantity: z.number().positive(), requiredDate: z.string(), destination: z.string(), priority: z.string() })).mutation(({ input }) => store.add("requisitions", { requisition_id: `REQ${String(store.count("requisitions") + 1).padStart(4, "0")}`, requester: input.requester, department: input.department, product_id: input.productId, quantity: String(input.quantity), required_date: input.requiredDate, destination: input.destination, priority: input.priority, status: "Draft" })) }),
  purchaseOrders: router({ list: publicProcedure.input(listInput).query(({ input }) => filterRows(store.list("purchase_orders"), input)), detail: publicProcedure.input(z.object({ poId: z.string() })).query(({ input }) => joinPo(input.poId)), create: publicProcedure.input(z.object({ requisitionId: z.string(), supplierId: z.string(), productId: z.string(), quantity: z.number().positive(), unitPrice: z.number().nonnegative(), priority: z.string(), destination: z.string().optional() })).mutation(({ input }) => { const destination = input.destination && input.destination.trim() ? input.destination.trim() : "Kolkata Warehouse"; const po = store.add("purchase_orders", { po_id: `PO${String(store.count("purchase_orders") + 1).padStart(4, "0")}`, requisition_id: input.requisitionId, supplier_id: input.supplierId, product_id: input.productId, quantity: String(input.quantity), unit_price: String(input.unitPrice), total_amount: String(input.quantity * input.unitPrice), order_date: new Date().toISOString().slice(0, 10), expected_delivery: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10), priority: input.priority, destination, status: "Draft" }); const shipment = createShipmentForPo(po.po_id); return { po, shipment }; }), createShipment: publicProcedure.input(z.object({ poId: z.string() })).mutation(({ input }) => createShipmentForPo(input.poId)) }),
  procurement: router({ extract: publicProcedure.input(z.object({ text: z.string().min(5) })).mutation(({ input }) => extractProcurementRequest(input.text)), recommendSuppliers: publicProcedure.input(z.object({ productId: z.string(), quantity: z.number(), requiredDate: z.string() })).query(({ input }) => recommendSuppliers(input.productId, input.quantity, input.requiredDate)) }),
  shipments: router({ list: publicProcedure.input(listInput).query(({ input }) => filterRows(shipmentTrackingView(), input)), updateStatus: publicProcedure.input(z.object({ shipmentId: z.string(), status: z.string() })).mutation(({ input }) => updateShipmentStatus(input.shipmentId, input.status)), detail: publicProcedure.input(z.object({ shipmentId: z.string() })).query(({ input }) => shipmentTrackingDetail(input.shipmentId)) }),
  trailers: publicProcedure.query(() => store.list("trailers")),
  yard: publicProcedure.query(() => store.list("yard_locations")),
  docks: publicProcedure.query(() => store.list("dock_doors")),
  dockAssignments: publicProcedure.query(() => store.list("dock_assignments")),
  dock: router({ recommend: publicProcedure.input(z.object({ trailerId: z.string() })).mutation(({ input }) => recommendDock(input.trailerId)), assign: publicProcedure.input(z.object({ trailerId: z.string(), dockId: z.string() })).mutation(({ input }) => assignDock(input.trailerId, input.dockId)), schedule: publicProcedure.input(z.object({ trailerId: z.string(), dockId: z.string(), scheduledStart: z.string(), scheduledEnd: z.string() })).mutation(({ input }) => scheduleDock(input.trailerId, input.dockId, input.scheduledStart, input.scheduledEnd)) }),
  goodsReceipts: router({ list: publicProcedure.input(listInput).query(({ input }) => filterRows(store.list("goods_receipts"), input)), capture: publicProcedure.input(z.object({ poId: z.string(), shipmentId: z.string(), expectedQuantity: z.number(), receivedQuantity: z.number(), damagedQuantity: z.number(), receiver: z.string() })).mutation(({ input }) => captureGoodsReceipt(input)) }),
  invoices: router({ list: publicProcedure.input(listInput).query(({ input }) => filterRows(store.list("invoices"), input)), process: publicProcedure.input(z.object({ invoiceId: z.string().optional(), fileName: z.string().optional() })).mutation(({ input }) => processInvoice(input.invoiceId, input.fileName)), processFile: publicProcedure.input(z.object({ fileName: z.string(), mimeType: z.string(), base64: z.string().min(10) })).mutation(({ input }) => processInvoiceFile(input)) }),
  matching: router({ list: publicProcedure.input(listInput).query(({ input }) => filterRows(store.list("three_way_matching"), input)), run: publicProcedure.input(z.object({ invoiceId: z.string(), tolerancePct: z.number().min(0).max(100).optional() })).mutation(({ input }) => runMatching(input.invoiceId, input.tolerancePct ?? 2)) }),
  alerts: router({ list: publicProcedure.input(listInput).query(({ input }) => filterRows(store.list("alerts"), input)), resolve: publicProcedure.input(z.object({ alertId: z.string(), status: z.enum(["Acknowledged", "Resolved"]) })).mutation(({ input }) => store.update("alerts", "alert_id", input.alertId, { status: input.status })), review: publicProcedure.input(z.object({ alertId: z.string(), decision: z.enum(["Approved", "Rejected"]) })).mutation(({ input }) => reviewException(input.alertId, input.decision)) }),
  aiDecisions: publicProcedure.query(() => store.list("ai_decisions")),
  audit: router({ backend: publicProcedure.query(() => backendAudit()), workflow: publicProcedure.query(() => workflowVerification()) }),
});
export type AppRouter = typeof appRouter;
