import type { Context } from 'hono';
import { getCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { visitorAnalytics, customEvents } from '../db/schema/visitor_analytics';
import { users } from '../db/schema/users';
import { pushSubscriptions } from '../db/schema/push_subscriptions';
import { getClientIp } from './audit';
import { decryptToken } from '../utils/crypto';
import { sendTelegramNotification } from './notification';
import { setLatestBroadcastPayload } from '../controllers/push.controller';
import type { AudienceAnalysis, TrackCustomEvent } from '@restaurant-menu/shared';


export interface VisitorInfo {
  path: string;
  domain?: string;
  referrer?: string;
  ipAddress?: string;
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  isp?: string;
  device: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown' | string;
  os: string;
  brand: string;
  browser: string;
  connectionType: string;
  latitude?: string;
  longitude?: string;
  locationSource?: 'gps' | 'ip' | 'unknown';
  userAgent: string;
  createdAt?: Date | string;
}

/**
 * Validates whether latitude (-90..90) and longitude (-180..180) strings are valid non-zero numbers
 */
export function isValidCoordinate(latStr?: string, lngStr?: string): boolean {
  if (!latStr || !lngStr) return false;
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat === 0 && lng === 0) return false; // Reject Null Island (0,0)
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  KH: 'Cambodia',
  JP: 'Japan',
  SG: 'Singapore',
  TH: 'Thailand',
  VN: 'Vietnam',
  CN: 'China',
  DE: 'Germany',
  GB: 'United Kingdom',
  FR: 'France',
  AU: 'Australia',
  CA: 'Canada',
  IN: 'India',
  KR: 'South Korea',
  BR: 'Brazil',
  ID: 'Indonesia',
  MY: 'Malaysia',
  PH: 'Philippines',
};

/**
 * Parses User-Agent header to extract detailed OS, Browser, Device Type, and Brand
 */
export function parseUserAgentDetails(ua: string) {
  if (!ua) {
    return {
      device: 'DESKTOP',
      os: 'Unknown OS',
      brand: 'Unknown',
      browser: 'Unknown Browser',
      deviceTypeEnum: 'desktop' as const,
    };
  }

  const uaLower = ua.toLowerCase();

  // 1. Bot Detection
  if (uaLower.includes('bot') || uaLower.includes('crawler') || uaLower.includes('spider') || uaLower.includes('slurp')) {
    let botName = 'Bot';
    if (uaLower.includes('googlebot')) botName = 'Googlebot';
    else if (uaLower.includes('bingbot')) botName = 'Bingbot';
    else if (uaLower.includes('gptbot')) botName = 'GPTBot';
    return {
      device: 'BOT',
      os: 'Bot',
      brand: 'Search Engine',
      browser: botName,
      deviceTypeEnum: 'bot' as const,
    };
  }

  // 2. Brand Detection
  let brand = 'Unknown';
  if (uaLower.includes('iphone') || uaLower.includes('ipad') || uaLower.includes('ipod') || uaLower.includes('macintosh')) {
    brand = 'Apple';
  } else if (uaLower.includes('samsung')) {
    brand = 'Samsung';
  } else if (uaLower.includes('pixel')) {
    brand = 'Google';
  } else if (uaLower.includes('xiaomi') || uaLower.includes('mi ')) {
    brand = 'Xiaomi';
  } else if (uaLower.includes('huawei')) {
    brand = 'Huawei';
  }

  // 3. OS Detection
  let os = 'Unknown OS';
  if (uaLower.includes('windows nt 10.0')) {
    os = 'Windows 10';
  } else if (uaLower.includes('windows nt 11.0')) {
    os = 'Windows 11';
  } else if (uaLower.includes('windows')) {
    os = 'Windows';
  } else if (uaLower.includes('iphone os') || uaLower.includes('cpu iphone os')) {
    const match = ua.match(/OS (\d+[_.\d]+)/i);
    os = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS';
  } else if (uaLower.includes('mac os x')) {
    const match = ua.match(/Mac OS X (\d+[_.\d]+)/i);
    os = match ? `macOS ${match[1].replace(/_/g, '.')}` : 'macOS';
  } else if (uaLower.includes('android')) {
    const match = ua.match(/Android (\d+[\.\d]*)/i);
    os = match ? `Android ${match[1]}` : 'Android';
  } else if (uaLower.includes('linux')) {
    os = 'Linux';
  }

  // 4. Device Type Detection
  let device = 'DESKTOP';
  let deviceTypeEnum: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown' = 'desktop';
  if (uaLower.includes('ipad') || uaLower.includes('tablet')) {
    device = 'TABLET';
    deviceTypeEnum = 'tablet';
  } else if (uaLower.includes('mobile') || uaLower.includes('iphone') || (uaLower.includes('android') && !uaLower.includes('tablet'))) {
    device = 'MOBILE';
    deviceTypeEnum = 'mobile';
  }

  // 5. Browser & Version Detection
  let browser = 'Unknown Browser';
  if (uaLower.includes('edg/')) {
    const match = ua.match(/Edg\/([\d\.]+)/i);
    browser = match ? `Edge ${match[1]}` : 'Edge';
  } else if (uaLower.includes('chrome/') && !uaLower.includes('edg/')) {
    const match = ua.match(/Chrome\/([\d\.]+)/i);
    browser = match ? `Chrome ${match[1]}` : 'Chrome';
  } else if (uaLower.includes('safari/') && !uaLower.includes('chrome/')) {
    const match = ua.match(/Version\/([\d\.]+)/i) || ua.match(/Safari\/([\d\.]+)/i);
    browser = match ? `Safari ${match[1]}` : 'Safari';
  } else if (uaLower.includes('firefox/')) {
    const match = ua.match(/Firefox\/([\d\.]+)/i);
    browser = match ? `Firefox ${match[1]}` : 'Firefox';
  } else if (uaLower.includes('opr/') || uaLower.includes('opera/')) {
    const match = ua.match(/OPR\/([\d\.]+)/i) || ua.match(/Opera\/([\d\.]+)/i);
    browser = match ? `Opera ${match[1]}` : 'Opera';
  }

  return { device, os, brand, browser, deviceTypeEnum };
}

/**
 * Backward-compatible parseUserAgent helper
 */
export function parseUserAgent(ua: string) {
  const details = parseUserAgentDetails(ua);
  return {
    device: details.deviceTypeEnum,
    os: details.os,
    browser: details.browser,
  };
}

/**
 * Detects Connection Type (Datacenter/VPN, Mobile Data, Broadband/ISP)
 */
export function detectConnectionType(isp: string): string {
  if (!isp) return '🖥️ Datacenter/VPN';
  const ispLower = isp.toLowerCase();

  const datacenterKeywords = [
    'google', 'amazon', 'aws', 'cloudflare', 'digitalocean', 'linode', 'hetzner',
    'ovh', 'microsoft', 'azure', 'datacenter', 'hosting', 'vpn', 'vultr', 'fastly',
    'oracle', 'alibaba', 'tencent', 'scaleway', 'contabo'
  ];

  if (datacenterKeywords.some(kw => ispLower.includes(kw))) {
    return '🖥️ Datacenter/VPN';
  }

  const mobileKeywords = ['mobile', 'cell', 'cellular', 'wireless', '4g', '5g', 'lte', 'telecom', 'metfone', 'cellcard', 'smart axiata'];
  if (mobileKeywords.some(kw => ispLower.includes(kw))) {
    return '📡 Mobile Data';
  }

  return '🌐 Broadband / ISP';
}

/**
 * Formats a VisitorInfo or DB hit into exact Audience Analysis structured output
 */
export function formatAudienceAnalysis(info: Partial<VisitorInfo> & { createdAt?: Date | string }): AudienceAnalysis {
  const device = info.device ? String(info.device).toUpperCase() : 'DESKTOP';
  const os = info.os || 'Unknown OS';
  const brand = info.brand || 'Unknown';
  const browser = info.browser || 'Unknown Browser';
  const ipAddress = info.ipAddress || '127.0.0.1';
  const connection = info.connectionType || detectConnectionType(info.isp || '');
  const isp = info.isp || 'Unknown ISP';

  const countryCode = info.country ? info.country.toUpperCase() : undefined;
  const countryName = countryCode ? (COUNTRY_NAMES[countryCode] || countryCode) : 'Unknown';
  const region = info.region || '';
  const city = info.city || '';

  const locationParts = [city, region, countryName].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join(', ') : 'Unknown';
  const coordinates = (info.latitude && info.longitude)
    ? `${info.latitude}, ${info.longitude}`
    : 'Not available';

  const dateObj = info.createdAt ? new Date(info.createdAt) : new Date();
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');
  const formattedTime = `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;

  return {
    device: `📱 Device: ${device}`,
    os: `🖥️ OS: ${os}`,
    brand: `🏷️ Brand: ${brand}`,
    browser: `🌐 Browser: ${browser}`,
    ipAddress: `🔹 IP Address: ${ipAddress}`,
    connection: `📡 Connection: ${connection}`,
    isp: `🏢 ISP: ${isp}`,
    location: `📍 Location: ${location}`,
    coordinates: `📌 Coordinates: ${coordinates}`,
    time: `⏰ Time: ${formattedTime}`,
    raw: {
      device,
      os,
      brand,
      browser,
      ipAddress,
      connectionType: connection,
      isp,
      country: countryCode || null,
      countryName,
      region: region || null,
      city: city || null,
      latitude: info.latitude,
      longitude: info.longitude,
      locationSource: info.locationSource || 'unknown',
      userAgent: info.userAgent || '',
      createdAt: info.createdAt,
    },
  };
}

/**
 * Extracts Cloudflare Edge Geo-Location, Coordinates, Connection & Device metrics
 */
export function extractVisitorDetails(c: Context, customPath?: string): VisitorInfo {
  const ua = c.req.header('user-agent') || '';
  const parsedUa = parseUserAgentDetails(ua);
  const ipAddress = getClientIp(c);

  // Cloudflare Edge Geo Location metadata with Client-Granted GPS Override
  const cf = (c.req.raw as any).cf || {};
  const country = cf.country || c.req.header('cf-ipcountry') || undefined;
  const region = cf.region || cf.regionCode || undefined;
  const city = cf.city || undefined;
  const timezone = cf.timezone || undefined;
  const isp = cf.asOrganization || (cf.asn ? `ASN ${cf.asn}` : undefined);

  const clientLat = c.req.header('x-user-latitude');
  const clientLng = c.req.header('x-user-longitude');

  let latitude: string | undefined;
  let longitude: string | undefined;
  let locationSource: 'gps' | 'ip' | 'unknown' = 'unknown';

  if (isValidCoordinate(clientLat, clientLng)) {
    latitude = clientLat;
    longitude = clientLng;
    locationSource = 'gps';
  } else if (country && country.trim() !== '') {
    latitude = undefined;
    longitude = undefined;
    locationSource = 'ip';
  } else {
    latitude = undefined;
    longitude = undefined;
    locationSource = 'unknown';
  }

  const connectionType = detectConnectionType(isp || '');

  const url = new URL(c.req.url);
  const domain = c.req.header('host') || url.hostname;
  const referrer = c.req.header('referer') || c.req.header('referrer') || 'Direct';
  const path = customPath || url.pathname;

  return {
    path,
    domain,
    referrer,
    ipAddress,
    country,
    region,
    city,
    timezone,
    isp,
    device: parsedUa.device,
    os: parsedUa.os,
    brand: parsedUa.brand,
    browser: parsedUa.browser,
    connectionType,
    latitude,
    longitude,
    locationSource,
    userAgent: ua,
  };
}

/**
 * Checks if the request comes from an authenticated user with the super_admin role
 */
export async function isSuperAdminRequest(c: Context): Promise<boolean> {
  const jwtSecret = (c.env as any)?.JWT_SECRET;
  if (!jwtSecret) return false;

  let token = getCookie(c, 'auth_token');
  if (!token) {
    const authHeader = c.req.header('authorization') || c.req.header('Authorization');
    const customHeader = c.req.header('x-super-admin-token');
    token = customHeader;
    if (!token && authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) return false;

  try {
    const rawJwtToken = await decryptToken(token, jwtSecret);
    const payload = (await verify(rawJwtToken, jwtSecret, 'HS256')) as any;
    if (!payload?.id) return false;

    // Fast payload role check
    if (payload.role === 'super_admin') return true;

    // Database verification for source of truth
    const d1 = (c.env as any)?.DB;
    if (d1) {
      const db = getDb(d1);
      const user = await db
        .select({ role: users.role, status: users.status })
        .from(users)
        .where(eq(users.id, payload.id))
        .get();
      if (user && user.status === 'active' && user.role === 'super_admin') {
        return true;
      }
    }
  } catch {
    // Token invalid or expired
  }

  return false;
}

const visitorNotificationCache = new Map<string, number>();

/**
 * Dispatches Web Push & Telegram notifications specifically targeting Super Admins when a visitor views the website
 */
export async function notifySuperAdminsVisitorHit(d1: D1Database, c: Context, info: VisitorInfo) {
  try {
    const cacheKey = `${info.ipAddress || 'unknown'}_${info.path}`;
    const now = Date.now();
    const lastSent = visitorNotificationCache.get(cacheKey);

    // Throttle duplicate notifications for the exact same IP and path to once per 60 seconds
    if (lastSent && now - lastSent < 60000) {
      return;
    }
    visitorNotificationCache.set(cacheKey, now);

    // Clean old cache entries
    if (visitorNotificationCache.size > 500) {
      for (const [key, timestamp] of visitorNotificationCache.entries()) {
        if (now - timestamp > 60000) {
          visitorNotificationCache.delete(key);
        }
      }
    }

    const db = getDb(d1);
    const countryName = info.country ? (COUNTRY_NAMES[info.country.toUpperCase()] || info.country) : undefined;
    const locationParts = [info.city, info.region, countryName].filter(Boolean);
    const locationStr = locationParts.length > 0 ? locationParts.join(', ') : 'Unknown Location';

    const deviceStr = (info.device || 'Desktop').toUpperCase();
    const browserStr = info.browser || 'Browser';
    const pathStr = info.path || '/';

    const title = `👀 New Website Visitor!`;
    const message = `Visitor from ${locationStr} (${deviceStr} / ${browserStr}) opened page ${pathStr}`;

    // 1. Update latest broadcast payload in memory for live admin client listeners
    const broadcastItem = {
      id: crypto.randomUUID(),
      title,
      message,
      url: pathStr,
      timestamp: new Date().toISOString(),
    };
    setLatestBroadcastPayload(broadcastItem);

    // 2. Query Super Admin user IDs from D1
    const superAdminsList = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'super_admin'))
      .all();
    const superAdminIds = new Set(superAdminsList.map((u) => u.id));

    // 3. Dispatch Web Push notification to Super Admin devices
    const subscriptions = await db.select().from(pushSubscriptions).all();
    const targetSubs = subscriptions.filter(
      (sub) => !sub.userId || superAdminIds.has(sub.userId)
    );

    for (const sub of targetSubs) {
      try {
        await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'TTL': '86400',
          },
          body: JSON.stringify({
            title,
            body: message,
            message,
            url: pathStr,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch {
        // Skip endpoint errors
      }
    }

    // 4. Send Telegram Notification if enabled
    const telegramHtml = `<b>${title}</b>\n${message}\n\n📍 <b>IP:</b> ${info.ipAddress || '127.0.0.1'}\n⏱ <b>Time:</b> ${new Date().toLocaleString()}`;
    await sendTelegramNotification(d1, telegramHtml);
  } catch (err) {
    console.error('Failed to notify super admins of visitor hit:', err);
  }
}

/**
 * Persists a visitor hit into Cloudflare D1
 */
export async function trackVisitorHit(d1: D1Database | undefined, c: Context, customPath?: string) {
  if (!d1) return;

  // Skip pageview tracking for super_admin role
  const isSuperAdmin = await isSuperAdminRequest(c);
  if (isSuperAdmin) return;

  try {
    const db = getDb(d1);
    const info = extractVisitorDetails(c, customPath);

    await db.insert(visitorAnalytics).values({
      id: crypto.randomUUID(),
      path: info.path,
      domain: info.domain,
      referrer: info.referrer,
      ipAddress: info.ipAddress,
      country: info.country,
      region: info.region,
      city: info.city,
      timezone: info.timezone,
      isp: info.isp,
      device: info.device.toLowerCase() as any,
      os: info.os,
      browser: info.browser,
      brand: info.brand,
      connectionType: info.connectionType,
      latitude: info.latitude,
      longitude: info.longitude,
      locationSource: info.locationSource,
      userAgent: info.userAgent,
      createdAt: new Date(),
    });

    // Send Web Push & Telegram notification to Super Admin devices
    await notifySuperAdminsVisitorHit(d1, c, info);
  } catch (err) {
    console.error('Failed to track visitor analytics:', err);
  }
}


/**
 * Persists a custom user interaction event into Cloudflare D1
 */
export async function trackCustomEventHit(
  d1: D1Database | undefined,
  c: Context,
  payload: TrackCustomEvent
) {
  if (!d1) return;

  // Skip custom event tracking for super_admin role
  const isSuperAdmin = await isSuperAdminRequest(c);
  if (isSuperAdmin) return;

  try {
    const db = getDb(d1);
    const path = payload.path || new URL(c.req.url).pathname;

    await db.insert(customEvents).values({
      id: crypto.randomUUID(),
      sessionId: payload.sessionId || null,
      userId: (c.get('userId') as string) || null,
      eventName: payload.eventName,
      eventCategory: payload.eventCategory || null,
      eventLabel: payload.eventLabel || null,
      eventValue: payload.eventValue !== undefined ? payload.eventValue : null,
      path,
      metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('Failed to track custom event:', err);
  }
}
