import { describe, expect, it } from "vitest";
import { backendAudit, workflowVerification } from "./services/audit";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return { user: undefined, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("backend audit", () => {
  it("reports supplied CSV provenance and runtime persistence mode", () => {
    const audit = backendAudit();
    expect(audit.verdict.backend).toContain("real");
    expect(audit.verdict.data).toContain("supplied CSV");
    expect(audit.persistence.mode).toBe("in-memory process state");
    expect(audit.sourceFiles.some(file => file.dataset === "purchase_orders" && file.rowsLoaded > 0)).toBe(true);
    expect(audit.routeCatalog).toContain("audit.backend/workflow");
  });

  it("exposes the same audit evidence through appRouter.audit", async () => {
    const caller = appRouter.createCaller(createContext());
    const audit = await caller.audit.backend();
    const workflow = await caller.audit.workflow();
    expect(audit.persistence.mode).toBe("in-memory process state");
    expect(workflow.nonDestructive).toBe(true);
    expect(workflow.selectedSourceRecords.poId).toMatch(/^PO/);
  });

  it("traces a supplied PO through the E2 + PR2 relationship graph without mutation", () => {
    const verification = workflowVerification();
    expect(verification.nonDestructive).toBe(true);
    expect(verification.steps.map(step => step.step)).toContain("Purchase Order");
    expect(verification.steps.map(step => step.step)).toContain("3-Way Matching");
    expect(verification.selectedSourceRecords.poId).toMatch(/^PO/);
  });
});
