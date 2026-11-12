import { afterEach, describe, expect, it } from 'vitest'
import { loadSortOrder, saveSortOrder, sortContents } from '../sortContent'

const items = [
  { _id: '0001', title: 'banana', createdAt: '2026-01-01T00:00:00Z' },
  { _id: '0002', title: 'Apple', createdAt: '2026-03-01T00:00:00Z' },
  { _id: '0003', title: 'cherry', createdAt: '2026-02-01T00:00:00Z', isPinned: true },
  { _id: '0004', title: 'item 10', createdAt: '2026-02-15T00:00:00Z' },
  { _id: '0005', title: 'item 9', createdAt: '2026-02-15T00:00:00Z' },
]

const titles = (list: { title: string }[]) => list.map((item) => item.title)

afterEach(() => {
  localStorage.clear()
})

describe('sortContents', () => {
  it('puts pinned items first, then newest, with ties broken by id', () => {
    expect(titles(sortContents(items, 'newest'))).toEqual([
      'cherry', 'Apple', 'item 9', 'item 10', 'banana',
    ])
  })

  it('sorts oldest first after pinned items', () => {
    expect(titles(sortContents(items, 'oldest'))).toEqual([
      'cherry', 'banana', 'item 10', 'item 9', 'Apple',
    ])
  })

  it('sorts titles case-insensitively and with natural number order', () => {
    expect(titles(sortContents(items, 'title'))).toEqual([
      'cherry', 'Apple', 'banana', 'item 9', 'item 10',
    ])
  })

  it('treats a missing date as oldest', () => {
    const list = [
      { _id: 'a', title: 'no date' },
      { _id: 'b', title: 'dated', createdAt: '2026-01-01T00:00:00Z' },
    ]
    expect(titles(sortContents(list, 'newest'))).toEqual(['dated', 'no date'])
  })

  it('does not change the original array', () => {
    const copy = [...items]
    sortContents(items, 'title')
    expect(items).toEqual(copy)
  })
})

describe('remembered sort order', () => {
  it('defaults to newest and remembers a valid choice', () => {
    expect(loadSortOrder()).toBe('newest')
    saveSortOrder('title')
    expect(loadSortOrder()).toBe('title')
  })

  it('ignores an unknown saved value', () => {
    localStorage.setItem('contentSort', 'random')
    expect(loadSortOrder()).toBe('newest')
  })
})
