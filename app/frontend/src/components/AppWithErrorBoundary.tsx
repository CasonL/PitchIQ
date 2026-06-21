import React, { Component, ReactNode } from 'react';
import { LoadingFallback } from './LoadingFallback';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const RELOAD_KEY = 'pitchiq_chunk_reload';

function isChunkLoadError(error: Error): boolean {
  const msg = error?.message || '';
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('ChunkLoadError') ||
    error?.name === 'ChunkLoadError'
  );
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (isChunkLoadError(error)) {
      // Stale deployment: new chunks were deployed, browser has old index.html
      // Auto-reload once to pick up fresh assets
      const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY);
      if (!alreadyReloaded) {
        console.warn('[PitchIQ] Stale deployment detected - reloading for fresh assets...');
        sessionStorage.setItem(RELOAD_KEY, '1');
        window.location.reload();
        return;
      }
      console.error('[PitchIQ] Chunk load failed even after reload:', error);
    } else {
      console.error('App error boundary caught:', error, errorInfo);
    }
  }

  handleRetry = () => {
    sessionStorage.removeItem(RELOAD_KEY);
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (isChunkLoadError(this.state.error!)) {
        // Show brief loading state while reload triggers
        return (
          <div className="min-h-screen flex items-center justify-center bg-cream">
            <div className="text-center">
              <div className="w-8 h-8 rounded-full border-2 border-brand-orange border-t-transparent animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Updating to latest version...</p>
            </div>
          </div>
        );
      }
      return <LoadingFallback error={this.state.error} retry={this.handleRetry} />;
    }

    return this.props.children;
  }
}
