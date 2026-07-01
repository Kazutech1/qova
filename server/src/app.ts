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

app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/circles', circlesRouter);
app.use('/contributions', contributionsRouter);
app.use('/payouts', payoutsRouter);
app.use('/banks', banksRouter);
// app.use('/savings', savingsRouter);
// app.use('/users', usersRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, data: null, message: 'Route not found' });
});

app.use(errorHandler);

export default app;
