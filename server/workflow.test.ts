import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { store } from "./services/dataStore";

import {
  assignDock,
  captureGoodsReceipt,
  createShipmentForPo,
  extractProcurementRequest,
  recommendDock,
  recommendSuppliers,
  reviewException,
  runMatching,
  scheduleDock,
  updateShipmentStatus,
} from "./services/workflow";

import type { TrpcContext } from "./_core/context";

function context(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      name: "Test User",
      email: null,
      loginMethod: null,
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("E2 + PR2 workflow services", () => {
  it("extracts a procurement request into structured fields", () => {
    const result = extractProcurementRequest(
      "I need 500 temperature sensors for the Kolkata warehouse."
    );

    expect(result.quantity).toBe(500);
    expect(result.product).toBe("Temperature Sensor");
    expect(result.productId).toBeTruthy();
    expect(result.destination).toContain("Kolkata");
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it("extracts GPS tracking devices and quantity using normalized product matching", () => {
    const result = extractProcurementRequest(
      "I need 50 GPS tracking devices for our delivery trucks."
    );

    expect(result.quantity).toBe(50);
    expect(result.product).toBe("GPS Tracking Device");
    expect(result.productId).toBeTruthy();
  });

  it("returns explainable supplier rankings", () => {
    const results = recommendSuppliers(
      "PROD001",
      500,
      "2026-08-28"
    );

    expect(results.length).toBeGreaterThan(0);

    expect(results[0]?.score).toBeGreaterThanOrEqual(
      results[1]?.score ?? 0
    );

    expect(results[0]?.reasons.length).toBeGreaterThan(2);
  });

  it("recommends suppliers from the extracted GPS product category", () => {
    const extracted = extractProcurementRequest(
      "I need 50 GPS tracking devices for our delivery trucks."
    );

    const results = recommendSuppliers(
      extracted.productId!,
      extracted.quantity,
      extracted.requiredDate
    );

    expect(results.length).toBeGreaterThan(0);

    expect(
      results.every(
        (item) => item.supplier.category === "Telematics"
      )
    ).toBe(true);
  });

  it("creates a purchase order with the dynamically extracted product and selected supplier", async () => {
    const caller = appRouter.createCaller(context());

    const extracted = extractProcurementRequest(
      "I need 50 GPS tracking devices for our delivery trucks."
    );

    const recommendations = recommendSuppliers(
      extracted.productId!,
      extracted.quantity,
      extracted.requiredDate
    );

    const selected = recommendations[0]?.supplier;

    expect(selected).toBeTruthy();

    const result = await caller.purchaseOrders.create({
      requisitionId: "REQ0001",
      supplierId: selected!.supplier_id,
      productId: extracted.productId!,
      quantity: extracted.quantity,
      unitPrice: Number(extracted.unitPrice ?? 0),
      priority: extracted.priority,
      destination: extracted.destination,
    });

    expect(result.po.product_id).toBe(extracted.productId);
    expect(result.po.supplier_id).toBe(selected!.supplier_id);
  });

  it("recommends an available dock with factors", () => {
    const result = recommendDock("TR0001");

    expect(result.recommendations.length).toBeGreaterThan(0);

    expect(
      result.recommendations[0]?.dock.status
    ).toBe("Available");

    expect(
      result.recommendations[0]?.reasons.join(" ")
    ).toContain("available");
  });

  it("reconciles a supplied matched invoice", () => {
    const invoice = store.list("invoices")[0];

    expect(invoice).toBeTruthy();

    const result = runMatching(invoice.invoice_id);

    expect(result.match.po_id).toBe(invoice.po_id);

    expect(["Matched", "Exception"]).toContain(
      result.match.overall_status
    );

    expect(result.match.quantity_match).toMatch(/Yes|No/);
  });

  it("creates a shipment, updates status, and captures a goods receipt", () => {
    const po = store.list("purchase_orders")[0];

    expect(po).toBeTruthy();

    const shipment = createShipmentForPo(po.po_id);

    expect(shipment.poId).toBe(po.po_id);

    expect(
      updateShipmentStatus(
        shipment.shipmentId,
        "At Yard"
      )?.status
    ).toBe("At Yard");

    const receipt = captureGoodsReceipt({
      poId: po.po_id,
      shipmentId: shipment.shipmentId,
      expectedQuantity: 500,
      receivedQuantity: 500,
      damagedQuantity: 0,
      receiver: "Test Receiver",
    });

    expect(receipt.status).toBe("Accepted");
  });

  it("rejects overlapping dock schedules and supports review decisions", () => {
    const trailer = store.list("trailers")[0];

    expect(trailer).toBeTruthy();

    const dock = store
      .list("dock_doors")
      .find((row) => row.status === "Available");

    expect(dock).toBeTruthy();

    const start = "2026-08-20T10:00:00.000Z";
    const end = "2026-08-20T10:45:00.000Z";

    const scheduled = scheduleDock(
      trailer.trailer_id,
      dock!.dock_id,
      start,
      end
    );

    expect(scheduled.status).toBe("Reserved");

    expect(() =>
      scheduleDock(
        trailer.trailer_id,
        dock!.dock_id,
        "2026-08-20T10:15:00.000Z",
        "2026-08-20T11:00:00.000Z"
      )
    ).toThrow(/schedule conflict/);

    const alert = store.list("alerts")[0];

    expect(alert).toBeTruthy();

    const reviewed = reviewException(
      alert.alert_id,
      "Approved"
    );

    expect(reviewed?.status).toBe("Approved");
  });

  it("assigns the recommended dock and persists the AI decision", () => {
    const trailer = store
      .list("trailers")
      .find((row) => row.status !== "Assigned");

    expect(trailer).toBeTruthy();

    const recommendation =
      recommendDock(trailer!.trailer_id).recommendations[0];

    if (recommendation) {
      const result = assignDock(
        trailer!.trailer_id,
        recommendation.dock.dock_id
      );

      expect(result.assignment.status).toBe("Assigned");

      expect(
        store
          .list("ai_decisions")
          .some(
            (row) =>
              row.reference_id === trailer!.trailer_id
          )
      ).toBe(true);
    }
  });
});