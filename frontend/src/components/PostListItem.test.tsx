import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { listItem } from '../test/fixtures'
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

  it('compact mode is one line without tag icons', () => {
    renderWithProviders(
      <ul>
        <PostListItem post={listItem({ title: '한 줄 글' })} compact />
      </ul>,
    )
    expect(screen.getByRole('link', { name: '한 줄 글' })).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByText('추천')).not.toBeInTheDocument()
  })
})
