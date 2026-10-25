import { useState } from 'react'
import { useAugments, useTagCounts } from '../api/gamedata'
import type { Augment, AugmentRarity } from '../api/types'
import AugmentCards from '../components/augment/AugmentCards'
import AugmentIcon from '../components/augment/AugmentIcon'
import TagGrid from '../components/tags/TagGrid'
import TagPageStatus from '../components/tags/TagPageStatus'
import TagPostsPanel from '../components/tags/TagPostsPanel'
import TagToolbar from '../components/tags/TagToolbar'
import { useOpenTag } from '../components/tags/useOpenTag'
import { PAGE_WIDE } from '../components/ui/layout'
import { matchesName, sortTags, type TagSort } from '../lib/tagSearch'

/** bar는 묶음 머리 왼쪽 4px 세로줄(등급 색). */
const RARITY_GROUPS: { rarity: AugmentRarity; label: string; bar: string }[] = [
  { rarity: 'PRISMATIC', label: '프리즘', bar: 'bg-linear-to-b from-[#e3a6ff] to-[#8f5bd8]' },
  { rarity: 'GOLD', label: '골드', bar: 'bg-gold-rarity' },
  { rarity: 'SILVER', label: '실버', bar: 'bg-silver' },
]

/** 증강 목록. 프리즘·골드·실버 묶음으로 접혀 있고, 증강을 누르면 그 아래로 글 목록이 펼쳐져요. */
export default function AugmentsPage() {
  const augments = useAugments()
  const counts = useTagCounts()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<TagSort>('name')
  const [openGroups, setOpenGroups] = useState<Set<AugmentRarity>>(() => new Set())
  const [openId, toggle, close] = useOpenTag()

  if (augments.isPending || counts.isPending || augments.error || counts.error) {
    return <TagPageStatus pending={augments.isPending || counts.isPending} error={augments.error ?? counts.error} />
  }

  const countOf = (a: Augment) => counts.data.augments[a.id] ?? 0
  const active = augments.data.filter((a) => a.active)
  const searching = query.trim() !== ''
  const groups = RARITY_GROUPS.map((g) => {
    const all = active.filter((a) => a.rarity === g.rarity)
    const matches = sortTags(
      all.filter((a) => matchesName(a.nameKo, query)),
      sort,
      (a) => a.nameKo,
      countOf,
    )
    const containsOpen = openId !== null && all.some((a) => a.id === openId)
    return {
      ...g,
      all,
      matches,
      posts: all.reduce((sum, a) => sum + countOf(a), 0),
      open: openGroups.has(g.rarity) || (searching && matches.length > 0) || containsOpen,
    }
  }).filter((g) => !searching || g.matches.length > 0)

  function setGroupOpen(rarity: AugmentRarity, open: boolean) {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (open) next.add(rarity)
      else next.delete(rarity)
      return next
    })
  }

  /** 펼침 영역을 품은 묶음의 제목을 누르면 펼침 영역도 닫고 묶음을 접어요. */
  function toggleGroup(g: (typeof groups)[number]) {
    const containsOpen = openId !== null && g.all.some((a) => a.id === openId)
    if (containsOpen) close()
    setGroupOpen(g.rarity, !(g.open || containsOpen))
  }

  /** 묶음 안의 칸이나 펼침 영역을 건드리면 그 묶음은 계속 펼쳐 둬요(?open=으로만 열렸던 경우). */
  function toggleItem(rarity: AugmentRarity, id: string) {
    setGroupOpen(rarity, true)
    toggle(id)
  }

  function closePanel(rarity: AugmentRarity) {
    setGroupOpen(rarity, true)
    close()
  }

  const totalPosts = active.reduce((sum, a) => sum + countOf(a), 0)

  return (
    <section className={PAGE_WIDE}>
      <div className="mb-4 flex items-baseline gap-3">
        <h1 className="font-display text-[28px] leading-tight text-night">증강</h1>
        <span className="text-[13px] text-ink-3">
          증강 {active.length}개 · 글 {totalPosts}개
        </span>
      </div>
      <TagToolbar query={query} onQueryChange={setQuery} sort={sort} onSortChange={setSort} placeholder="증강 이름 검색" />
      {groups.length === 0 && <p className="py-16 text-center text-ink-3">검색 결과가 없어요</p>}
      {groups.map((g) => (
        <div key={g.rarity} className="mb-2 border border-line-soft bg-surface">
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
              증강 {searching ? `${g.matches.length}/` : ''}
              {g.all.length}개 · 글 {g.posts}개
            </span>
            <span aria-hidden="true" className={`ml-auto text-lg text-ink-3 transition-transform ${g.open ? '-rotate-90' : 'rotate-90'}`}>
              ›
            </span>
          </button>
          {g.open && (
            <div className="p-2 sm:p-4">
              <TagGrid
                items={g.matches.map((a) => ({
                  id: a.id,
                  name: a.nameKo,
                  image: a.iconUrl,
                  rarity: a.rarity,
                  tinted: a.iconTinted,
                }))}
                openId={openId}
                onToggle={(id) => toggleItem(g.rarity, id)}
                renderPanel={(id) => {
                  const a = g.all.find((x) => x.id === id)!
                  return (
                    <TagPostsPanel
                      kind="augment"
                      id={id}
                      title={a.nameKo}
                      subtitle={`${g.label} 증강 · 게시글 ${countOf(a)}개`}
                      onClose={() => closePanel(g.rarity)}
                      media={
                        <AugmentIcon
                          src={a.iconUrl}
                          rarity={a.rarity}
                          tinted={a.iconTinted}
                          frame="image"
                          className="h-12 w-12 rounded-mark bg-night"
                        />
                      }
                      moreTo={`/augments/${encodeURIComponent(id)}`}
                      postsHeading={`이 증강 글 ${countOf(a)}개`}
                      compact
                    >
                      <div className="border border-night bg-[radial-gradient(70%_90%_at_50%_40%,#173a52,var(--color-night))] px-3 py-6">
                        <AugmentCards augmentId={id} />
                      </div>
                    </TagPostsPanel>
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
