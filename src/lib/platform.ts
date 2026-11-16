export type Platform = 'mac' | 'other'

interface UADataNavigator extends Navigator {
  userAgentData?: { platform?: string }
}

export function detectPlatform(nav: Navigator = navigator): Platform {
  const p = (nav as UADataNavigator).userAgentData?.platform || nav.platform || nav.userAgent || ''
  return /mac|iphone|ipad|ipod/i.test(p) ? 'mac' : 'other'
}

let cached: Platform | null = null

export function platform(): Platform {
  return (cached ??= detectPlatform())
}
