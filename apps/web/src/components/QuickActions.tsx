import type { ReactNode } from "react";

export interface QuickAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="quickActions">
      {actions.map((action, i) => (
        <button className="quickActionBtn" key={i} onClick={action.onClick}>
          {action.icon}
          {action.label}
        </button>
      ))}
    </div>
  );
}
