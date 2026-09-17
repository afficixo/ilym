export type DashboardMetricClick = {
  isBot: boolean;
  country?: string | null;
  referrer?: string | null;
  deviceType?: string | null;
};

export function isUsNormalClick<T extends DashboardMetricClick>(click: T): boolean {
  if (click.isBot) return false;

  const isUsClick = (click.country || '').trim().toUpperCase() === 'US';
  if (!isUsClick) return true;

  return true;
}

export function filterDashboardClicks<T extends DashboardMetricClick>(
  clicks: T[],
  clickType?: string,
): T[] {
  if (clickType === 'bots') {
    return clicks.filter((click) => click.isBot);
  }

  return clicks.filter((click) => isUsNormalClick(click));
}

export function getBotClicksCount<T extends DashboardMetricClick>(clicks: T[]): number {
  return clicks.filter((click) => click.isBot).length;
}
