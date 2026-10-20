import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../ui/Button';
import { repository } from '../../repository';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by Pennypath ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetToDemo = async () => {
    try {
      await repository.seedPersona('rohan');
      window.location.href = '/';
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-paper text-ink p-4 sm:p-8 flex items-center justify-center">
          <div className="w-full max-w-lg bg-paper border-2 border-accent rounded-card shadow-2xl p-6 sm:p-8 space-y-5 text-center">
            {/* Awning stripe top accent */}
            <div className="w-12 h-12 rounded-full bg-accent/15 text-accent mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div>
              <h1 className="font-fraunces text-2xl sm:text-3xl font-bold text-ink tracking-tight">
                Something went wrong
              </h1>
              <p className="text-sm text-ink/75 mt-2 leading-relaxed">
                Pennypath encountered an unexpected issue while rendering this view. Your saved finances and envelopes remain intact.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                variant="primary"
                onClick={this.handleReset}
                leftIcon={<RefreshCw className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Try Again
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={this.handleReload}
                className="w-full sm:w-auto"
              >
                Reload Pennypath
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={this.handleResetToDemo}
                leftIcon={<RotateCcw className="w-4 h-4" />}
                className="w-full sm:w-auto text-accent"
              >
                Reset Demo
              </Button>
            </div>

            {/* Technical diagnostic details toggle */}
            <div className="pt-4 border-t border-ink/15 text-left">
              <button
                type="button"
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                className="text-xs font-semibold text-ink/60 hover:text-ink inline-flex items-center gap-1"
                aria-expanded={this.state.showDetails}
              >
                <span>Technical details</span>
                {this.state.showDetails ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {this.state.showDetails && (
                <div className="mt-2 p-3 rounded-btn bg-ink/5 border border-ink/10 text-xs font-mono text-ink/80 overflow-x-auto max-h-48 whitespace-pre-wrap">
                  <p className="font-bold text-accent mb-1">{this.state.error?.toString()}</p>
                  <p>{this.state.errorInfo?.componentStack}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
