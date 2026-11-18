import { NextResponse } from 'next/server';
import { getDatabase, TenantError } from '@/lib/mongodb';
import { sendTelegramAlert } from '@/lib/services/telegramService';

function failure(error: unknown) {
  return NextResponse.json({ success: false, error: error instanceof TenantError ? error.message : 'Telegram request failed.' }, { status: error instanceof TenantError ? error.statusCode : 500 });
}
export async function GET(req: Request) {
  try {
    const db = await getDatabase(req);
    if (!['ADMIN','ASSET_MANAGER'].includes(String(db.sessionUser?.role).toUpperCase())) throw new TenantError('Administrator access required.',403);
    const config = await db.collection('settings').findOne({ key: 'telegram' });
    const prefix = db.tenant.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    return NextResponse.json({ success: true, configured: Boolean(config?.botToken || process.env[`${prefix}_TELEGRAM_BOT_TOKEN`]), botToken: '', unit1ChatId: config?.unit1ChatId || process.env[`${prefix}_TELEGRAM_CHAT_ID_UNIT1`] || '', unit2ChatId: config?.unit2ChatId || process.env[`${prefix}_TELEGRAM_CHAT_ID_UNIT2`] || '', adminChatId: config?.adminChatId || process.env[`${prefix}_TELEGRAM_ADMIN_CHAT_ID`] || '' });
  } catch (error) { return failure(error); }
}
export async function POST(req: Request) {
  try {
    const db = await getDatabase(req);
    const { action, payload, botToken, unit1ChatId, unit2ChatId, adminChatId, targetChannel } = await req.json();
    const admin = ['ADMIN','ASSET_MANAGER'].includes(String(db.sessionUser?.role).toUpperCase());
    if ((action === 'SAVE' || action === 'TEST' || botToken || payload?.targetChatId) && !admin) throw new TenantError('Administrator access required.',403);
    if (action === 'SAVE') {
      const changes: Record<string,string> = {};
      for (const [key, value] of Object.entries({ unit1ChatId, unit2ChatId, adminChatId })) {
        if (typeof value !== 'string' || value.length > 100) throw new TenantError('Invalid chat configuration.',400);
        changes[key] = value.trim();
      }
      if (typeof botToken === 'string' && botToken.trim()) changes.botToken = botToken.trim();
      const existing = await db.collection('settings').findOne({ key: 'telegram' });
      const prefix = db.tenant.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      const token = changes.botToken || existing?.botToken || process.env[`${prefix}_TELEGRAM_BOT_TOKEN`];
      if (!token) throw new TenantError('Configure a Telegram bot token before saving destinations.', 400);
      for (const key of ['unit1ChatId', 'unit2ChatId', 'adminChatId']) {
        const chatId = changes[key];
        if (!chatId) continue;
        const getChat = async (id: string) => {
          const response = await fetch(`https://api.telegram.org/bot${token}/getChat`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: id }), signal: AbortSignal.timeout(10000),
          });
          return response.json();
        };
        let chat = await getChat(chatId);
        if (!chat.ok && chat.description === 'Bad Request: chat not found' && key !== 'adminChatId' && /^[1-9]\d*$/.test(chatId)) {
          const group = await getChat(`-${chatId}`);
          if (group.ok && ['group', 'supergroup'].includes(group.result?.type)) chat = group;
        }
        if (!chat.ok) throw new TenantError(`${key}: ${chat.description || 'Telegram destination could not be verified.'}`, 400);
        changes[key] = String(chat.result.id);
      }
      await db.collection('settings').updateOne({ key:'telegram' }, { $set: changes }, { upsert:true });
      return NextResponse.json({success:true});
    }
    if (!payload) throw new TenantError('Alert details are required.',400);
    if (action === 'TEST' && targetChannel !== undefined) {
      const chatKeys: Record<string, string> = { UNIT1: 'unit1ChatId', UNIT2: 'unit2ChatId', ADMIN: 'adminChatId' };
      const envKeys: Record<string, string> = { UNIT1: 'CHAT_ID_UNIT1', UNIT2: 'CHAT_ID_UNIT2', ADMIN: 'ADMIN_CHAT_ID' };
      if (typeof targetChannel !== 'string' || !Object.hasOwn(chatKeys, targetChannel)) {
        throw new TenantError('Select a valid Telegram destination.', 400);
      }
      const config = await db.collection('settings').findOne({ key: 'telegram' });
      const prefix = db.tenant.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      const chatId = config?.[chatKeys[targetChannel]] || process.env[`${prefix}_TELEGRAM_${envKeys[targetChannel]}`];
      if (!chatId) throw new TenantError('Configure the selected Telegram destination before testing.', 400);
      payload.targetChatId = chatId;
      payload.unit = targetChannel === 'UNIT2' ? 'UNIT - 2' : targetChannel === 'UNIT1' ? 'UNIT - 1' : undefined;
    }
    const result = await sendTelegramAlert({ ...payload, companySlug: db.tenant, title: payload.title || 'Telegram notification', category: action === 'TEST' ? 'TEST' : payload.category }, admin ? botToken : undefined);
    return NextResponse.json(result, {status:result.success ? 200 : 400});
  } catch (error) { return failure(error); }
}
