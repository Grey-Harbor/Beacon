import argon2 from 'argon2';
import type { DriftPort } from '../drift.js';
import { AppError } from '../errors.js';
import { RECORD_TYPES, recordData } from '../records.js';

export class AdminService {
  private setupInProgress = false;

  constructor(private readonly drift: DriftPort) {}

  async setupStatus() {
    const admins = await this.drift.listVertices(RECORD_TYPES.admin, 'active');
    return { configured: admins.length > 0 };
  }

  async setup(username: string, password: string) {
    if (this.setupInProgress) {
      throw new AppError(409, 'setup_in_progress', 'Setup is already running');
    }
    this.setupInProgress = true;
    try {
      if ((await this.setupStatus()).configured) {
        throw new AppError(409, 'already_configured', 'Beacon setup is already complete');
      }
      const normalized = username.trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,64}$/.test(normalized) || password.length < 12) {
        throw new AppError(
          400,
          'invalid_credentials',
          'Use a valid username and a 12+ character password',
        );
      }
      const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
      await this.drift.createVertex({
        type: RECORD_TYPES.admin,
        slug: normalized,
        title: normalized,
        status: 'active',
        data: { username: normalized, passwordHash },
      });
      return { username: normalized };
    } finally {
      this.setupInProgress = false;
    }
  }

  async authenticate(username: string, password: string) {
    const normalized = username.trim().toLowerCase();
    const admins = await this.drift.listVertices(RECORD_TYPES.admin, 'active');
    const admin = admins.find((candidate) => candidate.slug === normalized);
    if (!admin) return null;

    const passwordHash = recordData(admin.data).passwordHash;
    if (typeof passwordHash !== 'string' || !(await argon2.verify(passwordHash, password))) {
      return null;
    }
    return { username: normalized };
  }
}
