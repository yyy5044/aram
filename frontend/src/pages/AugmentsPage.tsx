import { useState } from 'react'
import { useAugments, useTagCounts } from '../api/gamedata'
import type { Augment, AugmentRarity } from '../api/types'
import TagGrid from '../components/tags/TagGrid'
import TagPageStatus from '../components/tags/TagPageStatus'
import TagPostsPanel from '../components/tags/TagPostsPanel'
import TagToolbar from '../components/tags/TagToolbar'
import { useOpenTag } from '../components/tags/useOpenTag'
import { matchesName, sortTags, type TagSort } from '../lib/tagSearch'

const RARITY_GROUPS: { rarity: AugmentRarity; label: string; dot: string }[] = [
  { rarity: 'PRISMATIC', label: '프리즘', dot: 'bg-gradient-to-br from-fuchsia-300 to-sky-300' },
  { rarity: 'GOLD', label: '골드', dot: 'bg-amber-300' },
  { rarity: 'SILVER', label: '실버', dot: 'bg-slate-400' },
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

  return (
    <section>
      <TagToolbar query={query} onQueryChange={setQuery} sort={sort} onSortChange={setSort} placeholder="증강 이름 검색" />
      {groups.length === 0 && <p className="py-16 text-center text-slate-400">검색 결과가 없어요</p>}
      {groups.map((g) => (
        <div key={g.rarity} className="mb-2.5 rounded-xl border border-slate-800 bg-slate-900">
          <button
            type="button"
            aria-expanded={g.open}
            onClick={() => toggleGroup(g)}
            className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-3 text-left hover:bg-slate-800"
          >
            <span aria-hidden="true" className={`h-3.5 w-3.5 rounded ${g.dot}`} />
            <span className="font-bold">{g.label}</span>
            <span className="text-xs text-slate-400">
              증강 {searching ? `${g.matches.length}/` : ''}
              {g.all.length}개 · 글 {g.posts}개
            </span>
            <span aria-hidden="true" className={`ml-auto text-slate-500 transition-transform ${g.open ? 'rotate-90' : ''}`}>
              ›
            </span>
          </button>
          {g.open && (
            <div className="border-t border-slate-800 px-3 pt-2 pb-3">
              <TagGrid
                items={g.matches.map((a) => ({ id: a.id, name: a.nameKo, image: a.iconUrl, count: countOf(a) }))}
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
                    />
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
