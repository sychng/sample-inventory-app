import React from "react";

type Props = { children: React.ReactNode };
type State = { error?: Error };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Also log to terminal console for debugging
    console.error("UI crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-dvh bg-zinc-50 p-6">
          <div className="mx-auto max-w-md rounded-3xl border bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-red-700">App crashed</div>
            <pre className="mt-3 whitespace-pre-wrap break-words text-xs text-zinc-700">
              {this.state.error.message}
            </pre>
            <div className="mt-3 text-xs text-zinc-500">
              Open the terminal / browser console for full stack trace.
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
