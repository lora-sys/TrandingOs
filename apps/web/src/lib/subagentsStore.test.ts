import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useSubagentsStore, type SubAgentStatusView } from "./subagentsStore";

const baseView: SubAgentStatusView = {
  id: "agent-1",
  agentType: "research",
  description: "Research AAPL",
  status: "running",
  isBackground: false,
};

beforeEach(() => {
  // Reset store between tests
  useSubagentsStore.setState({ byId: {}, activeIds: [] });
});

afterEach(() => {
  useSubagentsStore.setState({ byId: {}, activeIds: [] });
});

describe("useSubagentsStore", () => {
  it("upsert stores a new subagent and marks it active", () => {
    useSubagentsStore.getState().upsert(baseView);
    const state = useSubagentsStore.getState();
    expect(state.byId["agent-1"]).toEqual(baseView);
    expect(state.activeIds).toContain("agent-1");
  });

  it("upsert dedupes activeIds (no duplicate entries on re-insert)", () => {
    const store = useSubagentsStore.getState();
    store.upsert(baseView);
    store.upsert({ ...baseView, description: "updated" });
    store.upsert({ ...baseView, description: "updated again" });
    const state = useSubagentsStore.getState();
    expect(state.activeIds.filter((id) => id === "agent-1")).toHaveLength(1);
    expect(state.byId["agent-1"].description).toBe("updated again");
  });

  it("completion removes the subagent from activeIds but keeps it in byId", () => {
    const store = useSubagentsStore.getState();
    store.upsert(baseView);
    expect(useSubagentsStore.getState().activeIds).toContain("agent-1");

    store.upsert({ ...baseView, status: "completed", completedAt: Date.now() });
    const state = useSubagentsStore.getState();
    expect(state.byId["agent-1"]).toBeDefined();
    expect(state.activeIds).not.toContain("agent-1");
  });

  it("setAll replaces byId and recomputes activeIds from non-terminal statuses", () => {
    const store = useSubagentsStore.getState();
    const list: SubAgentStatusView[] = [
      { ...baseView, id: "a", status: "running" },
      { ...baseView, id: "b", status: "completed" },
      { ...baseView, id: "c", status: "queued" },
      { ...baseView, id: "d", status: "failed" },
    ];
    store.setAll(list);
    const state = useSubagentsStore.getState();
    expect(Object.keys(state.byId).sort()).toEqual(["a", "b", "c", "d"]);
    expect(state.activeIds.sort()).toEqual(["a", "c"]);
  });
});