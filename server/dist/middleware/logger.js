"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = requestLogger;
function requestLogger(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const ts = new Date().toISOString();
        const ms = Date.now() - start;
        const status = res.statusCode;
        const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
        console.log(`${ts}  ${color}${status}\x1b[0m  ${req.method} ${req.originalUrl}  \x1b[2m${ms}ms\x1b[0m`);
    });
    next();
}
//# sourceMappingURL=logger.js.map