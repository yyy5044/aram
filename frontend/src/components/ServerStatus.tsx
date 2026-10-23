import { useEffect, useState } from 'react'
import { fetchStatus } from '../api/status'

type State =
  | { kind: 'loading' }
  | { kind: 'ok'; database: string }
  | { kind: 'error' }

export default function ServerStatus() {
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    fetchStatus()
      .then((res) => {
        if (!cancelled) setState({ kind: 'ok', database: res.database })
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const dot =
    state.kind === 'ok' ? 'bg-emerald-500' : state.kind === 'error' ? 'bg-rose-500' : 'bg-slate-400'
  const text =
    state.kind === 'ok'
      ? `서버 연결됨 · ${state.database}`
      : state.kind === 'error'
        ? '서버에 연결할 수 없어요'
        : '서버 확인 중…'

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-sm text-slate-300">
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
      <span>{text}</span>
    </div>
  )
}
