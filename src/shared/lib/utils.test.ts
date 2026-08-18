import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('merges conflicting Tailwind classes to the last value', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('filters out falsy conditional classes', () => {
    const isActive = false
    expect(cn('btn', isActive && 'btn-active', 'btn-primary')).toBe('btn btn-primary')
  })

  it('returns an empty string when given no inputs', () => {
    expect(cn()).toBe('')
  })
})
