import { Component, type ReactNode, type ErrorInfo } from "react"

interface State {
  error: Error | null
}

interface Props {
  children: ReactNode
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (typeof window !== "undefined" && "console" in window) {
      window.console.error("[ErrorBoundary]", error, info)
    }
  }

  reset = (): void => this.setState({ error: null })

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-serif text-2xl font-bold">页面渲染异常</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {this.state.error.message || "未知错误"}
        </p>
        <button
          type="button"
          onClick={() => {
            this.reset()
            window.location.reload()
          }}
          className="rounded-md px-4 py-2 text-sm font-medium"
          style={{
            background: "var(--color-primary)",
            color: "var(--color-primary-foreground)",
          }}
        >
          刷新重试
        </button>
      </div>
    )
  }
}
