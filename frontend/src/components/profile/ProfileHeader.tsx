import { Link } from 'react-router'
import type { Profile } from '../../api/types'
import { dottedDate } from '../../lib/date'
import Avatar from '../Avatar'
import HeroBand from '../ui/HeroBand'

/** 프로필 위쪽 밤하늘 띠: 사진 96, 닉네임, 가입일, (내 프로필이면) 공개 상태와 수정 버튼. */
export default function ProfileHeader({ profile }: { profile: Profile }) {
  return (
    <HeroBand
      media={
        <Avatar
          src={profile.avatarUrl}
          name={profile.nickname}
          size={96}
          className="!ring-2 ring-offset-2 ring-offset-night max-sm:!h-[72px] max-sm:!w-[72px]"
        />
      }
      eyebrow={profile.mine ? `내 프로필 · ${profile.profilePublic ? '공개' : '비공개'}` : undefined}
      title={profile.nickname}
      sub={`${dottedDate(profile.joinedAt)} 가입`}
      action={
        profile.mine && (
          <Link
            to="/settings/profile"
            className="inline-flex h-10 items-center rounded-touch px-4 text-[15px] font-bold whitespace-nowrap text-gold-pale shadow-[inset_0_0_0_1px_var(--color-gold)] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-gold"
          >
            프로필 수정
          </Link>
        )
      }
    />
  )
}
