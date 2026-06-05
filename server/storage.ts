import { db } from './db';
import {
  userSettings, type UserSettings, type InsertUserSettings,
  users, type User, type SafeUser, type AssignmentRole,
  portfolios, type Portfolio, type InsertPortfolio,
  portfolioAssignments, type PortfolioAssignment,
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export function sanitizeUser(u: User): SafeUser {
  const { passwordHash: _passwordHash, ...rest } = u;
  return rest;
}

export interface AssignedPortfolio extends Portfolio {
  assignmentRole: AssignmentRole;
}

export interface IStorage {
  getSetting(key: string): UserSettings | undefined;
  setSetting(data: InsertUserSettings): UserSettings;
}

export class DatabaseStorage implements IStorage {
  getSetting(key: string): UserSettings | undefined {
    return db.select().from(userSettings).where(eq(userSettings.key, key)).get();
  }

  setSetting(data: InsertUserSettings): UserSettings {
    const existing = this.getSetting(data.key);
    if (existing) {
      return db.update(userSettings).set({ value: data.value }).where(eq(userSettings.key, data.key)).returning().get();
    }
    return db.insert(userSettings).values(data).returning().get();
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  getUserById(id: number): User | undefined {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  getUserByEmail(email: string): User | undefined {
    return db.select().from(users).where(eq(users.email, email.toLowerCase())).get();
  }

  listUsers(): User[] {
    return db.select().from(users).all();
  }

  countAdmins(): number {
    return db.select().from(users).where(eq(users.role, 'admin')).all().length;
  }

  createUser(data: { email: string; passwordHash: string; name?: string | null; role?: 'admin' | 'client' }): User {
    return db.insert(users).values({
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      name: data.name ?? null,
      role: data.role ?? 'client',
      isActive: true,
    }).returning().get();
  }

  updateUser(id: number, patch: Partial<Pick<User, 'name' | 'isActive' | 'passwordHash'>>): User | undefined {
    if (Object.keys(patch).length === 0) return this.getUserById(id);
    return db.update(users).set(patch).where(eq(users.id, id)).returning().get();
  }

  deleteUser(id: number): void {
    db.delete(portfolioAssignments).where(eq(portfolioAssignments.userId, id)).run();
    db.delete(users).where(eq(users.id, id)).run();
  }

  // ── Portfolios ───────────────────────────────────────────────────────────────

  listPortfolios(): Portfolio[] {
    return db.select().from(portfolios).all();
  }

  countPortfolios(): number {
    return db.select().from(portfolios).all().length;
  }

  getPortfolioById(id: number): Portfolio | undefined {
    return db.select().from(portfolios).where(eq(portfolios.id, id)).get();
  }

  createPortfolio(data: InsertPortfolio): Portfolio {
    return db.insert(portfolios).values(data).returning().get();
  }

  // ── Assignments ──────────────────────────────────────────────────────────────

  getAssignmentsForUser(userId: number): AssignedPortfolio[] {
    const rows = db
      .select({ portfolio: portfolios, role: portfolioAssignments.role })
      .from(portfolioAssignments)
      .innerJoin(portfolios, eq(portfolioAssignments.portfolioId, portfolios.id))
      .where(eq(portfolioAssignments.userId, userId))
      .all();
    return rows.map((r) => ({ ...r.portfolio, assignmentRole: r.role as AssignmentRole }));
  }

  getAssignmentsForPortfolio(portfolioId: number): PortfolioAssignment[] {
    return db.select().from(portfolioAssignments).where(eq(portfolioAssignments.portfolioId, portfolioId)).all();
  }

  upsertAssignment(userId: number, portfolioId: number, role: AssignmentRole): PortfolioAssignment {
    const existing = db.select().from(portfolioAssignments)
      .where(and(eq(portfolioAssignments.userId, userId), eq(portfolioAssignments.portfolioId, portfolioId)))
      .get();
    if (existing) {
      return db.update(portfolioAssignments).set({ role }).where(eq(portfolioAssignments.id, existing.id)).returning().get();
    }
    return db.insert(portfolioAssignments).values({ userId, portfolioId, role }).returning().get();
  }

  removeAssignment(userId: number, portfolioId: number): void {
    db.delete(portfolioAssignments)
      .where(and(eq(portfolioAssignments.userId, userId), eq(portfolioAssignments.portfolioId, portfolioId)))
      .run();
  }
}

export const storage = new DatabaseStorage();
