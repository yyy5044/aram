import { Link } from 'react-router'
import type { Profile } from '../../api/types'
import { dottedDate } from '../../lib/date'
import Avatar from '../Avatar'

/** 프로필 위쪽: 사진, 닉네임, (내 프로필이면) 공개 표시와 수정 버튼. */
export default function ProfileHeader({ profile }: { profile: Profile }) {
  return (
    <div className="mb-4 flex items-center gap-3.5">
      <Avatar src={profile.avatarUrl} size={72} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold break-all">{profile.nickname}</h1>
          {profile.mine && (
            <span className="rounded-md border border-slate-700 px-1.5 py-0.5 text-[11px] text-slate-400">
              {profile.profilePublic ? '공개' : '비공개'}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-400">
          {profile.mine ? '내 프로필이에요' : `가입 ${dottedDate(profile.joinedAt)}`}
        </p>
      </div>
      {profile.mine && (
        <Link
          to="/settings/profile"
          className="ml-auto flex-none rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm hover:bg-slate-800"
        >
          프로필 수정
        </Link>
      )}
    </div>
  )
}
