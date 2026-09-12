import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ServerErrorPage } from '../pages/ServerErrorPage';

interface Props {
  children: ReactNode;
  /** Optional custom fallback; defaults to ServerErrorPage. */
  fallback?: ReactNode | ((error: Error | undefined, reset: () => void) => ReactNode);
  /** When these change, the boundary resets automatically. */
  resetKeys?: unknown[];
}

interface State {
  hasError: boolean;
  error?: Error;
}

function resetKeysChanged(prev: unknown[] | undefined, next: unknown[] | undefined): boolean {
  if (!prev && !next) return false;
  if (!prev || !next) return true;
  if (prev.length !== next.length) return true;
  return prev.some((value, index) => !Object.is(value, next[index]));
}

/**
 * Catches render errors and shows a full-page 500 UI with retry.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && resetKeysChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.reset();
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;
      if (typeof fallback === 'function') {
        return fallback(this.state.error, this.reset);
      }
      if (fallback) {
        return fallback;
      }
      return <ServerErrorPage error={this.state.error} onRetry={this.reset} />;
    }

    return this.props.children;
  }
}
