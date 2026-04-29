ALTER TABLE "refresh_tokens" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "refresh_tokens" CASCADE;--> statement-breakpoint
CREATE UNIQUE INDEX "members_oauth_identity_uq" ON "members" USING btree ("oauth_provider","oauth_provider_user_id") WHERE "members"."deleted_at" IS NULL;
