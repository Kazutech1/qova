export declare function initWhatsApp(): Promise<void>;
export declare function getWhatsAppStatus(): {
    connected: boolean;
    ready: boolean;
};
export declare function reconnectWhatsApp(): Promise<void>;
export declare function sendWhatsAppMessage(phone: string, message: string): Promise<void>;
//# sourceMappingURL=whatsapp.d.ts.map