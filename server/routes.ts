import type { Express, Request, Response, NextFunction } from 'express';
import type { Server } from 'http';
import passport from 'passport';
import { storage, sanitizeUser } from './storage';
import { requireAuth, requireAdmin, hashPassword } from './auth';
import type { SafeUser, AssignmentRole } from '@shared/schema';

const ASSIGNMENT_ROLES: AssignmentRole[] = ['owner', 'editor', 'viewer'];

function meWithPortfolios(user: SafeUser) {
  const assigned = storage.getAssignmentsForUser(user.id);
  // Admins implicitly see all portfolios.
  const portfolios =
    user.role === 'admin'
      ? storage.listPortfolios().map((p) => ({ ...p, assignmentRole: 'owner' as AssignmentRole }))
      : assigned;
  return { user, portfolios };
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // ── Auth ───────────────────────────────────────────────────────────────────
  app.post('/api/auth/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: SafeUser | false, info: { message?: string }) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || 'Invalid email or password.' });
      req.logIn(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        return res.json(meWithPortfolios(user));
      });
    })(req, res, next);
  });

  app.post('/api/auth/logout', (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ ok: true });
      });
    });
  });

  app.get('/api/auth/me', (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    res.json(meWithPortfolios(req.user as SafeUser));
  });

  // ── Admin: users ─────────────────────────────────────────────────────────────
  app.get('/api/admin/users', requireAdmin, (_req, res) => {
    const result = storage.listUsers().map((u) => ({
      ...sanitizeUser(u),
      portfolios: storage.getAssignmentsForUser(u.id),
    }));
    res.json(result);
  });

  app.post('/api/admin/users', requireAdmin, async (req, res) => {
    const { email, name, password, role } = req.body ?? {};
    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ message: 'Email and a password of at least 8 characters are required.' });
    }
    if (storage.getUserByEmail(email)) {
      return res.status(409).json({ message: 'A user with that email already exists.' });
    }
    const userRole = role === 'admin' ? 'admin' : 'client';
    const passwordHash = await hashPassword(password);
    const created = storage.createUser({ email: email.trim(), name: name ?? null, passwordHash, role: userRole });
    res.status(201).json({ ...sanitizeUser(created), portfolios: [] });
  });

  app.patch('/api/admin/users/:id', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const target = storage.getUserById(id);
    if (!target) return res.status(404).json({ message: 'User not found.' });

    const patch: { name?: string | null; isActive?: boolean; passwordHash?: string } = {};
    const { name, isActive, password } = req.body ?? {};
    if (typeof name === 'string') patch.name = name;
    if (typeof isActive === 'boolean') {
      if (!isActive && target.role === 'admin' && storage.countAdmins() <= 1) {
        return res.status(400).json({ message: 'Cannot disable the last admin account.' });
      }
      patch.isActive = isActive;
    }
    if (typeof password === 'string') {
      if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
      patch.passwordHash = await hashPassword(password);
    }
    const updated = storage.updateUser(id, patch);
    res.json({ ...sanitizeUser(updated!), portfolios: storage.getAssignmentsForUser(id) });
  });

  app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const target = storage.getUserById(id);
    if (!target) return res.status(404).json({ message: 'User not found.' });
    if (target.role === 'admin' && storage.countAdmins() <= 1) {
      return res.status(400).json({ message: 'Cannot delete the last admin account.' });
    }
    storage.deleteUser(id);
    res.json({ ok: true });
  });

  // ── Admin: portfolios ──────────────────────────────────────────────────────
  app.get('/api/admin/portfolios', requireAdmin, (_req, res) => {
    res.json(storage.listPortfolios());
  });

  app.post('/api/admin/portfolios', requireAdmin, (req, res) => {
    const { name, clientName, market, status } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Portfolio name is required.' });
    }
    const created = storage.createPortfolio({
      name: name.trim(),
      clientName: typeof clientName === 'string' ? clientName : null,
      market: typeof market === 'string' ? market : null,
      status: status === 'Archived' ? 'Archived' : 'Active',
    });
    res.status(201).json(created);
  });

  // ── Admin: assignments ─────────────────────────────────────────────────────
  app.post('/api/admin/users/:id/assignments', requireAdmin, (req, res) => {
    const userId = Number(req.params.id);
    const { portfolioId, role } = req.body ?? {};
    if (!storage.getUserById(userId)) return res.status(404).json({ message: 'User not found.' });
    const pid = Number(portfolioId);
    if (!storage.getPortfolioById(pid)) return res.status(404).json({ message: 'Portfolio not found.' });
    const assignmentRole: AssignmentRole = ASSIGNMENT_ROLES.includes(role) ? role : 'viewer';
    const assignment = storage.upsertAssignment(userId, pid, assignmentRole);
    res.status(201).json(assignment);
  });

  app.delete('/api/admin/users/:id/assignments/:portfolioId', requireAdmin, (req, res) => {
    const userId = Number(req.params.id);
    const portfolioId = Number(req.params.portfolioId);
    storage.removeAssignment(userId, portfolioId);
    res.json({ ok: true });
  });

  // ── Settings API (now protected) ─────────────────────────────────────────────
  app.get('/api/settings/:key', requireAuth, (req, res) => {
    const setting = storage.getSetting(String(req.params.key));
    if (!setting) return res.status(404).json({ error: 'Not found' });
    res.json(setting);
  });

  app.post('/api/settings', requireAuth, (req, res) => {
    try {
      const setting = storage.setSetting(req.body);
      res.json(setting);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  return httpServer;
}
