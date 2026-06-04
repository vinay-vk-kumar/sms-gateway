import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#07070f] p-4 text-slate-200">
          <div className="max-w-md w-full bg-[#0a0a14] rounded-2xl p-8 border border-red-500/20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center text-2xl mx-auto mb-6">
              ⚠️
            </div>
            <h2 className="text-xl font-bold mb-3 text-white">Something went wrong</h2>
            <p className="text-sm text-slate-400 mb-8">
              An unexpected error crashed this page. We've logged the issue.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors font-semibold text-white"
            >
              Reload Page
            </button>
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <div className="mt-6 p-4 rounded-lg bg-black/50 border border-slate-800 text-left overflow-auto text-xs font-mono text-red-400">
                {this.state.error.toString()}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
