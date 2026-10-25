import { usePatches } from '../api/gamedata'
import { PAGE_WIDE } from './ui/layout'

/** 바닥글 「문의」가 여는 주소. */
export const CONTACT_EMAIL = 'yyy5044@naver.com'

const LINK = 'underline-offset-2 hover:text-ink-2 hover:underline'

function Outside({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={LINK}>
      {children}
    </a>
  )
}

/**
 * 모든 화면 맨 아래. 사이트 이름·문의·소스, 게임 자료 출처와 지금 패치, 그리고 라이엇 팬 콘텐츠 정책이 정한
 * 안내 문구(영어 원문 그대로)를 보여줘요. 게임 그림을 쓰는 공개 사이트라 라이엇 문구는 지우지 않아요.
 */
export default function SiteFooter() {
  const patch = usePatches().data?.current

  return (
    // 좁은 화면은 떠 있는 글쓰기 버튼이 마지막 줄을 가리지 않게 아래를 더 비워요.
    <footer className="border-t border-line max-lg:pb-24">
      <div className={`${PAGE_WIDE} space-y-2 py-6 text-[13px] leading-relaxed text-ink-3`}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="font-bold text-ink-2">ARAM · 증강 칼바람 커뮤니티</p>
          <p className="flex gap-3">
            <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>
              문의
            </a>
            <Outside href="https://github.com/yyy5044/aram">GitHub</Outside>
          </p>
        </div>
        <p>
          게임 정보: <Outside href="https://developer.riotgames.com/docs/lol#data-dragon">Riot Data Dragon</Outside>
          {' · '}
          <Outside href="https://www.communitydragon.org/">CommunityDragon</Outside>
          {patch && (
            <>
              {' · '}
              <span>{patch} 패치 기준</span>
            </>
          )}
        </p>
        <p>© 2026 ARAM</p>
        <p lang="en">
          ARAM isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially
          involved in producing or managing Riot Games properties. Riot Games, and all associated properties are
          trademarks or registered trademarks of Riot Games, Inc.
        </p>
      </div>
    </footer>
  )
}
