/**
 * Telegram Notification Service for TexTech CMMS
 * Routes alerts to Unit 1, Unit 2, or Admin Telegram chats.
 */

export interface TelegramAlertPayload {
  unit?: string;
  category?: 'BREAKDOWN' | 'SLA_BREACH' | 'LOW_STOCK' | 'PPM_OVERDUE' | 'DISPATCH' | 'TEST';
  title: string;
  machineId?: string;
  machineName?: string;
  line?: string;
  zone?: string;
  issue?: string;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'WARNING';
  assignedTo?: string;
  details?: string;
  targetChatId?: string | number;
}

/**
 * Format markdown/HTML payload for Telegram sendMessage API
 */
export function buildTelegramMessage(payload: TelegramAlertPayload): string {
  const time = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const date = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const unitTag = payload.unit ? ` [${payload.unit.toUpperCase()}]` : '';

  if (payload.category === 'TEST') {
    return (
      `🔔 <b>TexTech CMMS • Telegram Notification Active</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏢 <b>Unit:</b> ${payload.unit || 'UNIT - 1'}\n` +
      `✅ <b>Status:</b> Bot successfully connected and verified\n` +
      `⏱️ <b>Timestamp:</b> ${date} at ${time}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `<i>Real-time machine breakdown & maintenance alerts will be delivered here automatically.</i>`
    );
  }

  if (payload.category === 'LOW_STOCK') {
    return (
      `📦 <b>SPARE PART STOCK ALERT${unitTag}</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏷️ <b>Part:</b> ${payload.machineName || payload.title}\n` +
      `⚠️ <b>Alert:</b> ${payload.issue || payload.details || 'Stock level below safety threshold'}\n` +
      `🏢 <b>Unit:</b> ${payload.unit || 'UNIT - 1'}\n` +
      `⏱️ <b>Time:</b> ${time} (${date})\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `<i>Please generate indent for inventory replenishment.</i>`
    );
  }

  if (payload.category === 'SLA_BREACH') {
    return (
      `🚨 <b>CRITICAL: 5-MIN SLA BREACH${unitTag}</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⚠️ <b>Alert:</b> Machine Breakdown Unattended > 5 Mins\n` +
      `🏷️ <b>Machine:</b> <code>${payload.machineId || 'N/A'}</code> ${payload.machineName ? `(${payload.machineName})` : ''}\n` +
      `📍 <b>Location:</b> ${payload.zone || 'Floor'} • ${payload.line || 'Line'}\n` +
      `🛠️ <b>Reported Fault:</b> ${payload.issue || 'Defect reported'}\n` +
      `⏱️ <b>Time Elapsed:</b> > 5 mins without technician assignment\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⚠️ <b>Supervisor Action: Immediate technician dispatch required!</b>`
    );
  }

  // Default: BREAKDOWN or DISPATCH alert
  const headerIcon = payload.severity === 'CRITICAL' ? '🚨' : '⚠️';
  return (
    `${headerIcon} <b>MACHINE DEFECT / BREAKDOWN${unitTag}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🏷️ <b>Asset ID:</b> <code>${payload.machineId || 'N/A'}</code>\n` +
    (payload.machineName ? `⚙️ <b>Model:</b> ${payload.machineName}\n` : '') +
    `📍 <b>Floor Location:</b> ${payload.zone || 'Floor'} • ${payload.line || 'Line'}\n` +
    `⚠️ <b>Problem:</b> ${payload.issue || payload.title}\n` +
    `⚡ <b>Urgency:</b> ${payload.severity || 'HIGH'}\n` +
    (payload.assignedTo ? `👨‍🔧 <b>Assigned Tech:</b> ${payload.assignedTo}\n` : `👨‍🔧 <b>Status:</b> Awaiting Technician Response\n`) +
    `⏱️ <b>Reported At:</b> ${time} (${date})\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `<i>Access CMMS Dashboard for live ticket tracking.</i>`
  );
}

/**
 * Dispatch Telegram message via Bot API with automatic chat ID resolution & fallback.
 */
export async function sendTelegramAlert(
  payload: TelegramAlertPayload,
  customBotToken?: string
): Promise<{ success: boolean; error?: string; messageId?: number }> {
  const botToken = customBotToken || process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return {
      success: false,
      error: 'TELEGRAM_BOT_TOKEN is not configured in .env.local or settings',
    };
  }

  // Resolve chat ID based on Unit or target
  let targetChatId = payload.targetChatId;

  if (!targetChatId) {
    const unitUpper = (payload.unit || '').toUpperCase();
    if (unitUpper.includes('UNIT-2') || unitUpper.includes('UNIT 2')) {
      targetChatId = process.env.TELEGRAM_CHAT_ID_UNIT2 || '-5371815915';
    } else {
      // Default to Unit 1
      targetChatId = process.env.TELEGRAM_CHAT_ID_UNIT1 || '-5302045233';
    }
  }

  const messageText = buildTelegramMessage(payload);

  // Try sending to the targetChatId. If it fails and looks like standard group, also try with -100 prefix.
  const chatCandidates: (string | number)[] = [targetChatId];
  const strId = String(targetChatId);
  if (strId.startsWith('-') && !strId.startsWith('-100')) {
    chatCandidates.push(`-100${strId.slice(1)}`);
  }

  let lastError = '';

  for (const chatId of chatCandidates) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        return { success: true, messageId: data.result?.message_id };
      }
      lastError = data.description || 'Unknown Telegram API error';
    } catch (err: any) {
      lastError = err.message || 'Network request to Telegram failed';
    }
  }

  return { success: false, error: lastError };
}
