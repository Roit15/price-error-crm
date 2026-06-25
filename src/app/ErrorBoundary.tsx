import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'

type ErrorBoundaryState = {
  error?: Error
  details?: string
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = {}

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crashed', error, info)
    this.setState({ details: info.componentStack ?? '' })
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="min-h-screen bg-[#f7f7f2] px-4 py-10 text-slate-900">
        <div className="mx-auto max-w-md rounded-lg border border-stone-200 bg-white p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Price Error CRM</p>
          <h1 className="mt-3 text-2xl font-semibold">App could not load</h1>
          <p className="mt-3 text-sm text-slate-600">
            Refresh the page once. If it still happens, open the live Vercel URL in Safari/Chrome and share this error:
          </p>
          <pre className="mt-4 overflow-auto rounded-md bg-stone-100 p-3 text-xs text-slate-700">
            {this.state.error.message}
            {this.state.details ? `\n${this.state.details}` : ''}
          </pre>
        </div>
      </main>
    )
  }
}
