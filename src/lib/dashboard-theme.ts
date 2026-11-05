let themeTransitionTimer: number | undefined
let activePulseClass: string | undefined

export function syncBrowserThemeColor(isDark: boolean) {
  const isDarkPage = document.querySelector('.public-site, .auth-site') !== null
  const color = isDarkPage ? '#071014' : isDark ? '#1d282b' : '#eef2f7'
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    if (meta.content !== color) meta.setAttribute('content', color)
  })
}

export function applyDashboardTheme(isDark: boolean, button: HTMLButtonElement) {
  const root = document.documentElement

  if (themeTransitionTimer) {
    window.clearTimeout(themeTransitionTimer)
    themeTransitionTimer = undefined
  }
  if (activePulseClass) root.classList.remove(activePulseClass)
  activePulseClass = undefined

  const shouldAnimate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (shouldAnimate) {
    root.classList.add('theme-colors-transitioning')
    activePulseClass = button.dataset.themeToggle === 'sidebar'
      ? 'theme-toggle-sidebar-pulse'
      : 'theme-toggle-header-pulse'
    root.classList.add(activePulseClass)
    void root.offsetWidth
  } else {
    root.classList.remove('theme-colors-transitioning')
  }

  root.classList.toggle('dark', isDark)
  window.localStorage.setItem('theme', isDark ? 'dark' : 'light')
  syncBrowserThemeColor(isDark)
  window.dispatchEvent(new Event('themechange'))

  if (shouldAnimate) {
    themeTransitionTimer = window.setTimeout(() => {
      root.classList.remove('theme-colors-transitioning')
      if (activePulseClass) root.classList.remove(activePulseClass)
      activePulseClass = undefined
      themeTransitionTimer = undefined
    }, 400)
  }
}
