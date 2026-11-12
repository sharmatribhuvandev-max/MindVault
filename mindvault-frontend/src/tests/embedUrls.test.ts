import { describe, expect, it } from 'vitest'
import {
  parseGitHubUrl,
  parseInstagramUrl,
  parseLinkedInUrl,
} from '../embedUrls'

describe('parseGitHubUrl', () => {
  it.each([
    ['https://github.com/facebook/react', { kind: 'repo', owner: 'facebook', repo: 'react' }],
    ['https://www.github.com/facebook/react/tree/main/packages', { kind: 'repo', owner: 'facebook', repo: 'react' }],
    ['https://github.com/vitejs/vite.git', { kind: 'repo', owner: 'vitejs', repo: 'vite' }],
    ['https://github.com/torvalds', { kind: 'user', owner: 'torvalds' }],
    ['https://github.com/topics/react', { kind: 'other' }],
    ['https://github.com/', { kind: 'other' }],
  ])('%s', (url, expected) => {
    expect(parseGitHubUrl(url)).toEqual(expected)
  })

  it('returns null for other sites', () => {
    expect(parseGitHubUrl('https://gitlab.com/a/b')).toBeNull()
    expect(parseGitHubUrl('not a url')).toBeNull()
  })
})

describe('parseInstagramUrl', () => {
  it.each([
    ['https://www.instagram.com/p/C1a2B3c4D5e/', 'C1a2B3c4D5e'],
    ['https://instagram.com/reel/Cx_Y-z9/?igsh=abc', 'Cx_Y-z9'],
    ['https://www.instagram.com/someone/p/ABC123/', 'ABC123'],
    ['https://www.instagram.com/tv/ABC123', 'ABC123'],
  ])('embeds %s', (url, code) => {
    expect(parseInstagramUrl(url)).toEqual({
      kind: 'post',
      embedUrl: `https://www.instagram.com/p/${code}/embed`,
    })
  })

  it('treats profiles as non-embeddable', () => {
    expect(parseInstagramUrl('https://www.instagram.com/someone/')).toEqual({ kind: 'other' })
  })

  it('returns null for other sites', () => {
    expect(parseInstagramUrl('https://example.com/p/ABC')).toBeNull()
  })
})

describe('parseLinkedInUrl', () => {
  const embed = (urn: string) => ({
    kind: 'post',
    embedUrl: `https://www.linkedin.com/embed/feed/update/${urn}`,
  })

  it.each([
    [
      'https://www.linkedin.com/posts/jane-doe_some-title-activity-7123456789012345678-AbCd',
      embed('urn:li:activity:7123456789012345678'),
    ],
    [
      'https://www.linkedin.com/feed/update/urn:li:activity:7123456789012345678/',
      embed('urn:li:activity:7123456789012345678'),
    ],
    [
      'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3A7000000000000000000',
      embed('urn:li:share:7000000000000000000'),
    ],
    [
      'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7111111111111111111',
      embed('urn:li:ugcPost:7111111111111111111'),
    ],
    ['https://in.linkedin.com/in/jane-doe', { kind: 'profile' }],
    ['https://www.linkedin.com/company/acme', { kind: 'company' }],
    ['https://www.linkedin.com/pulse/some-article', { kind: 'other' }],
  ])('%s', (url, expected) => {
    expect(parseLinkedInUrl(url)).toEqual(expected)
  })

  it('returns null for other sites', () => {
    expect(parseLinkedInUrl('https://notlinkedin.com/in/x')).toBeNull()
  })
})
