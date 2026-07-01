CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"depts" text[] NOT NULL,
	"responses" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "applications_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "applications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "custom_author_name" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "custom_author_avatar" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "custom_author_bio" text;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "users manage own applications" ON "applications" AS RESTRICTIVE FOR ALL TO "authenticated" USING ((select auth.uid())::text = "user_id") WITH CHECK ((select auth.uid())::text = "user_id");