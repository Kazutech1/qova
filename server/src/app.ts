import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import circlesRouter from './routes/circles';
import contributionsRouter from './routes/contributions';
import payoutsRouter from './routes/payouts';
import banksRouter from './routes/banks';
import adminRouter from './routes/admin';
import { swaggerSpec } from './utils/swagger';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// API docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (_req, res) => {
  res.json({ success: true, data: null, message: 'Qova API is running' });
});

// Checkout redirect landing — Nomba sends the customer here after a card payment
app.get('/payments/callback', (_req, res) => {
  res.send(`<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Qova — Payment received</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f6f8f7;color:#1b4332;text-align:center}div{padding:32px}h1{font-size:1.4rem}p{color:#555}</style>
</head><body><div>
<h1>✅ Payment received</h1>
<p>You can close this page and return to the Qova app.<br>Your contribution will be confirmed automatically.</p>
</div></body></html>`);
});

app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/circles', circlesRouter);
app.use('/contributions', contributionsRouter);
app.use('/payouts', payoutsRouter);
app.use('/banks', banksRouter);
app.use('/admin', adminRouter);
// app.use('/savings', savingsRouter);
// app.use('/users', usersRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, data: null, message: 'Route not found' });
});

app.use(errorHandler);

export default app;
