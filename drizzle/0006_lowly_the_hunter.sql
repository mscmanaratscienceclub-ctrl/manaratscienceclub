CREATE TABLE "campus_ambassador_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text DEFAULT 'campus' NOT NULL,
	"name" text NOT NULL,
	"class" text NOT NULL,
	"school" text NOT NULL,
	"phone" text,
	"email" text,
	"gender" text,
	"facebook" text,
	"instagram" text,
	"experience" text NOT NULL,
	"first_time_ca" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campus_ambassador_registrations_type_check" CHECK ("campus_ambassador_registrations"."type" in ('campus', 'batch')),
	CONSTRAINT "campus_ambassador_registrations_gender_check" CHECK ("campus_ambassador_registrations"."gender" is null or "campus_ambassador_registrations"."gender" in ('male', 'female', 'other'))
);
--> statement-breakpoint
ALTER TABLE "campus_ambassador_registrations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "volunteer_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"class_section" text NOT NULL,
	"roll" text NOT NULL,
	"shift" text NOT NULL,
	"student_code" text NOT NULL,
	"address" text NOT NULL,
	"personal_phone" text NOT NULL,
	"parents_phone" text NOT NULL,
	"attendance_week" text NOT NULL,
	"parents_comfort" text NOT NULL,
	"campus_hesitation" text NOT NULL,
	"scenario_task_conflict" text NOT NULL,
	"scenario_peer_conduct" text NOT NULL,
	"selection_reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "volunteer_registrations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "stem_fest_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"class" text NOT NULL,
	"school" text NOT NULL,
	"segments" text NOT NULL,
	"transaction_id" text NOT NULL,
	"payment_number" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stem_fest_registrations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "stem_fest_payment_sms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_message_id" text,
	"sender" text NOT NULL,
	"raw_message" text NOT NULL,
	"transaction_id" text,
	"amount" numeric(10, 2),
	"sender_number" text,
	"status" text DEFAULT 'unmatched' NOT NULL,
	"matched_registration_id" uuid,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stem_fest_payment_sms_client_message_id_unique" UNIQUE("client_message_id")
);
--> statement-breakpoint
ALTER TABLE "stem_fest_payment_sms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "stem_fest_payment_sms" ADD CONSTRAINT "stem_fest_payment_sms_matched_registration_id_stem_fest_registrations_id_fk" FOREIGN KEY ("matched_registration_id") REFERENCES "public"."stem_fest_registrations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campus_ambassador_registrations_created_at_idx" ON "campus_ambassador_registrations" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "volunteer_registrations_created_at_idx" ON "volunteer_registrations" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "stem_fest_registrations_created_at_idx" ON "stem_fest_registrations" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "stem_fest_payment_sms_trx_idx" ON "stem_fest_payment_sms" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "stem_fest_payment_sms_status_idx" ON "stem_fest_payment_sms" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stem_fest_payment_sms_created_at_idx" ON "stem_fest_payment_sms" USING btree ("created_at" DESC NULLS LAST);