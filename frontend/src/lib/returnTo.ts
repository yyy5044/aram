const KEY = 'aram.returnTo'

/** 로그인이나 닉네임 설정 뒤 돌아올 주소를 기억해요. 우리 사이트 안의 경로만 받아요. */
export function rememberReturnTo(path: string) {
  try {
    if (isSafe(path)) sessionStorage.setItem(KEY, path)
  } catch {
    // 저장소를 못 쓰면 메인으로 돌아가요.
  }
}

export function consumeReturnTo(): string {
  try {
    const path = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    return path && isSafe(path) ? path : '/'
  } catch {
    return '/'
  }
}

function isSafe(path: string) {
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/welcome') && !path.startsWith('/auth/')
}
