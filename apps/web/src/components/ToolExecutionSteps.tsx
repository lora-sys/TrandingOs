import { CheckCircle2, Loader2, Circle } from "lucide-react";

export interface ToolStep {
  name: string;
  duration: string;
  status: "completed" | "running" | "pending";
}

interface ToolExecutionStepsProps {
  steps: ToolStep[];
  workflowName?: string;
}

export function ToolExecutionSteps({ steps, workflowName }: ToolExecutionStepsProps) {
  return (
    <div className="toolExecutionSteps">
      {steps.map((step, i) => (
        <div className="toolStep" key={i}>
          <div className={`step-icon ${step.status}`}>
            {step.status === "completed" && <CheckCircle2 size={12} />}
            {step.status === "running" && <Loader2 size={12} className="spin" />}
            {step.status === "pending" && <Circle size={12} />}
          </div>
          <span className="step-name">{step.name}</span>
          <span className="step-duration">{step.duration}</span>
        </div>
      ))}
    </div>
  );
}
