"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = __importDefault(require("./routes/auth"));
const swagger_1 = require("./utils/swagger");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// API docs
app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
// Health check
app.get('/health', (_req, res) => {
    res.json({ success: true, data: null, message: 'Qova API is running' });
});
app.use('/auth', auth_1.default);
// app.use('/circles', circlesRouter);
// app.use('/contributions', contributionsRouter);
// app.use('/payouts', payoutsRouter);
// app.use('/savings', savingsRouter);
// app.use('/users', usersRouter);
// 404 handler
app.use((_req, res) => {
    res.status(404).json({ success: false, data: null, message: 'Route not found' });
});
app.use(errorHandler_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map