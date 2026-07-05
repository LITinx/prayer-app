import type { Category } from '../store/types'

export function categorize(text: string): Category {
  const t = text.toLowerCase()
  if (/chemo|surgery|health|sick|hospital|test|recover|anx|heal/.test(t)) return 'Health'
  if (/thank|grateful|praise|answered|joy/.test(t)) return 'Gratitude'
  if (/job|money|visa|provi|financ|bill|home|apart/.test(t)) return 'Provision'
  if (/mom|dad|family|marriage|brother|sister|kids|son|daughter/.test(t)) return 'Family'
  if (/friend/.test(t)) return 'Friends'
  return 'Guidance'
}
