import type { Runtime } from "./runtime.js";

export async function runApiSkill(
  runtime: Runtime,
  skillId: string,
  input: unknown,
  sessionId: string,
) {
  const skill = runtime.skills.get(skillId);
  const runId = runtime.repos.createSkillRun(undefined, skillId, input);
  runtime.repos.createTimeline({
    sessionId,
    skillRunId: runId,
    type: "api.skill",
    title: `API skill started: ${skill.name}`,
    status: "running",
    payload: input,
  });
  try {
    const output = await skill.execute(
      input as never,
      runtime.workflowContext(sessionId),
    );
    runtime.repos.finishSkillRun(runId, "completed", output);
    runtime.repos.createTimeline({
      sessionId,
      skillRunId: runId,
      type: "api.skill",
      title: `API skill completed: ${skill.name}`,
      status: "completed",
      payload: output,
    });
    return { output };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    runtime.repos.finishSkillRun(runId, "failed", undefined, message);
    throw error;
  }
}

export function toChatMessage(entry: {
  type: string;
  id: string;
  timestamp: string;
  data: any;
}) {
  if (entry.type === "message") {
    return {
      id: entry.id,
      role: entry.data.role ?? "user",
      kind: "message",
      content: entry.data.content ?? "",
      timestamp: entry.timestamp,
      raw: entry,
    };
  }
  if (entry.type === "pi_message") {
    return {
      id: entry.id,
      role: entry.data.role ?? "assistant",
      kind: "message",
      content: extractContent(entry.data),
      timestamp: entry.timestamp,
      raw: entry,
    };
  }
  return {
    id: entry.id,
    role: "system",
    kind: entry.type,
    content: entry.type.replace(/_/g, " "),
    timestamp: entry.timestamp,
    raw: entry,
  };
}

function extractContent(message: any) {
  if (typeof message?.content === "string") return message.content;
  if (!Array.isArray(message?.content)) return "";
  return message.content
    .filter((block: any) => block.type === "text")
    .map((block: any) => block.text)
    .join("");
}
