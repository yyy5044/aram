/** 조회수 같은 숫자를 1,234처럼 쉼표를 넣어 보여줘요. */
export function formatCount(n: number): string {
  return n.toLocaleString('ko-KR')
}
