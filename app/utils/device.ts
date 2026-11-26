/**
 * Parses User-Agent header string to identify Device Category
 */
export function getDeviceType(userAgent?: string | null): string {
  if (!userAgent) return 'Desktop';
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('iphone') || (ua.includes('android') && ua.includes('mobile'))) {
    return 'Mobile';
  }
  if (ua.includes('ipad') || ua.includes('tablet')) {
    return 'Tablet';
  }
  if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider')) {
    return 'Bot';
  }
  return 'Desktop';
}

/**
 * Returns Iconify Heroicon string matching device category
 */
export function getDeviceIcon(device: string): string {
  switch (device) {
    case 'Mobile':
      return 'i-heroicons-device-phone-mobile';
    case 'Tablet':
      return 'i-heroicons-device-tablet';
    case 'Bot':
      return 'i-heroicons-command-line';
    default:
      return 'i-heroicons-computer-desktop';
  }
}
