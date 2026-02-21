CREATE TABLE "company_profiles" (
	"address" text NOT NULL,
	"company_email" text NOT NULL,
	"company_name" text NOT NULL,
	"company_phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"logo_url" text,
	"rc_number" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "company_profiles_rc_number_unique" UNIQUE("rc_number"),
	CONSTRAINT "company_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "individual_profiles" ADD COLUMN "id_number" text;--> statement-breakpoint
ALTER TABLE "rider_profiles" ADD COLUMN "id_number" text NOT NULL;--> statement-breakpoint
ALTER TABLE "company_profiles" ADD CONSTRAINT "company_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "individual_profiles" ADD CONSTRAINT "individual_profiles_id_number_unique" UNIQUE("id_number");--> statement-breakpoint
ALTER TABLE "rider_profiles" ADD CONSTRAINT "rider_profiles_id_number_unique" UNIQUE("id_number");