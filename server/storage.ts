import { db } from './db';
import { userSettings, type UserSettings, type InsertUserSettings } from '@shared/schema';
import { eq } from 'drizzle-orm';

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
}

export const storage = new DatabaseStorage();
