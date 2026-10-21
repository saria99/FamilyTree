import { Component, type ReactNode } from 'react'

/** Keeps a crash from blanking the page during feedback sessions; offers a reload. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="page" role="alert">
        <h1>Something went wrong · حدث خطأ</h1>
        <p className="muted">{this.state.error.message}</p>
        <p>Your tree is still saved in this browser. · شجرتك ما زالت محفوظة في هذا المتصفح.</p>
        <button className="btn btn-primary" onClick={() => location.reload()}>Reload · إعادة التحميل</button>
      </div>
    )
  }
}
