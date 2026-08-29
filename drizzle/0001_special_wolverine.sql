CREATE TABLE "player_progress" (
	"player_id" text NOT NULL,
	"level_number" integer NOT NULL,
	"best_steps" integer NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_progress_player_id_level_number_pk" PRIMARY KEY("player_id","level_number")
);
