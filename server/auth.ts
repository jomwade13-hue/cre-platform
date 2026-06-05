import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import type { Express, Request, Response, NextFunction } from 'express';
import { storage, sanitizeUser } from './storage';
import type { SafeUser } from '@shared/schema';

const scryptAsync = promisify(scrypt);
const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(password, salt, KEYLEN)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, 'hex');
  const derived = (await scryptAsync(password, salt, hashBuf.length || KEYLEN)) as Buffer;
  if (derived.length !== hashBuf.length) return false;
  return timingSafeEqual(derived, hashBuf);
}

export function generateStrongPassword(): string {
  // 24 url-safe chars (~144 bits of entropy)
  return randomBytes(18).toString('base64url');
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // The authenticated user attached by passport. Sanitized (no hash).
    interface User extends SafeUser {}
  }
}

export function configurePassport(app: Express): void {
  passport.use(
    new LocalStrategy({ usernameField: 'email', passwordField: 'password' }, async (email, password, done) => {
      try {
        const user = storage.getUserByEmail(email);
        if (!user) return done(null, false, { message: 'Invalid email or password.' });
        if (!user.isActive) return done(null, false, { message: 'This account has been disabled.' });
        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return done(null, false, { message: 'Invalid email or password.' });
        return done(null, sanitizeUser(user));
      } catch (err) {
        return done(err as Error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, (user as SafeUser).id);
  });

  passport.deserializeUser((id: number, done) => {
    try {
      const user = storage.getUserById(id);
      if (!user || !user.isActive) return done(null, false);
      done(null, sanitizeUser(user));
    } catch (err) {
      done(err as Error);
    }
  });

  app.use(passport.initialize());
  app.use(passport.session());
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    next();
    return;
  }
  res.status(401).json({ message: 'Authentication required.' });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated && req.isAuthenticated() && req.user && (req.user as SafeUser).role === 'admin') {
    next();
    return;
  }
  if (req.isAuthenticated && req.isAuthenticated()) {
    res.status(403).json({ message: 'Admin access required.' });
    return;
  }
  res.status(401).json({ message: 'Authentication required.' });
}
