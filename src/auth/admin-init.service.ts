import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { ConfigService } from '#/app/config';
import { UserRole } from './dto/enums';
import { AccountEntity } from './entities/account.entity';
import { UserEntity } from './entities/user.entity';

/**
 * Service to initialize first admin user on application startup
 *
 * Reads ADMIN_EMAIL and ADMIN_PASSWORD from environment variables.
 * If both are set, creates admin user (or upgrades existing user to admin).
 *
 * Creates user directly in database using Better Auth schema.
 * Idempotent: Safe to run multiple times, won't create duplicates.
 *
 * Uses OnApplicationBootstrap to ensure migrations have completed before creating admin.
 */
@Injectable()
export class AdminInitService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminInitService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    private readonly configService: ConfigService
  ) {}

  async onApplicationBootstrap() {
    const adminEmail = this.configService.get('ADMIN_EMAIL');
    const adminPassword = this.configService.get('ADMIN_PASSWORD');

    if (!adminEmail || !adminPassword) {
      this.logger.debug('ADMIN_EMAIL or ADMIN_PASSWORD not set, skipping admin initialization');
      return;
    }

    await this.ensureFirstAdmin(adminEmail, adminPassword);
  }

  private async ensureFirstAdmin(email: string, password: string): Promise<void> {
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      // User exists - ensure they have admin role
      if (existingUser.role !== UserRole.ADMIN) {
        existingUser.role = UserRole.ADMIN;
        await this.userRepository.save(existingUser);
        this.logger.log(`Upgraded existing user ${email} to admin role`);
      } else {
        this.logger.log(`Admin user ${email} already exists`);
      }
      return;
    }

    // Create new admin user directly in database
    // Following Better Auth schema structure
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = this.userRepository.create({
      email,
      name: 'Admin',
      emailVerified: true, // Skip email verification for initial admin
      role: UserRole.ADMIN,
    });
    const savedUser = await this.userRepository.save(user);

    // Create account (Better Auth requires this for email/password auth)
    const account = this.accountRepository.create({
      userId: savedUser.id,
      accountId: savedUser.id, // Same as userId for email/password
      providerId: 'credential', // Better Auth uses 'credential' for email/password
      password: hashedPassword,
    });
    await this.accountRepository.save(account);

    this.logger.log(`Created first admin user: ${email}`);
  }
}
