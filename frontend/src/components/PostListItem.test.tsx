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
})
