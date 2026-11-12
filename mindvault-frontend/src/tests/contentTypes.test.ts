import { describe, expect, it } from 'vitest'
import {
  detectContentType,
  getDisplayDomain,
  requiresLink,
} from '../contentTypes'

describe('detectContentType', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube'],
    ['https://youtu.be/dQw4w9WgXcQ', 'youtube'],
    ['https://m.youtube.com/shorts/abc', 'youtube'],
    ['https://twitter.com/user/status/1', 'twitter'],
    ['https://x.com/user', 'twitter'],
    ['  https://X.com/user  ', 'twitter'],
    ['https://medium.com/@a/post', 'article'],
    ['http://example.org', 'article'],
    ['https://github.com/facebook/react', 'github'],
    ['https://www.instagram.com/p/ABC123/', 'instagram'],
    ['https://www.linkedin.com/in/someone', 'linkedin'],
    ['https://in.linkedin.com/in/someone', 'linkedin'],
    ['https://lnkd.in/abc', 'linkedin'],
  ])('%s -> %s', (url, expected) => {
    expect(detectContentType(url)).toBe(expected)
  })

  it.each([
    [''],
    ['not a url'],
    ['https://'],
    ['https://localhost'],
    ['ftp://example.com/file'],
    ['javascript:alert(1)'],
  ])('returns null for %j', (value) => {
    expect(detectContentType(value)).toBeNull()
  })

  it('does not treat look-alike hosts as YouTube', () => {
    expect(detectContentType('https://notyoutube.com/watch?v=x')).toBe('article')
    expect(detectContentType('https://evil-linkedin.com/in/x')).toBe('article')
  })
})

describe('getDisplayDomain', () => {
  it('strips www and the path', () => {
    expect(getDisplayDomain('https://www.example.com/a/b?c=d')).toBe('example.com')
  })

  it('returns null for invalid URLs', () => {
    expect(getDisplayDomain('nope')).toBeNull()
  })
})

describe('requiresLink', () => {
  it('only notes may skip the link', () => {
    expect(requiresLink('note')).toBe(false)
    expect(requiresLink('article')).toBe(true)
    expect(requiresLink('youtube')).toBe(true)
  })
})
