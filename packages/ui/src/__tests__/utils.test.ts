import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('cn utility', () => {
  it('merges Tailwind classes', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('handles conditional classes', () => {
    expect(cn('base', true && 'conditional')).toBe('base conditional')
    expect(cn('base', false && 'conditional')).toBe('base')
  })

  it('handles arrays', () => {
    expect(cn(['class1', 'class2'])).toBe('class1 class2')
  })

  it('filters falsy values', () => {
    expect(cn('base', false, null, undefined, 'valid')).toBe('base valid')
  })

  it('handles empty input', () => {
    expect(cn()).toBe('')
  })

  it('handles single class', () => {
    expect(cn('single-class')).toBe('single-class')
  })

  it('handles nested arrays', () => {
    expect(cn('base', ['array1', ['array2', 'array3']])).toBe('base array1 array2 array3')
  })

  it('handles object-style conditional classes', () => {
    expect(cn('base', { 'conditional-true': true, 'conditional-false': false })).toBe('base conditional-true')
  })

  it('handles mixed input types', () => {
    expect(cn('string', ['array'], { object: true }, null, undefined, false && 'falsy')).toBe('string array object')
  })

  it('deduplicates conflicting Tailwind classes', () => {
    expect(cn('text-sm text-red-500', 'text-lg')).toBe('text-red-500 text-lg')
    expect(cn('p-4 m-2', 'p-2')).toBe('m-2 p-2')
  })

  it('handles whitespace-only strings', () => {
    expect(cn('  class1  ', '  class2  ')).toBe('class1 class2')
  })
})
