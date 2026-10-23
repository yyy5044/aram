import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// 테스트마다 그린 화면을 지워서 서로 영향을 주지 않게 해요.
afterEach(() => {
  cleanup()
})
