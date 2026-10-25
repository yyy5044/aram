const SEOUL_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** 2026.10.24 형식 날짜. 활동 잔디처럼 한국 시간 기준이라 해외에서 봐도 같은 날짜예요. */
export function dottedDate(iso: string): string {
  // en-CA는 2026-10-24 순서로 줘요.
  return SEOUL_DATE.format(new Date(iso)).replaceAll('-', '.')
}
