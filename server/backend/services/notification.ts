import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { siteSettings } from '../db/schema';

/**
 * Service to send Telegram notifications using configured Telegram Token & Group ID
 */
export async function sendTelegramNotification(
  d1: D1Database,
  message: string,
  overrides?: { token?: string; groupId?: string; ignoreEnabled?: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getDb(d1);
    const config = await db.select().from(siteSettings).where(eq(siteSettings.id, 'default')).get();

    const token = (overrides?.token || config?.telegramToken || '').trim();
    const groupId = (overrides?.groupId || config?.telegramGroupId || '').trim();
    const isEnabled = overrides?.ignoreEnabled ? true : Boolean(config?.telegramEnabled);

    if (!isEnabled) {
      return { success: false, error: 'Telegram integration is disabled in site_settings. Please enable Telegram Integration switch in Settings.' };
    }

    if (!token || !groupId) {
      return { success: false, error: 'Telegram Bot Token or Group ID is missing. Please configure both Telegram Token and Group ID in Settings.' };
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: groupId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `Telegram API error: ${errText}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to send Telegram notification' };
  }
}

/**
 * Service to send emails using configured Resend API Key & Mail From settings
 */
export async function sendResendEmail(
  d1: D1Database,
  params: { to: string; subject: string; html: string },
  overrides?: { apiKey?: string; mailFrom?: string; mailFromName?: string; ignoreEnabled?: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getDb(d1);
    const config = await db.select().from(siteSettings).where(eq(siteSettings.id, 'default')).get();

    const apiKey = overrides?.apiKey || config?.resendApiKey;
    const mailFrom = overrides?.mailFrom || config?.mailFrom;
    const mailFromName = overrides?.mailFromName || config?.mailFromName || 'System Notification';
    const isEnabled = overrides?.ignoreEnabled ? true : Boolean(config?.resendEnabled);

    if (!isEnabled) {
      return { success: false, error: 'Resend email integration is disabled in site_settings. Please enable Resend Email Integration switch in Settings.' };
    }

    if (!apiKey || !mailFrom) {
      return { success: false, error: 'Resend API Key or Sender Mail Address is missing. Please configure both Resend API Key and Mail From in Settings.' };
    }

    const fromAddress = `${mailFromName} <${mailFrom}>`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `Resend API error: ${errText}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to send Resend email' };
  }
}
