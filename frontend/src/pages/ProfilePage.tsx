import { useParams } from 'react-router'
import { ApiError } from '../api/client'
import { useProfile } from '../api/profile'
import ActivityHeatmap from '../components/profile/ActivityHeatmap'
import ProfileHeader from '../components/profile/ProfileHeader'
import ProfileStats from '../components/profile/ProfileStats'
import ProfileTabs from '../components/profile/ProfileTabs'
import { parseRouteId } from '../lib/routeId'
import NotFoundPage from './NotFoundPage'

/** 사용자 프로필. 비공개이고 본인이 아니면 자물쇠만 보여줘요. */
export default function ProfilePage() {
  const userId = parseRouteId(useParams().userId) ?? Number.NaN
  const { data: profile, error, isPending } = useProfile(userId)

  if (!Number.isFinite(userId) || (error instanceof ApiError && error.status === 404)) {
    return <NotFoundPage message="사용자를 찾을 수 없어요" />
  }
  if (error) {
    return <p className="py-10 text-center text-rose-400">{error instanceof ApiError ? error.message : '잠시 후 다시 시도해주세요'}</p>
  }
  if (isPending || !profile) return null

  return (
    <article>
      <ProfileHeader profile={profile} />
      {profile.mine && !profile.profilePublic && (
        <p className="mb-4 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300">
          비공개 상태예요. 다른 친구에게는 자물쇠만 보여요
        </p>
      )}
      {profile.locked || !profile.stats || !profile.activity ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-12 text-center text-slate-400">
          <div className="mb-2 text-4xl" aria-hidden="true">
            🔒
          </div>
          <p>프로필이 비공개로 설정되었어요</p>
        </div>
      ) : (
        <>
          <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900 p-3.5">
            <ActivityHeatmap activity={profile.activity} />
            <ProfileStats joinedAt={profile.joinedAt} stats={profile.stats} />
          </div>
          <ProfileTabs userId={profile.id} stats={profile.stats} />
        </>
      )}
    </article>
  )
}
