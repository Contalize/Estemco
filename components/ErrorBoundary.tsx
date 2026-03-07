import React, { ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import { Button, Card } from './ui';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado na aplicação.";
      let isPermissionError = false;

      try {
        if (this.state.error?.message) {
          const parsedError = JSON.parse(this.state.error.message);
          if (parsedError.error && (parsedError.error.includes('permission-denied') || parsedError.error.includes('insufficient permissions'))) {
            errorMessage = "Você não tem permissão para realizar esta operação ou acessar estes dados.";
            isPermissionError = true;
          }
        }
      } catch (e) {
        // Not a JSON error, use default message
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="max-w-md w-full p-8 text-center space-y-6 border-red-100 bg-red-50/30">
            <div className="flex justify-center">
              <div className="p-4 bg-red-100 rounded-full text-red-600">
                <ShieldAlert size={48} />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Ops! Algo deu errado</h2>
              <p className="text-slate-600 text-sm">
                {errorMessage}
              </p>
              {isPermissionError && (
                <p className="text-xs text-slate-500 mt-2">
                  Se você acredita que isso é um erro, entre em contato com o administrador do sistema.
                </p>
              )}
            </div>
            <Button 
              onClick={this.handleReset}
              className="w-full gap-2 bg-slate-900 hover:bg-slate-800"
            >
              <RefreshCw size={16} />
              Recarregar Aplicativo
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
