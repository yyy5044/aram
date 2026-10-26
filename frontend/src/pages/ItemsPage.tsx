import { useEffect, useState } from 'react'
import { useItems, useTagCounts } from '../api/gamedata'
import type { Item, ItemTier } from '../api/types'
import ItemTooltipBody from '../components/item/ItemTooltipBody'
import TagGrid from '../components/tags/TagGrid'
import TagPageStatus from '../components/tags/TagPageStatus'
import TagPostsPanel from '../components/tags/TagPostsPanel'
import TagToolbar from '../components/tags/TagToolbar'
import { useOpenTag } from '../components/tags/useOpenTag'
import { PAGE_WIDE } from '../components/ui/layout'
import { ITEM_TIER_LABEL, ITEM_TIERS } from '../lib/itemTiers'
import { matchesName, sortTags, type TagSort } from '../lib/tagSearch'

/** 묶음 머리 왼쪽 4px 세로줄 색. */
const TIER_BAR: Record<ItemTier, string> = {
  AUGMENT_MODE: 'bg-prismatic',
  LEGENDARY: 'bg-gold',
  EPIC: 'bg-gold-rarity',
  BOOTS: 'bg-teal',
  BASIC: 'bg-silver',
  STARTER: 'bg-line',
}

/** 아이템 목록. 단계별 묶음으로 접혀 있고, 아이템을 누르면 그 아래로 설명 상자와 글 목록이 펼쳐져요. */
export default function ItemsPage() {
  const items = useItems()
  const counts = useTagCounts()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<TagSort>('name')
  const [openGroups, setOpenGroups] = useState<Set<ItemTier>>(() => new Set())
  const [openId, toggle, close, openTo] = useOpenTag()
  // 재료·상위 아이템 아이콘으로 넘어간 칸. 그 펼침 영역이 그려지면 화면 맨 위로 데려와요.
  const [scrollTo, setScrollTo] = useState<string | null>(null)

  useEffect(() => {
    if (scrollTo === null || scrollTo !== openId) return
    // 칸 격자가 펼침 영역 자리를 재고 옮긴 다음(레이아웃 뒤)에 찾아요.
    const frame = requestAnimationFrame(() => {
      document.querySelector(`[data-item-panel="${CSS.escape(scrollTo)}"]`)?.scrollIntoView({ block: 'start' })
      setScrollTo(null)
    })
    return () => cancelAnimationFrame(frame)
  }, [scrollTo, openId])

  if (items.isPending || counts.isPending || items.error || counts.error) {
    return <TagPageStatus pending={items.isPending || counts.isPending} error={items.error ?? counts.error} />
  }

  const countOf = (it: Item) => counts.data.items?.[it.id] ?? 0
  const active = items.data.filter((it) => it.active)
  const searching = query.trim() !== ''
  const groups = ITEM_TIERS.map((tier) => {
    const all = active.filter((it) => it.tier === tier)
    const matches = sortTags(
      all.filter((it) => matchesName(it.nameKo, query)),
      sort,
      (it) => it.nameKo,
      countOf,
    )
    const containsOpen = openId !== null && all.some((it) => it.id === openId)
    return {
      tier,
      label: ITEM_TIER_LABEL[tier],
      bar: TIER_BAR[tier],
      all,
      matches,
      posts: all.reduce((sum, it) => sum + countOf(it), 0),
      open: openGroups.has(tier) || (searching && matches.length > 0) || containsOpen,
    }
  }).filter((g) => g.all.length > 0 && (!searching || g.matches.length > 0))

  function setGroupOpen(tier: ItemTier, open: boolean) {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (open) next.add(tier)
      else next.delete(tier)
      return next
    })
  }

  /** 펼침 영역을 품은 묶음의 제목을 누르면 펼침 영역도 닫고 묶음을 접어요. */
  function toggleGroup(g: (typeof groups)[number]) {
    const containsOpen = openId !== null && g.all.some((it) => it.id === openId)
    if (containsOpen) close()
    setGroupOpen(g.tier, !(g.open || containsOpen))
  }

  /** 묶음 안의 칸이나 펼침 영역을 건드리면 그 묶음은 계속 펼쳐 둬요(?open=으로만 열렸던 경우). */
  function toggleItem(tier: ItemTier, id: string) {
    setGroupOpen(tier, true)
    toggle(id)
  }

  function closePanel(tier: ItemTier) {
    setGroupOpen(tier, true)
    close()
  }

  /**
   * 재료·상위 아이템 아이콘을 누르면 그 아이템을 펼쳐요. 지금 묶음과 넘어간 아이템의 묶음을 모두 펼쳐 두고,
   * 검색어가 그 아이템을 가리지 않게 지우고, 새 펼침 영역으로 화면을 옮겨요.
   */
  function pick(from: ItemTier, id: string) {
    const target = active.find((it) => it.id === id)
    setGroupOpen(from, true)
    if (target) setGroupOpen(target.tier, true)
    setQuery('')
    openTo(id)
    setScrollTo(id)
  }

  const totalPosts = active.reduce((sum, it) => sum + countOf(it), 0)

  return (
    <section className={PAGE_WIDE}>
      <div className="mb-4 flex items-baseline gap-3">
        <h1 className="font-display text-[28px] leading-tight text-night">아이템</h1>
        <span className="text-[13px] text-ink-3">
          아이템 {active.length}개 · 글 {totalPosts}개
        </span>
      </div>
      <TagToolbar query={query} onQueryChange={setQuery} sort={sort} onSortChange={setSort} placeholder="아이템 이름 검색" />
      {active.length === 0 ? (
        <p className="py-16 text-center text-ink-3">아직 아이템 정보를 받아오지 못했어요. 잠시 후 다시 확인해주세요</p>
      ) : groups.length === 0 ? (
        <p className="py-16 text-center text-ink-3">검색 결과가 없어요</p>
      ) : null}
      {groups.map((g) => (
        <div key={g.tier} className="mb-2 border border-line-soft bg-surface">
          <button
            type="button"
            aria-expanded={g.open}
            onClick={() => toggleGroup(g)}
            className={`flex h-14 w-full items-center gap-3 pr-5 text-left hover:bg-[#f1f7fb] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal ${
              g.open ? 'border-b border-line-soft' : ''
            }`}
          >
            <span aria-hidden="true" className={`w-1 self-stretch ${g.bar}`} />
            <span className="text-[17px] font-bold text-ink">{g.label}</span>
            <span className="text-[13px] text-ink-3">
              아이템 {searching ? `${g.matches.length}/` : ''}
              {g.all.length}개 · 글 {g.posts}개
            </span>
            <span aria-hidden="true" className={`ml-auto text-lg text-ink-3 transition-transform ${g.open ? '-rotate-90' : 'rotate-90'}`}>
              ›
            </span>
          </button>
          {g.open && (
            <div className="p-2 sm:p-4">
              <TagGrid
                items={g.matches.map((it) => ({ id: it.id, name: it.nameKo, image: it.iconUrl }))}
                openId={openId}
                onToggle={(id) => toggleItem(g.tier, id)}
                renderPanel={(id) => {
                  const it = g.all.find((x) => x.id === id)!
                  return (
                    <div data-item-panel={id}>
                      <TagPostsPanel
                        kind="item"
                        id={id}
                        title={it.nameKo}
                        subtitle={`${g.label} 아이템 · 게시글 ${countOf(it)}개`}
                        onClose={() => closePanel(g.tier)}
                        media={
                          it.iconUrl ? (
                            <img src={it.iconUrl} alt="" className="h-12 w-12 rounded-mark bg-night-2" />
                          ) : (
                            <span aria-hidden="true" className="block h-12 w-12 rounded-mark bg-night-2" />
                          )
                        }
                        moreTo={`/items/${encodeURIComponent(id)}`}
                        postsHeading={`이 아이템 글 ${countOf(it)}개`}
                        compact
                        aside={
                          <div className="[&>*]:max-w-full">
                            <ItemTooltipBody itemId={id} onPick={(next) => pick(g.tier, next)} />
                          </div>
                        }
                      />
                    </div>
                  )
                }}
              />
            </div>
          )}
        </div>
      ))}
    </section>
  )
}
