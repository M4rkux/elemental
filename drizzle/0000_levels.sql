CREATE TABLE "levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" integer NOT NULL,
	"stage" integer NOT NULL,
	"name" text NOT NULL,
	"data" jsonb NOT NULL,
	CONSTRAINT "levels_number_unique" UNIQUE("number")
);
