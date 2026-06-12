import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; name?: string; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: 16, color: "#ef4444", fontFamily: "monospace" }}>
          <div style={{ fontWeight: 600 }}>Component Error{this.props.name ? `: ${this.props.name}` : ""}</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>{this.state.error?.message}</div>
        </div>
      );
    }
    return this.props.children;
  }
}
