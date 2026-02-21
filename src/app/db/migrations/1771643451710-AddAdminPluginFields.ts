import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminPluginFields1771643451710 implements MigrationInterface {
  name = 'AddAdminPluginFields1771643451710';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_d0012b9482ca5b4f270e6fdb5e"`);
    await queryRunner.query(
      `ALTER TABLE "user" ADD "role" character varying NOT NULL DEFAULT 'user'`
    );
    await queryRunner.query(`ALTER TABLE "user" ADD "banned" boolean`);
    await queryRunner.query(`ALTER TABLE "user" ADD "banReason" text`);
    await queryRunner.query(`ALTER TABLE "user" ADD "banExpires" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "session" ADD "impersonatedBy" text`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e12875dfb3b1d92d7d7c5377e2" ON "user" ("email") `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_e12875dfb3b1d92d7d7c5377e2"`);
    await queryRunner.query(`ALTER TABLE "session" DROP COLUMN "impersonatedBy"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "banExpires"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "banReason"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "banned"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "role"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_d0012b9482ca5b4f270e6fdb5e" ON "user" ("email") WHERE ("deletedAt" IS NULL)`
    );
  }
}
