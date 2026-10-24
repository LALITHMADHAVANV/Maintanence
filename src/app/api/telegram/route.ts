import { NextResponse } from 'next/server';
import { sendTelegramAlert, TelegramAlertPayload } from '@/lib/services/telegramService';

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN || '';
  const isConfigured = Boolean(token);
  return NextResponse.json({
    success: true,
    configured: isConfigured,
    botToken: token,
    botUsername: 'Assetmbot',
    unit1ChatId: process.env.TELEGRAM_CHAT_ID_UNIT1 || '-5302045233',
    unit2ChatId: process.env.TELEGRAM_CHAT_ID_UNIT2 || '-5371815915',
    adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID || '8853985508',
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, payload, botToken }: { action?: string; payload?: TelegramAlertPayload; botToken?: string } = body;

    if (action === 'TEST' || payload?.category === 'TEST') {
      const testPayload: TelegramAlertPayload = {
        category: 'TEST',
        unit: payload?.unit || 'UNIT - 1',
        title: 'Telegram Test Notification',
        targetChatId: payload?.targetChatId,
      };

      const result = await sendTelegramAlert(testPayload, botToken);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'Test message sent to Telegram successfully!',
        messageId: result.messageId,
      });
    }

    if (!payload) {
      return NextResponse.json({ success: false, error: 'Alert payload is required' }, { status: 400 });
    }

    const result = await sendTelegramAlert(payload, botToken);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (err: any) {
    console.error('Error in /api/telegram:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
