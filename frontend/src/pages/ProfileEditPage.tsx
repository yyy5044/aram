import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { IMAGE_TYPES, MAX_IMAGE_BYTES, uploadImage } from '../api/images'
import { meKey, startDiscordLogin, useMe } from '../api/me'
import { updateProfile } from '../api/profile'
import type { Me } from '../api/types'
import Avatar from '../components/Avatar'
import { useToast } from '../components/toastContext'
import { buttonClass } from '../components/ui/button'
import EmptyState from '../components/ui/EmptyState'
import { DiscordIcon } from '../components/ui/icons'
import { PAGE_NARROW } from '../components/ui/layout'

/** 프로필 수정: 사진, 닉네임, 공개 설정을 한 번에 저장해요. */
export default function ProfileEditPage() {
  const { data: me, isPending } = useMe()
  if (isPending) return null
  if (!me) {
    return (
      <EmptyState
        title="프로필을 바꾸려면 로그인이 필요해요"
        action={
          <button type="button" onClick={() => startDiscordLogin('/settings/profile')} className={buttonClass('discord', 44)}>
            <DiscordIcon className="h-5 w-5" />
            로그인하고 프로필 수정하기
          </button>
        }
      />
    )
  }
  return <ProfileForm key={me.id} me={me} />
}

function ProfileForm({ me }: { me: Me }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)

  const [nickname, setNickname] = useState(me.nickname ?? '')
  const [imageId, setImageId] = useState<string | null>(me.profileImageId)
  const [preview, setPreview] = useState<string | null>(me.avatarUrl)
  const [profilePublic, setProfilePublic] = useState(me.profilePublic)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  async function pickPhoto(file: File | undefined) {
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type)) {
      toast.show('jpg, png, webp, gif 이미지만 올릴 수 있어요')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.show('이미지는 10MB 이하만 올릴 수 있어요')
      return
    }
    setUploading(true)
    try {
      const uploaded = await uploadImage(file)
      setImageId(uploaded.id)
      setPreview(uploaded.url)
    } catch (e) {
      toast.show(e instanceof ApiError ? e.message : '이미지를 올리지 못했어요')
    } finally {
      setUploading(false)
    }
  }

  function revertToDiscord() {
    setImageId(null)
    setPreview(me.discordAvatarUrl)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      const updated = await updateProfile({ nickname, profileImageId: imageId, profilePublic })
      queryClient.setQueryData(meKey, updated)
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
      void queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.show('프로필을 저장했어요')
      navigate(`/users/${me.id}`)
    } catch (e) {
      if (e instanceof ApiError && e.code === 'NICKNAME_TAKEN') setErrors({ nickname: e.message })
      else if (e instanceof ApiError && e.fieldErrors) setErrors(e.fieldErrors)
      else toast.show(e instanceof ApiError ? e.message : '잠시 후 다시 시도해주세요')
      setSaving(false)
    }
  }

  const label = 'mb-2 block text-[15px] font-bold text-ink'
  const help = 'mt-1.5 text-[13px] text-ink-3'
  const fieldError = (key: string) => errors[key] && <p className="mt-1 text-sm text-danger">{errors[key]}</p>

  return (
    <form onSubmit={save} className={PAGE_NARROW}>
      <h1 className="mb-4 font-display text-[28px] leading-tight text-night">프로필 수정</h1>

      <div className="flex flex-col gap-6 border border-line-soft bg-surface p-4 sm:p-8">
        <div>
          <span className={label}>프로필 사진</span>
          <div className="flex flex-wrap items-center gap-6">
            <span data-testid="profile-preview">
              <Avatar src={preview} name={nickname} size={96} className="!ring-2 ring-offset-2 ring-offset-surface" />
            </span>
            <div className="flex flex-col items-start gap-1.5">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInput.current?.click()}
                className={buttonClass('tealLine', 40)}
              >
                사진 바꾸기
              </button>
              <button type="button" disabled={imageId === null} onClick={revertToDiscord} className={buttonClass('quiet')}>
                디스코드 사진으로 되돌리기
              </button>
              <p className="text-[13px] text-ink-3">jpg, png, webp, gif · 10MB 이하. 동그랗게 잘려서 보여요.</p>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept={IMAGE_TYPES.join(',')}
              aria-label="프로필 사진 고르기"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                void pickPhoto(file)
              }}
            />
          </div>
          {fieldError('profileImageId')}
        </div>

        <div>
          <label htmlFor="profile-nickname" className={label}>
            닉네임
          </label>
          <input
            id="profile-nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            className="h-12 w-full rounded-touch border border-line bg-white px-3.5 text-[15px] text-ink focus:border-teal focus:ring-3 focus:ring-teal-hi/20 focus:outline-none"
          />
          <p className={help}>2~12자 한글, 영문, 숫자, 밑줄</p>
          {fieldError('nickname')}
        </div>

        <div>
          <span className={label}>공개 설정</span>
          {/* 줄 전체를 눌러도 스위치가 바뀌어요. */}
          <div
            onClick={() => setProfilePublic((v) => !v)}
            className="flex cursor-pointer items-center justify-between gap-4 border border-line-soft bg-[#f8fbfd] p-4"
          >
            <div>
              <b className="text-[15px] text-ink">프로필 공개</b>
              <p className="mt-0.5 text-[13px] text-ink-3">
                끄면 다른 친구에게는 자물쇠와 안내 문구만 보여요. 글과 댓글은 게시판에서 그대로 보여요.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={profilePublic}
              aria-label="프로필 공개"
              onClick={(e) => {
                e.stopPropagation()
                setProfilePublic((v) => !v)
              }}
              className={`relative h-7 w-12 flex-none rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal ${
                profilePublic ? 'bg-teal' : 'bg-line'
              }`}
            >
              <span
                className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-all ${
                  profilePublic ? 'left-[23px]' : 'left-[3px]'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-line-soft pt-4">
          <Link to={`/users/${me.id}`} className={buttonClass('ghost', 44)}>
            취소
          </Link>
          <button type="submit" disabled={saving || uploading} className={`${buttonClass('primary', 44)} min-w-[120px]`}>
            저장
          </button>
        </div>
      </div>
    </form>
  )
}
