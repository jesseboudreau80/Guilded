"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Shield, RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  children:    ReactNode;
  /** Custom fallback UI. If omitted, the default recovery screen renders. */
  fallback?:   ReactNode;
  /** Context label shown in the error message (e.g. "Academy", "Audit") */
  context?:    string;
  /** Called when the boundary catches an error (use for Sentry, etc.) */
  onError?:    (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error:    Error | null;
}

/**
 * React Error Boundary — catches client-side JavaScript errors in the subtree
 * and renders a recovery UI instead of crashing the page.
 *
 * Usage:
 *   <ErrorBoundary context="Academy">
 *     <AcademyPage />
 *   </ErrorBoundary>
 *
 * To connect Sentry:
 *   <ErrorBoundary onError={(err, info) => Sentry.captureException(err, { contexts: { react: info } })}>
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
    if (process.env.NODE_ENV === "development") {
      console.error("[ErrorBoundary]", error.message, "\n", info.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback)  return this.props.fallback;

    const { context } = this.props;
    const isNetworkError = this.state.error?.message.toLowerCase().includes("network") ||
                           this.state.error?.message.toLowerCase().includes("fetch");

    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center p-8 text-center">
        <div className="h-12 w-12 rounded-2xl border border-slate-700 bg-slate-800 flex items-center justify-center mb-4">
          <AlertTriangle size={20} className="text-slate-400" />
        </div>

        <h2 className="text-base font-semibold text-slate-200">
          {context ? `${context} encountered an issue` : "Something went wrong"}
        </h2>

        <p className="mt-2 text-sm text-slate-500 max-w-sm leading-relaxed">
          {isNetworkError
            ? "Unable to reach the server. Check your connection and try again."
            : "An unexpected error occurred. Your data is safe — this is a display issue only."}
        </p>

        {process.env.NODE_ENV === "development" && this.state.error && (
          <p className="mt-3 rounded-lg bg-slate-900 px-3 py-2 font-mono text-xs text-red-400 max-w-sm text-left">
            {this.state.error.message}
          </p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw size={13} /> Try Again
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            <Shield size={12} /> Return to Dashboard
          </a>
        </div>
      </div>
    );
  }
}

/**
 * Lightweight function component wrapper for common usage.
 * Does not support the `onError` or `fallback` prop.
 */
export function WithErrorBoundary({ children, context }: { children: ReactNode; context?: string }) {
  return <ErrorBoundary context={context}>{children}</ErrorBoundary>;
}
