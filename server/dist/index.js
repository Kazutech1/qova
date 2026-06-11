"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const whatsapp_1 = require("./services/whatsapp");
const PORT = process.env.PORT || 3000;
(0, whatsapp_1.initWhatsApp)().catch(console.error);
app_1.default.listen(PORT, () => {
    console.log(`Qova server running on port ${PORT}`);
    console.log(`API docs available at http://localhost:${PORT}/docs`);
});
//# sourceMappingURL=index.js.map