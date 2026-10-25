/**
 * jsdom에는 IntersectionObserver가 없어요. setup.ts가 이 가짜를 깔고,
 * 테스트는 setIntersecting으로 "화면에 보임/안 보임"을 흉내 내요.
 */
type Entry = { target: Element; isIntersecting: boolean; intersectionRatio: number }

const observers = new Set<FakeIntersectionObserver>()

export class FakeIntersectionObserver {
  private readonly targets = new Set<Element>()
  private readonly callback: (entries: Entry[]) => void

  constructor(callback: (entries: Entry[]) => void) {
    this.callback = callback
    observers.add(this)
  }

  observe(target: Element) {
    this.targets.add(target)
  }

  unobserve(target: Element) {
    this.targets.delete(target)
  }

  disconnect() {
    this.targets.clear()
    observers.delete(this)
  }

  takeRecords() {
    return []
  }

  fire(target: Element, isIntersecting: boolean) {
    if (this.targets.has(target)) {
      this.callback([{ target, isIntersecting, intersectionRatio: isIntersecting ? 1 : 0 }])
    }
  }
}

export function setIntersecting(target: Element, isIntersecting: boolean) {
  for (const observer of observers) observer.fire(target, isIntersecting)
}
