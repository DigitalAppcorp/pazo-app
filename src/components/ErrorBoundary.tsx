import { Component, type ErrorInfo, type ReactNode } from 'react'
import { captureException } from '../services/observability'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled React error:', error, info)
    captureException(error, {
      handled: true,
      mechanism: 'react.error_boundary',
      componentStack: info.componentStack,
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-6">
          <section className="w-full max-w-sm rounded-[2rem] bg-white border border-[#204E4A]/10 shadow-sm p-6 text-center">
            <h1 className="text-xl font-black text-[#204E4A]">
              Pazo tuvo un problema
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#5C7470]">
              Tus datos siguen guardados. Recarga la app para intentarlo de nuevo.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-5 w-full rounded-full bg-[#204E4A] px-4 py-3 text-sm font-black text-white cursor-pointer"
            >
              Recargar Pazo
            </button>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
