import cors from 'cors';
import express from 'express';
import { checkDatabaseConnection, env } from './config/env';
import { errorMiddleware } from './middleware/error.middleware';
import { authRouter } from './modules/auth/auth.routes';
import { orderRouter } from './modules/orders/order.routes';
import { rateCardRouter } from './modules/rate-cards/rateCard.routes';
import { agentRouter } from './modules/users/user.routes';
import { zoneRouter } from './modules/zones/zone.routes';

export const app = express();

app.use(cors({ origin: env.FRONTEND_URL }));
app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({ success: true, message: 'Last-Mile Delivery Tracker API is healthy' });
});

app.get('/ready', async (_request, response) => {
  try {
    await checkDatabaseConnection();
    response.json({ success: true, message: 'API and database are ready' });
  } catch {
    response.status(503).json({ success: false, message: 'Database is temporarily unavailable' });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/zones', zoneRouter);
app.use('/api/rate-cards', rateCardRouter);
app.use('/api/orders', orderRouter);
app.use('/api/agents', agentRouter);

app.use(errorMiddleware);
