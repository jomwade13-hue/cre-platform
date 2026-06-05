import { storage } from './storage';
import { hashPassword, generateStrongPassword } from './auth';
import { log } from './log';

const DEFAULT_ADMIN_EMAIL = 'jomwade13@icloud.com';

// Create an admin account on first startup if none exists. Uses ADMIN_EMAIL /
// ADMIN_PASSWORD env vars when provided; otherwise generates a strong random
// password and prints it ONCE to the server log. The old exposed password is
// never used as a default.
export async function bootstrapAdmin(): Promise<void> {
  if (storage.countAdmins() > 0) return;

  const email = (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).toLowerCase();
  const envPassword = process.env.ADMIN_PASSWORD;
  const password = envPassword && envPassword.length >= 8 ? envPassword : generateStrongPassword();

  const existing = storage.getUserByEmail(email);
  const passwordHash = await hashPassword(password);
  if (existing) {
    storage.updateUser(existing.id, { passwordHash, isActive: true });
  } else {
    storage.createUser({ email, name: 'Administrator', passwordHash, role: 'admin' });
  }

  if (envPassword && envPassword.length >= 8) {
    log(`Admin account ready for ${email} (password from ADMIN_PASSWORD).`, 'auth');
  } else {
    log('═══════════════════════════════════════════════════════════════', 'auth');
    log(`Bootstrapped admin account: ${email}`, 'auth');
    log(`Generated admin password (shown once): ${password}`, 'auth');
    log('Set ADMIN_EMAIL / ADMIN_PASSWORD env vars to control this.', 'auth');
    log('═══════════════════════════════════════════════════════════════', 'auth');
  }
}

// Idempotent example portfolios so the portal isn't empty for testing.
export function seedPortfolios(): void {
  if (storage.countPortfolios() > 0) return;
  storage.createPortfolio({ name: 'Learfield Portfolio', clientName: 'Learfield Communications', market: 'National', status: 'Active' });
  storage.createPortfolio({ name: 'Midwest Industrial Fund', clientName: 'Apex Capital Partners', market: 'Midwest', status: 'Active' });
  storage.createPortfolio({ name: 'Southeast Healthcare Portfolio', clientName: 'MedCore Health Systems', market: 'Southeast', status: 'Active' });
}
