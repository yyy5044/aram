import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { FakeIntersectionObserver } from './intersection'

// jsdom에는 matchMedia가 없어요. 기본은 넓은 화면으로 답해요(필요한 테스트는 vi.stubGlobal로 덮어써요).
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  })
}

// jsdom에는 IntersectionObserver가 없어요. 테스트는 setIntersecting으로 보임/안 보임을 흉내 내요.
Object.defineProperty(window, 'IntersectionObserver', { writable: true, value: FakeIntersectionObserver })

// 테스트마다 그린 화면을 지워서 서로 영향을 주지 않게 해요.
afterEach(() => {
  cleanup()
})
