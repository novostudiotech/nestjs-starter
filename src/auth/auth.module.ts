import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminInitService } from './admin-init.service';
import {
  AdminAccountsController,
  AdminSessionsController,
  AdminUsersController,
  AdminVerificationsController,
} from './auth.admin-controller';
import { AccountEntity } from './entities/account.entity';
import { UserEntity } from './entities/user.entity';

/**
 * Auth module
 * Provides admin controllers for auth entities and admin initialization
 *
 * Admin controllers are auto-registered via @AdminController decorator:
 * - Entities are automatically added to AdminModule.adminRegistry
 * - AdminModule.forRoot() registers all entities with TypeORM globally
 * - Repositories are available via @InjectRepository without importing TypeOrmModule
 * - AdminDiscoveryService can introspect all admin controllers at runtime
 *
 * AdminInitService:
 * - Runs on module initialization (OnModuleInit lifecycle hook)
 * - Creates first admin user if ADMIN_EMAIL and ADMIN_PASSWORD are set in ENV
 * - Creates user and account records directly in database following Better Auth schema
 * - Idempotent: safe to run multiple times, won't create duplicates
 */
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, AccountEntity])],
  controllers: [
    AdminUsersController,
    AdminAccountsController,
    AdminSessionsController,
    AdminVerificationsController,
  ],
  providers: [AdminInitService],
  exports: [AdminInitService],
})
export class AuthControllersModule {}
