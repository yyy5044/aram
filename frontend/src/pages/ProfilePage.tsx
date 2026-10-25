import { useParams } from 'react-router'
import { ApiError } from '../api/client'
import { useProfile } from '../api/profile'
import ActivityHeatmap from '../components/profile/ActivityHeatmap'
import ProfileHeader from '../components/profile/ProfileHeader'
import ProfileStats from '../components/profile/ProfileStats'
import ProfileTabs from '../components/profile/ProfileTabs'
import { parseRouteId } from '../lib/routeId'
import EmptyState from '../components/ui/EmptyState'
import { PAGE_WIDE } from '../components/ui/layout'
import NotFoundPage from './NotFoundPage'

/** 사용자 프로필. 비공개이고 본인이 아니면 자물쇠만 보여줘요. */
export default function ProfilePage() {
  const userId = parseRouteId(useParams().userId) ?? Number.NaN
  const { data: profile, error, isPending } = useProfile(userId)

  if (!Number.isFinite(userId) || (error instanceof ApiError && error.status === 404)) {
    return <NotFoundPage message="사용자를 찾을 수 없어요" />
  }
  if (error) {
    return <p className="py-10 text-center text-danger">{error instanceof ApiError ? error.message : '잠시 후 다시 시도해주세요'}</p>
  }
  if (isPending || !profile) return null

  return (
    <article className={PAGE_WIDE}>
      <ProfileHeader profile={profile} />
      {profile.mine && !profile.profilePublic && (
        <p className="mb-4 border border-line bg-surface px-4 py-2.5 text-[15px] text-ink-2">
          비공개 상태예요. 다른 친구에게는 자물쇠만 보여요
        </p>
      )}
      {profile.locked || !profile.stats || !profile.activity ? (
        <EmptyState icon="lock" title="프로필이 비공개로 설정되었어요" />
      ) : (
        <>
          <div className="mb-6 border border-line-soft bg-surface px-4 py-5 sm:px-6">
            <ActivityHeatmap activity={profile.activity} />
            <ProfileStats stats={profile.stats} />
          </div>
          <ProfileTabs userId={profile.id} stats={profile.stats} />
        </>
      )}
    </article>
  )
}
