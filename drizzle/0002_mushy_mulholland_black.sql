CREATE TABLE "mashong" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"generateion_id" bigint NOT NULL,
	"platform" "platform_enum" NOT NULL,
	"level" bigint DEFAULT 1 NOT NULL,
	"accumulated_popcorn" bigint DEFAULT 0 NOT NULL,
	"last_popcorn" bigint DEFAULT 0 NOT NULL,
	"goal_popcorn" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mashong_generation_platform_uq" UNIQUE("generateion_id","platform")
);
--> statement-breakpoint
CREATE TABLE "mashong_attendance" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"member_id" bigint NOT NULL,
	"seq" integer NOT NULL,
	"attendance_date" date DEFAULT CURRENT_DATE NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mashong_attendance_member_date_seq_uq" UNIQUE("member_id","attendance_date","seq")
);
--> statement-breakpoint
CREATE TABLE "mashong_level" (
	"level" bigint NOT NULL,
	"goal_popcorn" bigint NOT NULL,
	CONSTRAINT "mashong_level_uq" UNIQUE("level")
);
--> statement-breakpoint
ALTER TABLE "seminar_schedules" ALTER COLUMN "description" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "seminar_schedules" ALTER COLUMN "started_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "seminar_schedules" ALTER COLUMN "ended_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "seminar_schedules" ALTER COLUMN "venue_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "seminar_schedules" ALTER COLUMN "notice" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "mashong" ADD CONSTRAINT "mashong_generateion_id_generations_id_fk" FOREIGN KEY ("generateion_id") REFERENCES "public"."generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mashong_attendance" ADD CONSTRAINT "mashong_attendance_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;