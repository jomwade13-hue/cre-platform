import type { Express } from 'express';
import type { Server } from 'http';
import { storage } from './storage';

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Settings API
  app.get('/api/settings/:key', (req, res) => {
    const setting = storage.getSetting(req.params.key);
    if (!setting) return res.status(404).json({ error: 'Not found' });
    res.json(setting);
  });

  app.post('/api/settings', (req, res) => {
    try {
      const setting = storage.setSetting(req.body);
      res.json(setting);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  return httpServer;
}
