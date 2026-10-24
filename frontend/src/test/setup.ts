import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

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

// 테스트마다 그린 화면을 지워서 서로 영향을 주지 않게 해요.
afterEach(() => {
  cleanup()
})
