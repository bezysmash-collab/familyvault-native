import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import PostCard from '../../components/feed/PostCard'

const author = { id: 'user-1', name: 'Alice', initials: 'AL', color: '#3b82f6' }

function makePost(overrides = {}) {
  return {
    id:         'post-1',
    type:       'text',
    content:    'Hello family!',
    created_at: new Date(Date.now() - 5 * 60_000).toISOString(),
    attachment: null,
    author,
    space:      null,
    comments:   [],
    reactions:  [],
    ...overrides,
  }
}

const noop = jest.fn()

describe('PostCard (React Native)', () => {
  // RN-T13
  it('renders the author name and post content', () => {
    const { getByText } = render(
      <PostCard post={makePost()} currentUserId="user-1" onReact={noop} onComment={noop} />
    )
    expect(getByText('Alice')).toBeTruthy()
    expect(getByText('Hello family!')).toBeTruthy()
  })

  // RN-T14
  it('shows a space badge when the post has a space', () => {
    const post = makePost({ space: { id: 's1', name: 'General', emoji: '💬' } })
    const { getByText } = render(
      <PostCard post={post} currentUserId="user-1" onReact={noop} onComment={noop} />
    )
    expect(getByText('💬 General')).toBeTruthy()
  })

  // RN-T15
  it('does not render a space badge when post.space is null', () => {
    const { queryByText } = render(
      <PostCard post={makePost({ space: null })} currentUserId="user-1" onReact={noop} onComment={noop} />
    )
    expect(queryByText(/General/)).toBeNull()
  })

  // RN-T16
  it('shows the total reaction count when reactions exist', () => {
    const post = makePost({
      reactions: [
        { id: 'r1', type: 'like',    user_id: 'user-2', post_id: 'post-1' },
        { id: 'r2', type: 'love',    user_id: 'user-3', post_id: 'post-1' },
        { id: 'r3', type: 'dislike', user_id: 'user-4', post_id: 'post-1' },
      ],
    })
    const { getAllByText } = render(
      <PostCard post={post} currentUserId="user-1" onReact={noop} onComment={noop} />
    )
    expect(getAllByText('3').length).toBeGreaterThan(0)
  })

  // RN-T17
  it("shows the user's reaction emoji instead of 🤍 when they have an active reaction", () => {
    const post = makePost({
      reactions: [{ id: 'r1', type: 'love', user_id: 'user-1', post_id: 'post-1' }],
    })
    const { getAllByText, queryByText } = render(
      <PostCard post={post} currentUserId="user-1" onReact={noop} onComment={noop} />
    )
    expect(getAllByText('❤️').length).toBeGreaterThan(0)
    expect(queryByText('🤍')).toBeNull()
  })

  // RN-T18
  it('shows comments section when the comment button is pressed', () => {
    const post = makePost({
      comments: [
        {
          id: 'c1', content: 'Great post!', post_id: 'post-1',
          author: { id: 'user-2', name: 'Bob', initials: 'BO', color: '#ef4444' },
        },
      ],
    })
    const { queryByText, getByText } = render(
      <PostCard post={post} currentUserId="user-1" onReact={noop} onComment={noop} />
    )
    expect(queryByText('Great post!')).toBeNull()
    fireEvent.press(getByText('1'))  // comment count button
    expect(getByText('Great post!')).toBeTruthy()
  })

  // RN-T19
  it('shows the reaction picker modal when the reaction button is pressed', () => {
    const { getByText, queryByText } = render(
      <PostCard post={makePost()} currentUserId="user-1" onReact={noop} onComment={noop} />
    )
    expect(queryByText('Like')).toBeNull()
    fireEvent.press(getByText('🤍'))
    expect(getByText('Like')).toBeTruthy()
    expect(getByText('Love')).toBeTruthy()
    expect(getByText('Dislike')).toBeTruthy()
  })
})
