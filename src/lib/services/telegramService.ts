/**
 * Telegram Notification Service for TexTech CMMS
 * Routes alerts to Unit 1, Unit 2, or Admin Telegram chats.
 */

export interface TelegramAlertPayload {
  unit?: string;
  category?: 'BREAKDOWN' | 'SLA_BREACH' | 'LOW_STOCK' | 'PPM_OVERDUE' | 'DISPATCH' | 'TEST' | 'RESOLVED' | 'PPM' | 'STARTED' | 'REJECTED';
  title: string;
  ticketId?: string;
  machineId?: string;
  machineName?: string;
  line?: string;
  zone?: string;
  issue?: string;
  actionTaken?: string;
  downtimeMinutes?: number;
  timeSpentMinutes?: number;
  startedAtTime?: string;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'WARNING';
  assignedTo?: string;
  details?: string;
  targetChatId?: string | number;
}

function formatDuration(minutes?: number): string {
  if (!minutes || minutes <= 0) return 'Few minutes';
  if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''}`;
  const hrs = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) return `${hrs} hr${hrs > 1 ? 's' : ''}`;
  return `${hrs} hr${hrs > 1 ? 's' : ''} ${remainingMins} min${remainingMins > 1 ? 's' : ''}`;
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

  if (payload.category === 'REJECTED') {
    return (
      `❌ <b>ISSUE REJECTED / DECLINED${unitTag}</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      (payload.ticketId ? `🎫 <b>Ticket ID:</b> <code>#${payload.ticketId}</code>\n` : '') +
      `🏷️ <b>Asset ID:</b> <code>${payload.machineId || 'N/A'}</code>\n` +
      (payload.machineName ? `⚙️ <b>Model:</b> ${payload.machineName}\n` : '') +
      `📍 <b>Location:</b> ${payload.zone || 'Floor'} • ${payload.line || 'Line'}\n` +
      `👨‍💼 <b>Rejected By:</b> <b>${payload.assignedTo || 'Supervisor'}</b>\n` +
      `📝 <b>Reason:</b> ${payload.actionTaken || payload.issue || 'False alarm / cancelled'}\n` +
      `⏱️ <b>Time:</b> ${time} (${date})\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `<i>Issue rejected & closed. Machine restored to ACTIVE service.</i>`
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
      (payload.ticketId ? `🎫 <b>Ticket ID:</b> <code>#${payload.ticketId}</code>\n` : '') +
      `🏷️ <b>Machine:</b> <code>${payload.machineId || 'N/A'}</code> ${payload.machineName ? `(${payload.machineName})` : ''}\n` +
      `📍 <b>Location:</b> ${payload.zone || 'Floor'} • ${payload.line || 'Line'}\n` +
      `🛠️ <b>Reported Fault:</b> ${payload.issue || 'Defect reported'}\n` +
      `⏱️ <b>Time Elapsed:</b> > 5 mins without technician assignment\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⚠️ <b>Supervisor Action: Immediate technician dispatch required!</b>`
    );
  }

  if (payload.category === 'STARTED') {
    return (
      `🛠️ <b>TECHNICIAN STARTED WORK${unitTag}</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      (payload.ticketId ? `🎫 <b>Ticket ID:</b> <code>#${payload.ticketId}</code>\n` : '') +
      `🏷️ <b>Asset ID:</b> <code>${payload.machineId || 'N/A'}</code>\n` +
      (payload.machineName ? `⚙️ <b>Model:</b> ${payload.machineName}\n` : '') +
      `📍 <b>Location:</b> ${payload.zone || 'Floor'} • ${payload.line || 'Line'}\n` +
      `👨‍🔧 <b>Attender / Technician:</b> <b>${payload.assignedTo || 'Technician'}</b>\n` +
      `⏱️ <b>Started At:</b> ${time} (${date})\n` +
      (payload.issue ? `⚠️ <b>Defect:</b> ${payload.issue}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `<i>Technician has commenced active maintenance on this machine.</i>`
    );
  }

  if (payload.category === 'RESOLVED') {
    const timeSpentMins = payload.timeSpentMinutes !== undefined ? payload.timeSpentMinutes : payload.downtimeMinutes;
    const timeSpentFormatted = formatDuration(timeSpentMins);
    const totalDowntimeFormatted = payload.downtimeMinutes ? formatDuration(payload.downtimeMinutes) : null;

    return (
      `✅ <b>ISSUE COMPLETED • RESTORED TO SERVICE${unitTag}</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      (payload.ticketId ? `🎫 <b>Ticket ID:</b> <code>#${payload.ticketId}</code>\n` : '') +
      `🏷️ <b>Asset ID:</b> <code>${payload.machineId || 'N/A'}</code>\n` +
      (payload.machineName ? `⚙️ <b>Model:</b> ${payload.machineName}\n` : '') +
      `📍 <b>Location:</b> ${payload.zone || 'Floor'} • ${payload.line || 'Line'}\n` +
      `👨‍🔧 <b>Completed By:</b> <b>${payload.assignedTo || 'Technician'}</b>\n` +
      `🔧 <b>Action Taken:</b> ${payload.actionTaken || payload.issue || 'Repair completed successfully'}\n` +
      `⏳ <b>Time Spent (Work Duration):</b> <b>${timeSpentFormatted}</b>\n` +
      (totalDowntimeFormatted && totalDowntimeFormatted !== timeSpentFormatted ? `⏱️ <b>Total Machine Downtime:</b> ${totalDowntimeFormatted}\n` : '') +
      (payload.startedAtTime ? `🕒 <b>Started:</b> ${payload.startedAtTime} ➔ <b>Completed:</b> ${time}\n` : `🏁 <b>Completed At:</b> ${time} (${date})\n`) +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `<i>Machine is verified active and returned to production floor.</i>`
    );
  }

  if (payload.category === 'PPM') {
    return (
      `🛠️ <b>PREVENTIVE MAINTENANCE (PPM) ALERT${unitTag}</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏷️ <b>Asset ID:</b> <code>${payload.machineId || 'N/A'}</code>\n` +
      `⚙️ <b>Task:</b> ${payload.title || 'Scheduled Service'}\n` +
      `📍 <b>Location:</b> ${payload.zone || 'Floor'} • ${payload.line || 'Line'}\n` +
      (payload.assignedTo ? `👨‍🔧 <b>Assigned Staff:</b> ${payload.assignedTo}\n` : '') +
      `⏱️ <b>Scheduled Time:</b> ${time} (${date})\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `<i>PPM checklist available on technician workstation.</i>`
    );
  }

  // Default: BREAKDOWN or DISPATCH alert (Issue created)
  const headerIcon = payload.severity === 'CRITICAL' ? '🚨' : '⚠️';
  const attenderDisplay = payload.assignedTo
    ? `<b>${payload.assignedTo}</b>`
    : `<i>Awaiting Attender Assignment</i>`;

  return (
    `${headerIcon} <b>NEW ISSUE REPORTED${unitTag}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    (payload.ticketId ? `🎫 <b>Ticket ID:</b> <code>#${payload.ticketId}</code>\n` : '') +
    `🏷️ <b>Asset ID:</b> <code>${payload.machineId || 'N/A'}</code>\n` +
    (payload.machineName ? `⚙️ <b>Model:</b> ${payload.machineName}\n` : '') +
    `📍 <b>Floor Location:</b> ${payload.zone || 'Floor'} • ${payload.line || 'Line'}\n` +
    `⚠️ <b>Problem:</b> ${payload.issue || payload.title}\n` +
    `⚡ <b>Urgency:</b> ${payload.severity || 'HIGH'}\n` +
    `👨‍🔧 <b>Attender:</b> ${attenderDisplay}\n` +
    `⏱️ <b>Reported At:</b> ${time} (${date})\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `<i>Broadcast to ${payload.unit || 'Unit'} maintenance team.</i>`
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
