import type { TradingWorkflow, WorkflowContext } from "./types.js";

export class WorkflowEngine {
  private readonly workflows = new Map<string, TradingWorkflow<any, any>>();

  register<TInput, TOutput>(workflow: TradingWorkflow<TInput, TOutput>) {
    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  get(id: string) {
    const workflow = this.workflows.get(id);
    if (!workflow) throw new Error(`Workflow not registered: ${id}`);
    return workflow;
  }

  list() {
    return [...this.workflows.values()].map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      riskLevel: workflow.riskLevel,
    }));
  }

  syncToDb(context: WorkflowContext) {
    for (const workflow of this.workflows.values()) {
      context.repos.upsertWorkflow({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        riskLevel: workflow.riskLevel,
      });
    }
  }

  async run<TInput>(id: string, input: TInput, context: WorkflowContext) {
    const workflow = this.get(id);
    const runId = context.repos.createWorkflowRun(workflow.id, input, context.sessionId);
    const runContext = { ...context, workflowRunId: runId };
    context.repos.createTimeline({
      sessionId: context.sessionId,
      workflowRunId: runId,
      type: "workflow",
      title: `Workflow started: ${workflow.name}`,
      status: "running",
      payload: input,
    });
    try {
      const output = await workflow.execute(input, runContext);
      context.repos.finishWorkflowRun(runId, "completed", output);
      context.repos.createTimeline({
        sessionId: context.sessionId,
        workflowRunId: runId,
        type: "workflow",
        title: `Workflow completed: ${workflow.name}`,
        status: "completed",
        payload: output,
      });
      return { runId, output };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      context.repos.finishWorkflowRun(runId, "failed", undefined, message);
      context.repos.createTimeline({
        sessionId: context.sessionId,
        workflowRunId: runId,
        type: "workflow",
        title: `Workflow failed: ${workflow.name}`,
        detail: message,
        status: "failed",
      });
      throw error;
    }
  }
}

