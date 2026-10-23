import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { meKey, setNickname, useMe } from '../api/me'
import type { Me } from '../api/types'
import { consumeReturnTo } from '../lib/returnTo'

export default function WelcomePage() {
  const { data: me, isPending } = useMe()
  if (isPending) return null
  if (!me) return <Navigate to="/" replace />
  return <NicknameForm me={me} />
}

function NicknameForm({ me }: { me: Me }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [value, setValue] = useState(me.nickname ?? me.suggestedNickname ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const updated = await setNickname(value)
      queryClient.setQueryData(meKey, updated)
      navigate(consumeReturnTo(), { replace: true })
    } catch (e) {
      if (e instanceof ApiError) setError(e.fieldErrors?.nickname ?? e.message)
      else setError('잠시 후 다시 시도해주세요')
      setSaving(false)
    }
  }

  return (
    <section className="mx-auto max-w-sm py-10">
      <h1 className="mb-2 text-2xl font-bold">닉네임 정하기</h1>
      <p className="mb-6 text-sm text-slate-400">사이트에서 쓸 이름이에요. 2~12자 한글, 영문, 숫자, 밑줄을 쓸 수 있어요.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="nickname" className="text-sm text-slate-300">
          닉네임
        </label>
        <input
          id="nickname"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={20}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
        />
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-amber-300 px-4 py-2 font-bold text-slate-900 disabled:opacity-60"
        >
          시작하기
        </button>
      </form>
    </section>
  )
}
