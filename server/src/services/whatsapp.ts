import makeWASocket, {
  Browsers,
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';

const AUTH_DIR = path.join(process.cwd(), 'whatsapp-auth');

let sock: WASocket | null = null;
let isReady = false;
let pairingCodeRequested = false;
let reconnectDelay = 5000;
let reconnectTimeout: NodeJS.Timeout | null = null;

export async function initWhatsApp() {
  const phone = process.env.WHATSAPP_PHONE?.replace(/\D/g, '');
  if (!phone) {
    console.error('[WhatsApp] WHATSAPP_PHONE is not set in .env — bot will not start.');
    return;
  }

  // Clear any pending reconnects
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  // Clean up any existing socket connection to prevent duplicates and leaks
  if (sock) {
    console.log('[WhatsApp] Closing existing connection before re-initializing...');
    try {
      sock.end(undefined);
    } catch (err) {
      console.error('[WhatsApp] Error ending previous socket:', err);
    }
    sock = null;
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  // Fetch the latest Baileys/WhatsApp version to prevent noise handshake connection errors
  let version: [number, number, number] = [2, 3000, 1015901307]; // fallback default
  try {
    const fetched = await fetchLatestBaileysVersion();
    version = fetched.version as [number, number, number];
    console.log(`[WhatsApp] Fetched latest Baileys version: ${version.join('.')}`);
  } catch (err) {
    console.error('[WhatsApp] Failed to fetch latest Baileys version, using fallback:', err);
  }

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    keepAliveIntervalMs: 30_000,
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: undefined,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr && !pairingCodeRequested && !sock!.authState.creds.registered) {
      pairingCodeRequested = true;
      console.log('[WhatsApp] Connection waiting for authorization. Generating pairing code in 3s...');
      
      // Delay requesting pairing code to avoid connection closed race conditions during websocket startup
      setTimeout(async () => {
        try {
          if (sock && !sock.authState.creds.registered) {
            const code = await sock.requestPairingCode(phone);
            console.log(`\n======================================================`);
            console.log(`[WhatsApp] Pairing code: ${code}`);
            console.log(`[WhatsApp] Go to WhatsApp → Settings → Linked Devices → Link with phone number`);
            console.log(`======================================================\n`);
          }
        } catch (err) {
          console.error('[WhatsApp] Failed to get pairing code:', err);
          pairingCodeRequested = false; // allow retry
        }
      }, 3000);
    }

    if (connection === 'open') {
      isReady = true;
      pairingCodeRequested = false;
      reconnectDelay = 5000;
      console.log('[WhatsApp] Connected and ready!');
    }

    if (connection === 'close') {
      isReady = false;
      pairingCodeRequested = false;
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      if (statusCode === DisconnectReason.loggedOut) {
        console.log('[WhatsApp] Logged out. Please delete the whatsapp-auth/ folder and restart the app to re-link.');
        return;
      }
      
      console.log(`[WhatsApp] Disconnected. Reconnecting in ${reconnectDelay / 1000}s...`);
      reconnectTimeout = setTimeout(() => {
        initWhatsApp();
      }, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, 60000); // cap at 60s
    }
  });
}

export function getWhatsAppStatus(): { connected: boolean; ready: boolean } {
  return { connected: sock !== null, ready: isReady };
}

export async function reconnectWhatsApp(): Promise<void> {
  await initWhatsApp();
}

export async function sendWhatsAppMessage(phone: string, message: string) {
  if (!sock || !isReady) throw new Error('WhatsApp not connected');
  // Ensure the JID is international format, without spaces or "+" prefix
  const jid = `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
  await sock.sendMessage(jid, { text: message });
}
