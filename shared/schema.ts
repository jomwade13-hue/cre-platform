import { sqliteTable, text, integer, real, unique } from 'drizzle-orm/sqlite-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Minimal schema — most data is served from mock layer
export const userSettings = sqliteTable('user_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull(),
  value: text('value').notNull(),
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({ id: true });
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;

// ── Auth & access control ────────────────────────────────────────────────────

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  role: text('role', { enum: ['admin', 'client'] }).notNull().default('client'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default("CURRENT_TIMESTAMP"),
});

export const portfolios = sqliteTable('portfolios', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  clientName: text('client_name'),
  market: text('market'),
  status: text('status', { enum: ['Active', 'Archived'] }).notNull().default('Active'),
  createdAt: text('created_at').notNull().default("CURRENT_TIMESTAMP"),
});

export const portfolioAssignments = sqliteTable('portfolio_assignments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  portfolioId: integer('portfolio_id').notNull().references(() => portfolios.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['owner', 'editor', 'viewer'] }).notNull().default('viewer'),
  createdAt: text('created_at').notNull().default("CURRENT_TIMESTAMP"),
}, (t) => ({
  uniqUserPortfolio: unique().on(t.userId, t.portfolioId),
}));

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertPortfolioSchema = createInsertSchema(portfolios).omit({ id: true, createdAt: true });
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type Portfolio = typeof portfolios.$inferSelect;

export const insertPortfolioAssignmentSchema = createInsertSchema(portfolioAssignments).omit({ id: true, createdAt: true });
export type InsertPortfolioAssignment = z.infer<typeof insertPortfolioAssignmentSchema>;
export type PortfolioAssignment = typeof portfolioAssignments.$inferSelect;

// Sanitized user (no password hash) returned to the client.
export type SafeUser = Omit<User, 'passwordHash'>;
export type AssignmentRole = 'owner' | 'editor' | 'viewer';
