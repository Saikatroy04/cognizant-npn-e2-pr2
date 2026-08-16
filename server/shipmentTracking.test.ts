import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { shipmentTrackingDetail, shipmentTrackingView } from "./services/dataStore";
import { buildTrackingSnapshot } from "../client/src/lib/trackingSimulation";
import type { TrpcContext } from "./_core/context";

function context(): TrpcContext { return { user: undefined, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] }; }

describe("E2 shipment tracking", () => {
  it("projects required tracking fields from supplied CSV records", () => {
    const row = shipmentTrackingView("SHP00001")[0];
    const nowStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
    expect(row?.shipment_id).toBe("SHP00001");
    expect(row?.po_id).toBe("PO00001");
    expect(row?.trailer_id).toBe("TR0001");
    expect(row?.origin).toBe("Core Materials Warehouse");
    expect(row?.destination).toBe("Kolkata Warehouse");
    expect(row?.current_location).toContain("22.80702");
    expect(new Date(row?.scheduled_arrival ?? "").getTime()).toBeGreaterThanOrEqual(nowStart);
    expect(row?.priority).toBe("High");
    expect(row?.yard_location_id).toBeTruthy();
    expect(row?.dock_id).toBe("D10");
  });

  it("exposes the relationship graph through shipments.detail", async () => {
    const caller = appRouter.createCaller(context());
    const detail = await caller.shipments.detail({ shipmentId: "SHP00001" });
    expect(detail?.po?.po_id).toBe("PO00001");
    expect(detail?.trailer?.trailer_id).toBe("TR0001");
    expect(detail?.yard?.yard_location_id).toBeTruthy();
    expect(detail?.assignment?.dock_id).toBe("D10");
    expect(detail?.timeline.map(event => event.label)).toContain("Goods Receipt");
  });

  it("keeps the verification read-only and handles an unknown shipment", () => {
    expect(shipmentTrackingDetail("SHP-UNKNOWN")).toBeUndefined();
  });

  it("keeps five real shipments independent and refresh-stable", () => {
    const ids = ["SHP00001", "SHP00002", "SHP00003", "SHP00004", "SHP00005"];
    const firstRead = ids.map(id => shipmentTrackingView(id)[0]);
    const secondRead = ids.map(id => shipmentTrackingView(id)[0]);
    expect(firstRead.every(Boolean)).toBe(true);
    expect(new Set(firstRead.map(row => row?.shipment_id)).size).toBe(5);
    expect(new Set(firstRead.map(row => row?.trailer_id)).size).toBe(5);
    expect(new Set(firstRead.map(row => row?.current_location)).size).toBe(5);
    expect(new Set(firstRead.map(row => row?.route_label)).size).toBe(5);
    expect(firstRead.map(row => row?.origin)).toEqual(secondRead.map(row => row?.origin));
    expect(firstRead.map(row => row?.route_label)).toEqual(secondRead.map(row => row?.route_label));
    expect(firstRead.map(row => row?.progress)).toEqual(secondRead.map(row => row?.progress));
    expect(firstRead.every(row => Number(row?.latitude) !== 0 && Number(row?.longitude) !== 0)).toBe(true);
  });

  it("normalizes active shipment dates around the current demo date while leaving delivered dates in the past", () => {
    const active = shipmentTrackingView().find(row => row.shipment_id === "SHP00001");
    const delivered = shipmentTrackingView("SHP00003")[0];

    expect(active).toBeTruthy();
    expect(delivered).toBeTruthy();

    const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
    expect(new Date(active!.eta).getTime()).toBeGreaterThanOrEqual(todayStart);
    expect(new Date(active!.scheduled_arrival).getTime()).toBeGreaterThanOrEqual(todayStart);
    expect(new Date(delivered!.eta).getTime()).toBeLessThan(todayStart);
  });

  it("builds distinct deterministic coordinates for different shipments and progress values", () => {
    const ids = ["SHP00001", "SHP00002", "SHP00003", "SHP00004", "SHP00005"];
    const entries = ids.map(id => {
      const shipment = shipmentTrackingView(id)[0];
      const snapshot = buildTrackingSnapshot(shipment, Number(shipment?.progress ?? 0) / 100);
      const secondProgressValue = Math.min(1, Number(shipment?.progress ?? 0) / 100 + 0.15);
      const secondProgress = buildTrackingSnapshot(shipment, secondProgressValue);

      console.log({
        shipmentId: shipment?.shipment_id,
        origin: shipment?.origin,
        destination: shipment?.destination,
        currentLatitude: snapshot.current[0],
        currentLongitude: snapshot.current[1],
        progress: snapshot.progress,
      });

      expect(snapshot.current).not.toEqual(secondProgress.current);
      expect(snapshot.progress).not.toBe(secondProgress.progress);
      return {
        shipmentId: shipment?.shipment_id,
        origin: shipment?.origin,
        destination: shipment?.destination,
        currentLatitude: snapshot.current[0],
        currentLongitude: snapshot.current[1],
        progress: snapshot.progress,
      };
    });

    const uniqueCoordinates = new Set(entries.map(item => `${item.currentLatitude.toFixed(5)},${item.currentLongitude.toFixed(5)}`));
    expect(uniqueCoordinates.size).toBeGreaterThan(1);
    expect(uniqueCoordinates.size).toBe(entries.length);
    expect(entries.every(item => item.shipmentId && item.origin && item.destination)).toBe(true);
  });

  it("creates a runtime shipment automatically when a PO is generated", async () => {
    const caller = appRouter.createCaller(context());
    const po = await caller.purchaseOrders.create({
      requisitionId: "REQ0001",
      supplierId: "SUP006",
      productId: "PROD001",
      quantity: 500,
      unitPrice: 18000,
      priority: "High",
      destination: "Kolkata Warehouse",
    });

    const shipment = shipmentTrackingView().find(row => row.po_id === po.po_id);
    expect(po.po_id).toMatch(/^PO\d{4}$/);
    expect(shipment).toBeTruthy();
    expect(shipment?.shipment_id).toMatch(/^SHP\d{5}$/);
    expect(shipment?.trailer_id).toMatch(/^TR\d{4}$/);
    expect(shipment?.origin).toContain("Prime Materials");
    expect(shipment?.destination).toBe("Kolkata Warehouse");
    expect(Number(shipment?.current_lat ?? 0)).toBeGreaterThan(0);
    expect(Number(shipment?.current_lon ?? 0)).toBeGreaterThan(0);
    expect(Number(shipment?.progress ?? 0)).toBeGreaterThan(0);
    expect(shipmentTrackingView(shipment?.shipment_id ?? "")).toHaveLength(1);
  });
});
