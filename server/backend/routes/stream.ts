import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { AppEnv } from '../types';

export const streamRouter = new Hono<AppEnv>();

streamRouter.get('/', (c) => {
  return streamSSE(c, async (stream) => {
    let count = 0;
    while (true) {
      count++;
      const payload = JSON.stringify({
        count,
        message: 'Live real-time stream event from Cloudflare Worker',
        timestamp: new Date().toISOString(),
      });

      await stream.writeSSE({
        data: payload,
        event: 'message',
        id: String(count),
      });

      await stream.sleep(2000);
    }
  });
});
