import { PAGE_WIDE } from './ui/layout'

/** 모든 화면 맨 아래. 라이엇 팬 콘텐츠 정책에 따라 게임 그림을 쓰는 팬 사이트임을 밝혀요. */
export default function SiteFooter() {
  return (
    // 좁은 화면은 떠 있는 글쓰기 버튼이 마지막 줄을 가리지 않게 아래를 더 비워요.
    <footer className="border-t border-line max-lg:pb-24">
      <p className={`${PAGE_WIDE} py-6 text-[13px] leading-relaxed text-ink-3`}>
        ARAM은 Riot Games의 보증을 받지 않았으며, Riot Games나 Riot Games 자산의 제작·관리에 공식적으로 참여하는
        누구의 견해나 의견도 반영하지 않아요. Riot Games와 관련된 모든 자산은 Riot Games, Inc.의 상표 또는 등록
        상표예요.
      </p>
    </footer>
  )
}
