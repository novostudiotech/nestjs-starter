import { Column, Entity, Index } from 'typeorm';
import { PrimaryUuidV7AutoColumn } from '#/app/db/decorators/primary-uuid-v7-auto-column.decorator';
import { AuditableEntity } from '#/app/db/entities/auditable.entity';
import { UserRole } from '../dto/enums';

/**
 * User entity for Better Auth
 * @see https://www.better-auth.com/docs/concepts/database#core-schema
 */
@Entity('user')
export class UserEntity extends AuditableEntity {
  @PrimaryUuidV7AutoColumn()
  id: string;
  /**
   * User's email address for communication and login
   * Must be unique
   * RFC 5321 standard max length: 255 characters
   */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  /**
   * User's chosen display name
   */
  @Column({ type: 'varchar', nullable: true, length: 255 })
  name: string | null;

  /**
   * Whether the user's email is verified
   */
  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  /**
   * User's profile image URL
   * Supports URLs up to 2048 characters
   */
  @Column({ type: 'varchar', nullable: true, length: 2048 })
  image: string | null;

  /**
   * User's system role for access control
   * Managed by Better Auth via additionalFields
   * - USER: Regular user (default)
   * - ADMIN: Administrator with access to admin panel
   */
  @Column({
    type: 'varchar',
    default: UserRole.USER,
  })
  role: UserRole;

  /**
   * Whether the user is banned
   * Managed by Better Auth admin plugin
   */
  @Column({ type: 'boolean', nullable: true })
  banned: boolean | null;

  /**
   * Reason for the user's ban
   * Managed by Better Auth admin plugin
   */
  @Column({ type: 'text', nullable: true })
  banReason: string | null;

  /**
   * Date when the user's ban expires
   * Managed by Better Auth admin plugin
   */
  @Column({ type: 'timestamptz', nullable: true })
  banExpires: Date | null;
}
