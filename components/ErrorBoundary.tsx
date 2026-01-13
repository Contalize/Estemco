import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full border border-red-100">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="bg-red-100 p-3 rounded-full">
                                <AlertTriangle className="text-red-600" size={32} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">Ops! Algo deu errado.</h1>
                                <p className="text-slate-500 text-sm">O sistema encontrou um erro inesperado.</p>
                            </div>
                        </div>

                        <div className="bg-slate-100 p-4 rounded-lg overflow-auto max-h-64 font-mono text-xs text-red-600 mb-6">
                            {this.state.error?.toString()}
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="bg-slate-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors w-full"
                        >
                            Recarregar Página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
