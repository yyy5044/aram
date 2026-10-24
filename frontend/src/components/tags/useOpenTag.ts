import { useSearchParams } from 'react-router'

/** 펼친 칸은 주소의 ?open=에 남겨요. 열고 닫을 때는 방문 기록을 바꿔 끼워서 뒤로 가기가 한 번에 돌아가게 해요. */
export function useOpenTag(): [string | null, (id: string) => void, () => void] {
  const [params, setParams] = useSearchParams()
  const openId = params.get('open')

  function set(next: string | null) {
    const p = new URLSearchParams(params)
    if (next === null) p.delete('open')
    else p.set('open', next)
    setParams(p, { replace: true })
  }

  return [openId, (id) => set(openId === id ? null : id), () => set(null)]
}
