/**
 * System-wide user role for access control
 * Matches Better Auth user.role field values
 * - USER: Default role for all registered users
 * - ADMIN: Full access to admin panel (/admin/* endpoints)
 */
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}
