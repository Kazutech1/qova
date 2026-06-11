"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initWhatsApp = initWhatsApp;
exports.sendWhatsAppMessage = sendWhatsAppMessage;
const baileys_1 = __importStar(require("@whiskeysockets/baileys"));
const path_1 = __importDefault(require("path"));
const AUTH_DIR = path_1.default.join(process.cwd(), 'whatsapp-auth');
let sock = null;
let isReady = false;
let pairingCodeRequested = false;
let reconnectDelay = 5000;
let reconnectTimeout = null;
async function initWhatsApp() {
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
        }
        catch (err) {
            console.error('[WhatsApp] Error ending previous socket:', err);
        }
        sock = null;
    }
    const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(AUTH_DIR);
    // Fetch the latest Baileys/WhatsApp version to prevent noise handshake connection errors
    let version = [2, 3000, 1015901307]; // fallback default
    try {
        const fetched = await (0, baileys_1.fetchLatestBaileysVersion)();
        version = fetched.version;
        console.log(`[WhatsApp] Fetched latest Baileys version: ${version.join('.')}`);
    }
    catch (err) {
        console.error('[WhatsApp] Failed to fetch latest Baileys version, using fallback:', err);
    }
    sock = (0, baileys_1.default)({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: baileys_1.Browsers.ubuntu('Chrome'),
    });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
        if (qr && !pairingCodeRequested && !sock.authState.creds.registered) {
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
                }
                catch (err) {
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
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            if (statusCode === baileys_1.DisconnectReason.loggedOut) {
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
async function sendWhatsAppMessage(phone, message) {
    if (!sock || !isReady)
        throw new Error('WhatsApp not connected');
    // Ensure the JID is international format, without spaces or "+" prefix
    const jid = `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text: message });
}
//# sourceMappingURL=whatsapp.js.map