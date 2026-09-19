import React from 'react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="p-4 m-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex flex-col gap-2">
          <div className="font-semibold text-sm text-rose-200">组件渲染异常 (Rendering Error)</div>
          <div className="font-mono text-[11px] bg-slate-950/60 p-2 rounded overflow-auto max-h-32 text-rose-300">
            {this.state.error?.message || 'Unknown Error'}
          </div>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="self-start px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs transition-colors"
          >
            重试 (Retry)
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
