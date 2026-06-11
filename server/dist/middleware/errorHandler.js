"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
function errorHandler(err, _req, res, _next) {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            data: null,
            message: err.message,
        });
    }
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            success: false,
            data: null,
            message: err.errors[0]?.message ?? 'Validation error',
        });
    }
    console.error(err);
    res.status(500).json({
        success: false,
        data: null,
        message: 'Internal server error',
    });
}
//# sourceMappingURL=errorHandler.js.map