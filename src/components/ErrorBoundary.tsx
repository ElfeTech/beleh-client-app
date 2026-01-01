import { Component, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div style={{
                    padding: '1rem',
                    margin: '1rem 0',
                    backgroundColor: '#fee2e2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    color: '#dc2626'
                }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Something went wrong</h3>
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>
                        {this.state.error?.message || 'An unexpected error occurred while rendering this component.'}
                    </p>
                </div>
            );
        }

        return this.props.children;
    }
}
