import { useLocation } from 'react-router'

/** 다른 화면으로 이동했는지 확인할 때 쓰는 자리 표시. */
export default function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname + location.search}</div>
}
