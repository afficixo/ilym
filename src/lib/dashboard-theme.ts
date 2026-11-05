let themeTransitionTimer: number | undefined
let activePulseClass: string | undefined
let themeTransitionId = 0

type ThemeViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> }
}

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
  const transitionId = ++themeTransitionId
  if (activePulseClass) root.classList.remove(activePulseClass)
  activePulseClass = undefined

  const shouldAnimate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (shouldAnimate) {
    if (button.dataset.themeToggle === 'sidebar') {
      activePulseClass = 'theme-toggle-sidebar-pulse'
    } else if (button.dataset.themeToggle === 'header') {
      activePulseClass = 'theme-toggle-header-pulse'
    } else if (button.dataset.themeToggle === 'public-stats') {
      activePulseClass = 'theme-toggle-public-stats-pulse'
    }
    if (activePulseClass) root.classList.add(activePulseClass)
  }

  const updateTheme = () => {
    root.classList.toggle('dark', isDark)
    window.localStorage.setItem('theme', isDark ? 'dark' : 'light')
    syncBrowserThemeColor(isDark)
    window.dispatchEvent(new Event('themechange'))
  }
  const cleanup = () => {
    if (transitionId !== themeTransitionId) return
    root.classList.remove('theme-colors-transitioning')
    if (activePulseClass) root.classList.remove(activePulseClass)
    activePulseClass = undefined
    themeTransitionTimer = undefined
  }

  const viewTransitionDocument = document as ThemeViewTransitionDocument
  if (shouldAnimate && viewTransitionDocument.startViewTransition) {
    const transition = viewTransitionDocument.startViewTransition(updateTheme)
    void transition.finished.then(cleanup, cleanup)
    return
  }

  if (shouldAnimate) {
    root.classList.add('theme-colors-transitioning')
    void root.offsetWidth
  } else {
    root.classList.remove('theme-colors-transitioning')
  }
  updateTheme()

  if (shouldAnimate) {
    themeTransitionTimer = window.setTimeout(cleanup, 420)
  }
}
