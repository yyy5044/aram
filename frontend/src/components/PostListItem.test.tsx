import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { amumu, jinx, legDay, listItem, oldAugment } from '../test/fixtures'
import { renderWithProviders } from '../test/render'
import PostListItem from './PostListItem'

describe('PostListItem', () => {
  it('links the nickname to the author profile', async () => {
    renderWithProviders(
      <ul>
        <PostListItem post={listItem({ author: { id: 7, nickname: '양호', avatarUrl: null } })} />
      </ul>,
    )
    expect(await screen.findByRole('link', { name: '양호' })).toHaveAttribute('href', '/users/7')
  })

  it('shows tags as icon + name, the patch chip, comments and likes', () => {
    const { container } = renderWithProviders(
      <ul>
        <PostListItem post={listItem()} />
      </ul>,
    )
    expect(screen.getByText('아무무')).toBeInTheDocument()
    expect(screen.getByText('하체 운동의 날')).toBeInTheDocument()
    expect(screen.getByText('26.21').closest('[data-version]')).toHaveTextContent('26.21 버전')
    expect(screen.getByText('댓글 8')).toBeInTheDocument()
    // "추천"은 화면 읽기 프로그램용 숨김 글자예요. 화면에는 삼각형과 숫자만 보여요.
    expect(container.querySelector('[data-likes]')).toHaveTextContent('추천 24')
  })

  it('puts the gold corner frame only on liked posts', () => {
    renderWithProviders(
      <ul>
        <PostListItem post={listItem({ id: 1, title: '인기 글', likeCount: 3 })} />
        <PostListItem post={listItem({ id: 2, title: '새 글', likeCount: 0 })} />
      </ul>,
    )
    expect(screen.getByRole('link', { name: '인기 글' }).closest('li')).toHaveAttribute('data-corner-frame')
    expect(screen.getByRole('link', { name: '새 글' }).closest('li')).not.toHaveAttribute('data-corner-frame')
  })

  it('renders a post with a 100-char title, a 12-char nickname and 15 tags', () => {
    const title = '가'.repeat(100)
    renderWithProviders(
      <ul>
        <PostListItem
          post={listItem({
            title,
            author: { id: 3, nickname: '열두글자닉네임입니다요', avatarUrl: null },
            champions: [amumu, jinx, { ...amumu, id: 'A3' }, { ...amumu, id: 'A4' }, { ...amumu, id: 'A5' }],
            augments: Array.from({ length: 10 }, (_, i) => ({ ...(i % 2 ? legDay : oldAugment), id: `AUG${i}` })),
          })}
        />
      </ul>,
    )
    expect(screen.getByRole('link', { name: title })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /열두글자닉네임입니다요/ })).toHaveAttribute('href', '/users/3')
  })

  it('compact mode is one line without tag icons', () => {
    renderWithProviders(
      <ul>
        <PostListItem post={listItem({ title: '한 줄 글' })} compact />
      </ul>,
    )
    expect(screen.getByRole('link', { name: '한 줄 글' })).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByText('아무무')).not.toBeInTheDocument()
  })
})
