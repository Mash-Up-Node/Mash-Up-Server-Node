CREATE TYPE "public"."attendance_check_method_enum" AS ENUM('QR', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."attendance_status_enum" AS ENUM('ATTENDED', 'LATE', 'ABSENT');--> statement-breakpoint
CREATE TYPE "public"."birthday_image_type_enum" AS ENUM('CAKE', 'GIFT', 'PARTY', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."generation_activity_status_enum" AS ENUM('ACTIVE', 'DROPPED');--> statement-breakpoint
CREATE TYPE "public"."generation_role_enum" AS ENUM('LEADER', 'SUBLEADER', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."generation_status_enum" AS ENUM('BEFORE_START', 'ACTIVE', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."mission_category_enum" AS ENUM('ATTENDANCE', 'ACTIVITY', 'SPECIAL');--> statement-breakpoint
CREATE TYPE "public"."mission_type_enum" AS ENUM('COUNT', 'BOOLEAN');--> statement-breakpoint
CREATE TYPE "public"."oauth_provider_enum" AS ENUM('NAVER');--> statement-breakpoint
CREATE TYPE "public"."platform_enum" AS ENUM('NODE', 'SPRING', 'WEB', 'iOS', 'ANDROID', 'DESIGN');--> statement-breakpoint
CREATE TABLE "attendance_checkpoints" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"seminar_schedule_id" bigint NOT NULL,
	"round_no" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	"late_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "attendance_checkpoints_schedule_round_uq" UNIQUE("seminar_schedule_id","round_no"),
	CONSTRAINT "attendance_checkpoints_round_no_gte_1_ck" CHECK ("attendance_checkpoints"."round_no" >= 1)
);
--> statement-breakpoint
CREATE TABLE "birthday_cards" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"sender_member_id" bigint NOT NULL,
	"receiver_member_id" bigint NOT NULL,
	"generation_id" bigint NOT NULL,
	"image_id" bigint,
	"image_type" "birthday_image_type_enum" NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "birthday_cards_sender_receiver_generation_uq" UNIQUE("sender_member_id","receiver_member_id","generation_id")
);
--> statement-breakpoint
CREATE TABLE "carrot_round_rankings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"round_id" bigint NOT NULL,
	"member_id" bigint NOT NULL,
	"final_rank" integer NOT NULL,
	"final_score" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "carrot_round_rankings_round_member_uq" UNIQUE("round_id","member_id"),
	CONSTRAINT "carrot_round_rankings_final_rank_gte_1_ck" CHECK ("carrot_round_rankings"."final_rank" >= 1),
	CONSTRAINT "carrot_round_rankings_final_score_gte_0_ck" CHECK ("carrot_round_rankings"."final_score" >= 0)
);
--> statement-breakpoint
CREATE TABLE "carrot_rounds" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"generation_id" bigint NOT NULL,
	"round_no" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "carrot_rounds_generation_round_uq" UNIQUE("generation_id","round_no"),
	CONSTRAINT "carrot_rounds_round_no_gte_1_ck" CHECK ("carrot_rounds"."round_no" >= 1)
);
--> statement-breakpoint
CREATE TABLE "carrot_shake_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"round_id" bigint NOT NULL,
	"member_id" bigint NOT NULL,
	"score_delta" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carrot_staked_count" (
	"member_id" bigint NOT NULL,
	"generation_id" bigint NOT NULL,
	"platform" "platform_enum" NOT NULL,
	"shake_count" bigint NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "carrot_staked_count_member_id_generation_id_pk" PRIMARY KEY("member_id","generation_id"),
	CONSTRAINT "carrot_staked_count_member_generation_uq" UNIQUE("member_id","generation_id")
);
--> statement-breakpoint
CREATE TABLE "generations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"number" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"status" "generation_status_enum" NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invite_code_usages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"invite_code_id" bigint NOT NULL,
	"member_id" bigint NOT NULL,
	"used_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invite_codes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"code" varchar(100) NOT NULL,
	"generation_id" bigint NOT NULL,
	"created_by_member_id" bigint,
	"platform" "platform_enum" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"is_active" boolean NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mashong_daily_visits" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"mashong_id" bigint NOT NULL,
	"member_id" bigint NOT NULL,
	"visit_date" date NOT NULL,
	"visit_seq" integer NOT NULL,
	"rewarded_popcorn" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "mashong_daily_visits_member_visit_date_uq" UNIQUE("member_id","visit_date"),
	CONSTRAINT "mashong_daily_visits_visit_seq_gte_1_ck" CHECK ("mashong_daily_visits"."visit_seq" >= 1),
	CONSTRAINT "mashong_daily_visits_rewarded_popcorn_gte_0_ck" CHECK ("mashong_daily_visits"."rewarded_popcorn" >= 0)
);
--> statement-breakpoint
CREATE TABLE "mashong_mission_completions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"mission_id" bigint NOT NULL,
	"member_id" bigint NOT NULL,
	"mashong_id" bigint NOT NULL,
	"rewarded_popcorn" integer NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "mashong_mission_completions_mission_member_uq" UNIQUE("mission_id","member_id"),
	CONSTRAINT "mashong_mission_completions_rewarded_popcorn_gte_0_ck" CHECK ("mashong_mission_completions"."rewarded_popcorn" >= 0)
);
--> statement-breakpoint
CREATE TABLE "mashong_missions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"generation_id" bigint NOT NULL,
	"platform" "platform_enum" NOT NULL,
	"mission_category" "mission_category_enum" NOT NULL,
	"mission_type" "mission_type_enum" NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"target_value" integer NOT NULL,
	"reward_popcorn" integer NOT NULL,
	"is_active" boolean NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "mashong_missions_target_value_gte_0_ck" CHECK ("mashong_missions"."target_value" >= 0),
	CONSTRAINT "mashong_missions_reward_popcorn_gte_0_ck" CHECK ("mashong_missions"."reward_popcorn" >= 0)
);
--> statement-breakpoint
CREATE TABLE "mashongs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"generation_id" bigint NOT NULL,
	"platform" "platform_enum" NOT NULL,
	"level" integer NOT NULL,
	"current_popcorn" integer NOT NULL,
	"total_popcorn_earned" integer NOT NULL,
	"born_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "mashongs_generation_platform_uq" UNIQUE("generation_id","platform"),
	CONSTRAINT "mashongs_level_gte_1_ck" CHECK ("mashongs"."level" >= 1),
	CONSTRAINT "mashongs_current_popcorn_gte_0_ck" CHECK ("mashongs"."current_popcorn" >= 0),
	CONSTRAINT "mashongs_total_popcorn_earned_gte_0_ck" CHECK ("mashongs"."total_popcorn_earned" >= 0)
);
--> statement-breakpoint
CREATE TABLE "member_generation_activities" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"member_id" bigint NOT NULL,
	"generation_id" bigint NOT NULL,
	"platform" "platform_enum" NOT NULL,
	"role" "generation_role_enum" NOT NULL,
	"status" "generation_activity_status_enum" NOT NULL,
	"joined_at" timestamp with time zone NOT NULL,
	"left_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "member_generation_activities_member_generation_uq" UNIQUE("member_id","generation_id")
);
--> statement-breakpoint
CREATE TABLE "member_profiles" (
	"member_id" bigint PRIMARY KEY NOT NULL,
	"birth_date" date,
	"job_title" varchar(100),
	"company" varchar(120),
	"bio" text,
	"region" varchar(80),
	"instagram_url" varchar(2048),
	"github_url" varchar(2048),
	"behance_url" varchar(2048),
	"linkedin_url" varchar(2048),
	"tistory_url" varchar(2048),
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"oauth_provider" "oauth_provider_enum" NOT NULL,
	"oauth_provider_user_id" varchar(255) NOT NULL,
	"email" varchar(320),
	"name" varchar(100),
	"signup_completed" boolean NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uploader_id" bigint NOT NULL,
	"storage_path" varchar(2048) NOT NULL,
	"original_name" varchar(512) NOT NULL,
	"mime_type" varchar(255) NOT NULL,
	"is_active" boolean NOT NULL,
	"size" bigint NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"member_id" bigint NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seminar_attendance_records" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"attendance_checkpoint_id" bigint NOT NULL,
	"member_id" bigint NOT NULL,
	"score_delta" integer NOT NULL,
	"status" "attendance_status_enum" NOT NULL,
	"checked_at" timestamp with time zone,
	"check_method" "attendance_check_method_enum",
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "seminar_attendance_records_checkpoint_member_uq" UNIQUE("attendance_checkpoint_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "seminar_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"seminar_section_id" bigint NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "seminar_items_section_sort_order_uq" UNIQUE("seminar_section_id","sort_order"),
	CONSTRAINT "seminar_items_sort_order_gte_1_ck" CHECK ("seminar_items"."sort_order" >= 1)
);
--> statement-breakpoint
CREATE TABLE "seminar_schedules" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"generation_id" bigint NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"venue_name" varchar(255) NOT NULL,
	"venue_address" varchar(500),
	"venue_lat" numeric(9, 6),
	"venue_lng" numeric(9, 6),
	"notice" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seminar_sections" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"seminar_schedule_id" bigint NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "seminar_sections_schedule_sort_order_uq" UNIQUE("seminar_schedule_id","sort_order"),
	CONSTRAINT "seminar_sections_sort_order_gte_1_ck" CHECK ("seminar_sections"."sort_order" >= 1)
);
--> statement-breakpoint
ALTER TABLE "attendance_checkpoints" ADD CONSTRAINT "attendance_checkpoints_seminar_schedule_id_seminar_schedules_id_fk" FOREIGN KEY ("seminar_schedule_id") REFERENCES "public"."seminar_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "birthday_cards" ADD CONSTRAINT "birthday_cards_sender_member_id_members_id_fk" FOREIGN KEY ("sender_member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "birthday_cards" ADD CONSTRAINT "birthday_cards_receiver_member_id_members_id_fk" FOREIGN KEY ("receiver_member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "birthday_cards" ADD CONSTRAINT "birthday_cards_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_uploader_id_members_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "birthday_cards" ADD CONSTRAINT "birthday_cards_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrot_round_rankings" ADD CONSTRAINT "carrot_round_rankings_round_id_carrot_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."carrot_rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrot_round_rankings" ADD CONSTRAINT "carrot_round_rankings_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrot_rounds" ADD CONSTRAINT "carrot_rounds_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrot_shake_events" ADD CONSTRAINT "carrot_shake_events_round_id_carrot_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."carrot_rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrot_shake_events" ADD CONSTRAINT "carrot_shake_events_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrot_staked_count" ADD CONSTRAINT "carrot_staked_count_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrot_staked_count" ADD CONSTRAINT "carrot_staked_count_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_code_usages" ADD CONSTRAINT "invite_code_usages_invite_code_id_invite_codes_id_fk" FOREIGN KEY ("invite_code_id") REFERENCES "public"."invite_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_code_usages" ADD CONSTRAINT "invite_code_usages_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_created_by_member_id_members_id_fk" FOREIGN KEY ("created_by_member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mashong_daily_visits" ADD CONSTRAINT "mashong_daily_visits_mashong_id_mashongs_id_fk" FOREIGN KEY ("mashong_id") REFERENCES "public"."mashongs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mashong_daily_visits" ADD CONSTRAINT "mashong_daily_visits_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mashong_mission_completions" ADD CONSTRAINT "mashong_mission_completions_mission_id_mashong_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."mashong_missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mashong_mission_completions" ADD CONSTRAINT "mashong_mission_completions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mashong_mission_completions" ADD CONSTRAINT "mashong_mission_completions_mashong_id_mashongs_id_fk" FOREIGN KEY ("mashong_id") REFERENCES "public"."mashongs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mashong_missions" ADD CONSTRAINT "mashong_missions_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mashongs" ADD CONSTRAINT "mashongs_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_generation_activities" ADD CONSTRAINT "member_generation_activities_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_generation_activities" ADD CONSTRAINT "member_generation_activities_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seminar_attendance_records" ADD CONSTRAINT "seminar_attendance_records_attendance_checkpoint_id_attendance_checkpoints_id_fk" FOREIGN KEY ("attendance_checkpoint_id") REFERENCES "public"."attendance_checkpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seminar_attendance_records" ADD CONSTRAINT "seminar_attendance_records_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seminar_items" ADD CONSTRAINT "seminar_items_seminar_section_id_seminar_sections_id_fk" FOREIGN KEY ("seminar_section_id") REFERENCES "public"."seminar_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seminar_schedules" ADD CONSTRAINT "seminar_schedules_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seminar_sections" ADD CONSTRAINT "seminar_sections_seminar_schedule_id_seminar_schedules_id_fk" FOREIGN KEY ("seminar_schedule_id") REFERENCES "public"."seminar_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "carrot_round_rankings_round_id_idx" ON "carrot_round_rankings" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "carrot_round_rankings_member_id_idx" ON "carrot_round_rankings" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "carrot_shake_events_round_id_idx" ON "carrot_shake_events" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "carrot_shake_events_member_id_idx" ON "carrot_shake_events" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "generations_number_uq" ON "generations" USING btree ("number");--> statement-breakpoint
CREATE INDEX "invite_code_usages_invite_code_id_idx" ON "invite_code_usages" USING btree ("invite_code_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invite_code_usages_member_id_uq" ON "invite_code_usages" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invite_codes_code_uq" ON "invite_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "invite_codes_generation_id_idx" ON "invite_codes" USING btree ("generation_id");--> statement-breakpoint
CREATE INDEX "invite_codes_created_by_member_id_idx" ON "invite_codes" USING btree ("created_by_member_id");--> statement-breakpoint
CREATE INDEX "mashong_daily_visits_mashong_id_idx" ON "mashong_daily_visits" USING btree ("mashong_id");--> statement-breakpoint
CREATE INDEX "mashong_mission_completions_mashong_id_idx" ON "mashong_mission_completions" USING btree ("mashong_id");--> statement-breakpoint
CREATE INDEX "mashong_missions_generation_id_idx" ON "mashong_missions" USING btree ("generation_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_member_id_idx" ON "refresh_tokens" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "seminar_schedules_generation_id_idx" ON "seminar_schedules" USING btree ("generation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "images_storage_path_uq" ON "images" USING btree ("storage_path");