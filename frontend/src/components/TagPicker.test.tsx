import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { Champion } from '../api/types'
import { amumu, jinx } from '../test/fixtures'
import TagPicker from './TagPicker'

function Harness({ max = 5, initial = [] as string[] }) {
  const [selected, setSelected] = useState<string[]>(initial)
  return (
    <TagPicker<Champion>
      label="챔피언"
      items={[amumu, jinx]}
      options={[amumu, jinx]}
      selected={selected}
      onChange={setSelected}
      max={max}
      iconOf={(c) => c.imageUrl}
      placeholder="챔피언 검색…"
    />
  )
}

describe('TagPicker', () => {
  it('filters by partial Korean name', async () => {
    render(<Harness />)
    await userEvent.type(screen.getByLabelText('챔피언 검색'), '아무')
    expect(screen.getByRole('option', { name: /아무무/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /징크스/ })).not.toBeInTheDocument()
  })

  it('adds and removes chips', async () => {
    render(<Harness />)
    await userEvent.type(screen.getByLabelText('챔피언 검색'), '아무')
    await userEvent.click(screen.getByRole('option', { name: /아무무/ }))
    expect(screen.getByRole('button', { name: '아무무 빼기' })).toBeInTheDocument()
    expect(screen.getByLabelText('챔피언 검색')).toHaveValue('')

    await userEvent.click(screen.getByLabelText('챔피언 검색'))
    expect(screen.queryByRole('option', { name: /아무무/ })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '아무무 빼기' }))
    expect(screen.queryByRole('button', { name: '아무무 빼기' })).not.toBeInTheDocument()
  })

  it('blocks input at max', async () => {
    render(<Harness max={1} />)
    await userEvent.click(screen.getByLabelText('챔피언 검색'))
    await userEvent.click(screen.getByRole('option', { name: /징크스/ }))
    expect(screen.getByLabelText('챔피언 검색')).toBeDisabled()
    expect(screen.getByText('최대 1개까지 고를 수 있어요')).toBeInTheDocument()
  })

  it('shows selected items that are not searchable options', () => {
    render(
      <TagPicker<Champion>
        label="챔피언"
        items={[amumu, jinx]}
        options={[jinx]}
        selected={['Amumu']}
        onChange={() => {}}
        max={5}
        iconOf={(c) => c.imageUrl}
      />,
    )
    expect(screen.getByRole('button', { name: '아무무 빼기' })).toBeInTheDocument()
  })
})
