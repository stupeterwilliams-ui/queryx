import { app } from './lib/agent';

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

console.log(`🔍 Queryx search API starting on port ${port}...`);

export default {
  port,
  fetch: app.fetch,
};
