import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-6 p-8">
          <div className="flex flex-col items-center gap-4 max-w-md text-center">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred. You can try refreshing the page or
              click below to attempt recovery.
            </p>
            {this.state.error && (
              <pre className="text-xs text-left bg-muted rounded p-3 w-full overflow-auto max-h-40 font-mono">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload page
              </Button>
              <Button onClick={this.handleReset}>Try to recover</Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
