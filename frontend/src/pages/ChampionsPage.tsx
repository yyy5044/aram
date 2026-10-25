import { useState } from 'react'
import { useChampions, useTagCounts } from '../api/gamedata'
import type { Champion } from '../api/types'
import TagGrid from '../components/tags/TagGrid'
import TagPageStatus from '../components/tags/TagPageStatus'
import TagPostsPanel from '../components/tags/TagPostsPanel'
import TagToolbar from '../components/tags/TagToolbar'
import { useOpenTag } from '../components/tags/useOpenTag'
import { PAGE_WIDE } from '../components/ui/layout'
import { matchesName, sortTags, type TagSort } from '../lib/tagSearch'

/** 챔피언 목록. 챔피언을 누르면 그 아래로 글 목록과 자주 함께 쓰는 증강이 펼쳐져요. */
export default function ChampionsPage() {
  const champions = useChampions()
  const counts = useTagCounts()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<TagSort>('name')
  const [openId, toggle, close] = useOpenTag()

  if (champions.isPending || counts.isPending || champions.error || counts.error) {
    return <TagPageStatus pending={champions.isPending || counts.isPending} error={champions.error ?? counts.error} />
  }

  const countOf = (c: Champion) => counts.data.champions[c.id] ?? 0
  const matches = sortTags(
    champions.data.filter((c) => matchesName(c.nameKo, query)),
    sort,
    (c) => c.nameKo,
    countOf,
  )

  return (
    <section className={PAGE_WIDE}>
      <div className="mb-4 flex items-baseline gap-3">
        <h1 className="font-display text-[28px] leading-tight text-night">챔피언</h1>
        <span className="text-[13px] text-ink-3">챔피언 {champions.data.length}명</span>
      </div>
      <TagToolbar query={query} onQueryChange={setQuery} sort={sort} onSortChange={setSort} placeholder="챔피언 이름 검색" />
      {champions.data.length === 0 ? (
        <p className="py-16 text-center text-ink-3">아직 챔피언 정보를 받아오지 못했어요. 잠시 후 다시 확인해주세요</p>
      ) : matches.length === 0 ? (
        <p className="py-16 text-center text-ink-3">검색 결과가 없어요</p>
      ) : (
        <TagGrid
          items={matches.map((c) => ({ id: c.id, name: c.nameKo, image: c.imageUrl, round: true }))}
          openId={openId}
          onToggle={toggle}
          renderPanel={(id) => {
            const c = champions.data.find((x) => x.id === id)!
            return (
              <TagPostsPanel
                kind="champion"
                id={id}
                title={c.nameKo}
                subtitle={`게시글 ${countOf(c)}개`}
                onClose={close}
                media={
                  c.imageUrl ? <img src={c.imageUrl} alt="" className="h-12 w-12 rounded-full ring-1 ring-gold" /> : undefined
                }
                moreTo={`/champions/${encodeURIComponent(id)}`}
                postsHeading={`${c.nameKo} 글 ${countOf(c)}개`}
                compact
              />
            )
          }}
        />
      )}
    </section>
  )
}
