"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  title?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[EquityOS ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <Card padding="lg" className="border-loss/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-loss" />
            <div>
              <h2 className="text-sm font-semibold text-text-primary">
                {this.props.title ?? "Something went wrong"}
              </h2>
              <p className="mt-1 text-xs text-text-muted">
                This section failed to load. Refresh the page or try again later.
              </p>
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}
