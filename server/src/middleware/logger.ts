import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
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
