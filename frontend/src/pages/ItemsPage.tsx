import { useEffect, useId, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useItems } from '../api/gamedata'
import type { Item } from '../api/types'
import ItemDetailPanel from '../components/item/ItemDetailPanel'
import TagPageStatus from '../components/tags/TagPageStatus'
import BottomSheet from '../components/ui/BottomSheet'
import { buttonClass } from '../components/ui/button'
import { PAGE_WIDE } from '../components/ui/layout'
import SearchInput from '../components/ui/SearchInput'
import { shopRows, type ShopRow } from '../lib/itemShop'
import { ITEM_STATS, type ItemStat } from '../lib/itemStats'
import { useMediaQuery } from '../lib/useMediaQuery'

/**
 * 게임 상점의 스탯 아이콘(CommunityDragon `game/assets/ux/itemshop/itemshop_texture_atlas4.png`에서 잘라 public/stats에 둔 것).
 * 꺼진 버튼(흰 바탕)은 색깔 아이콘, 켜진 버튼(청록 바탕)은 밝은 아이콘이에요.
 */
function statIcon(stat: ItemStat, on: boolean): string {
  return `/stats/${stat}${on ? '-on' : ''}.png`
}

/** 능력치 버튼. 넓은 화면은 왼쪽 세로 줄, 그 밖은 가로 한 줄(휴대폰은 밀어서 봐요). */
function StatFilter({
  stats,
  onToggle,
  onClear,
  layout,
}: {
  stats: ReadonlySet<ItemStat>
  onToggle: (stat: ItemStat) => void
  onClear: () => void
  layout: 'column' | 'wrap' | 'scroll'
}) {
  const list =
    layout === 'column'
      ? 'flex flex-col gap-1 [&>button]:w-full'
      : layout === 'wrap'
        ? 'flex flex-wrap gap-1.5'
        : '-mx-4 flex flex-nowrap gap-1.5 overflow-x-auto px-4 pb-1'
  const button = (on: boolean) => buttonClass(on ? 'primary' : 'ghost', 36)
  return (
    <div role="group" aria-label="능력치" className={list}>
      <button type="button" aria-pressed={stats.size === 0} onClick={onClear} className={button(stats.size === 0)}>
        모든 아이템
      </button>
      {ITEM_STATS.map((s) => (
        <button key={s.key} type="button" aria-pressed={stats.has(s.key)} onClick={() => onToggle(s.key)} className={button(stats.has(s.key))}>
          <img src={statIcon(s.key, stats.has(s.key))} alt="" className="h-5 w-5 flex-none" />
          {s.label}
        </button>
      ))}
    </div>
  )
}

/** 상점 칸: 아이콘 48과 아래 가격. 이름은 마우스를 올리면 보이고 화면 읽기 프로그램이 읽어요. */
function ShopItem({ item, selected, onPick }: { item: Item; selected: boolean; onPick: (id: string) => void }) {
  return (
    <button
      type="button"
      aria-label={`${item.nameKo} ${item.priceTotal} 골드`}
      aria-pressed={selected}
      title={item.nameKo}
      onClick={() => onPick(item.id)}
      className="flex flex-col items-center gap-1 rounded-mark p-0.5 focus-visible:outline-2 focus-visible:outline-teal"
    >
      {item.iconUrl ? (
        <img
          src={item.iconUrl}
          alt=""
          className={`h-12 w-12 rounded-mark bg-night-2 ${selected ? 'ring-2 ring-gold' : 'hover:ring-2 hover:ring-gold/50'}`}
        />
      ) : (
        <span aria-hidden="true" className={`block h-12 w-12 rounded-mark bg-night-2 ${selected ? 'ring-2 ring-gold' : ''}`} />
      )}
      <span aria-hidden="true" className="text-[13px] leading-none text-gold-deep">
        {item.priceTotal}
      </span>
    </button>
  )
}

function Row({ row, selectedId, onPick }: { row: ShopRow; selectedId: string | null; onPick: (id: string) => void }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="border-b border-line-soft pb-4 last:border-b-0">
      <div className="mb-2 flex items-baseline gap-2">
        <h2 id={headingId} className="text-[15px] font-bold text-ink">
          {row.label}
        </h2>
        <span className="text-[13px] text-ink-3">{row.items.length}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {row.items.map((it) => (
          <ShopItem key={it.id} item={it} selected={it.id === selectedId} onPick={onPick} />
        ))}
      </div>
    </section>
  )
}

/**
 * 아이템 탭(설계 docs/superpowers/specs/2026-10-26-item-shop-design.md): 게임 상점처럼 능력치로 걸러내고 단계별 줄에서 찾아요.
 * 고른 아이템은 주소 ?item=에 남고, 넓은 화면은 오른쪽 칸에, 휴대폰은 아래서 올라오는 창에 조합 나무와 설명이 나와요.
 */
export default function ItemsPage() {
  const items = useItems()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [stats, setStats] = useState<Set<ItemStat>>(() => new Set())
  const wide = useMediaQuery('(min-width: 1024px)')
  const phone = useMediaQuery('(max-width: 767px)')

  const requested = params.get('item')
  const all = items.data ?? []
  const selected = all.find((it) => it.id === requested && it.active) ?? null
  // 없거나 상점에서 빠진 번호는 주소에서 지워요(목록을 받은 뒤에만).
  const stale = items.data !== undefined && requested !== null && selected === null

  useEffect(() => {
    if (!stale) return
    setParams(
      (p) => {
        p.delete('item')
        return p
      },
      { replace: true },
    )
  }, [stale, setParams])

  if (items.isPending || items.error) return <TagPageStatus pending={items.isPending} error={items.error} />

  function pick(id: string) {
    setParams(
      (p) => {
        p.set('item', id)
        return p
      },
      { replace: true },
    )
  }

  function unpick() {
    setParams(
      (p) => {
        p.delete('item')
        return p
      },
      { replace: true },
    )
  }

  function toggleStat(stat: ItemStat) {
    setStats((prev) => {
      const next = new Set(prev)
      if (next.has(stat)) next.delete(stat)
      else next.add(stat)
      return next
    })
  }

  function clearAll() {
    setQuery('')
    setStats(new Set())
  }

  const rows = shopRows(all, query, stats)
  const shown = rows.reduce((sum, r) => sum + r.items.length, 0)
  const noData = !all.some((it) => it.active)
  const panel = selected ? <ItemDetailPanel itemId={selected.id} items={all} onPick={pick} /> : null

  return (
    <section className={PAGE_WIDE}>
      <div className="mb-4 flex items-baseline gap-3">
        <h1 className="font-display text-[28px] leading-tight text-night">아이템</h1>
        <span className="text-[13px] text-ink-3">아이템 {shown}개</span>
      </div>
      {noData ? (
        <p className="py-16 text-center text-ink-3">아직 아이템 정보를 받아오지 못했어요. 잠시 후 다시 확인해주세요</p>
      ) : (
        <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_340px] lg:grid-cols-[176px_minmax(0,1fr)_340px]">
          {wide && (
            <aside className="lg:sticky lg:top-4">
              <StatFilter stats={stats} onToggle={toggleStat} onClear={() => setStats(new Set())} layout="column" />
            </aside>
          )}
          <div className="min-w-0">
            <SearchInput label="아이템 이름 검색" placeholder="아이템 이름 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
            {!wide && (
              <div className="mt-3">
                <StatFilter stats={stats} onToggle={toggleStat} onClear={() => setStats(new Set())} layout={phone ? 'scroll' : 'wrap'} />
              </div>
            )}
            <div className="mt-4 flex flex-col gap-4 border border-line-soft bg-surface p-4">
              {rows.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <p className="text-ink-3">조건에 맞는 아이템이 없어요</p>
                  <button type="button" onClick={clearAll} className={buttonClass('ghost', 40)}>
                    조건 지우기
                  </button>
                </div>
              ) : (
                rows.map((row) => <Row key={row.tier} row={row} selectedId={selected?.id ?? null} onPick={pick} />)
              )}
            </div>
          </div>
          {!phone && (
            <aside className="rounded-mark border border-gold bg-night p-4 shadow-pop md:sticky md:top-4 md:max-h-[calc(100vh-2rem)] md:overflow-y-auto">
              {panel ?? <p className="py-8 text-center text-[15px] text-nav">아이템을 고르면 조합과 설명이 나와요</p>}
            </aside>
          )}
        </div>
      )}
      {phone && (
        <BottomSheet open={selected !== null} onClose={unpick} label={selected?.nameKo ?? ''}>
          {panel}
        </BottomSheet>
      )}
    </section>
  )
}
