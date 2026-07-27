CREATE TABLE "ledger_entries" (
	"id" serial PRIMARY KEY,
	"case_id" integer NOT NULL,
	"reference" text NOT NULL,
	"entry_type" text NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(18,2) NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recovery_cases" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"case_number" text NOT NULL,
	"client_name" text NOT NULL,
	"desk" text NOT NULL,
	"recovery_profit_balance" numeric(18,2) DEFAULT '0' NOT NULL,
	"recovery_affiliate_balance" numeric(18,2) DEFAULT '0' NOT NULL,
	"total_assets_recovery" numeric(18,2) DEFAULT '0' NOT NULL,
	"hardship_credits" numeric(18,2) DEFAULT '0' NOT NULL,
	"sync_progress" integer DEFAULT 0 NOT NULL,
	"synchronization_status" text DEFAULT 'Reconciliation active' NOT NULL,
	"asset_status" text DEFAULT 'Controlled hold' NOT NULL,
	"batch_status" text DEFAULT 'Ready' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_events" (
	"id" serial PRIMARY KEY,
	"case_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"title" text NOT NULL,
	"detail" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "recovery_cases_user_case_idx" ON "recovery_cases" ("user_id","case_number");--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_case_id_recovery_cases_id_fkey" FOREIGN KEY ("case_id") REFERENCES "recovery_cases"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_case_id_recovery_cases_id_fkey" FOREIGN KEY ("case_id") REFERENCES "recovery_cases"("id") ON DELETE CASCADE;