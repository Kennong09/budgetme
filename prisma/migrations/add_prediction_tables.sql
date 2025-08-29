-- CreateTable
CREATE TABLE "prediction_usage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "max_usage" INTEGER NOT NULL DEFAULT 5,
    "reset_date" TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "prediction_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediction_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "prediction_data" JSONB NOT NULL,
    "ai_insights" JSONB,
    "timeframe" VARCHAR(20) NOT NULL,
    "confidence_score" DECIMAL(3,2),
    "model_accuracy" JSONB,
    "generated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "expires_at" TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),

    CONSTRAINT "prediction_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prediction_usage_user_id_key" ON "prediction_usage"("user_id");

-- CreateIndex
CREATE INDEX "idx_prediction_usage_user_id" ON "prediction_usage"("user_id");

-- CreateIndex
CREATE INDEX "idx_prediction_usage_reset_date" ON "prediction_usage"("reset_date");

-- CreateIndex
CREATE INDEX "idx_prediction_results_user_id" ON "prediction_results"("user_id");

-- CreateIndex
CREATE INDEX "idx_prediction_results_timeframe" ON "prediction_results"("timeframe");

-- CreateIndex
CREATE INDEX "idx_prediction_results_expires_at" ON "prediction_results"("expires_at");

-- CreateIndex
CREATE INDEX "idx_prediction_results_generated_at" ON "prediction_results"("generated_at");

-- AddForeignKey
ALTER TABLE "prediction_usage" ADD CONSTRAINT "prediction_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_results" ADD CONSTRAINT "prediction_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add constraints
ALTER TABLE "prediction_usage" ADD CONSTRAINT "usage_count_non_negative" CHECK ("usage_count" >= 0);
ALTER TABLE "prediction_usage" ADD CONSTRAINT "max_usage_positive" CHECK ("max_usage" > 0);
ALTER TABLE "prediction_results" ADD CONSTRAINT "valid_timeframe" CHECK ("timeframe" IN ('months_3', 'months_6', 'year_1'));
ALTER TABLE "prediction_results" ADD CONSTRAINT "valid_confidence" CHECK ("confidence_score" >= 0.0 AND "confidence_score" <= 1.0);

-- Enable RLS
ALTER TABLE "prediction_usage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prediction_results" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own prediction usage" ON "prediction_usage" FOR ALL USING ("user_id" = auth.uid());
CREATE POLICY "Users can view their own prediction results" ON "prediction_results" FOR SELECT USING ("user_id" = auth.uid());
CREATE POLICY "Users can insert their own prediction results" ON "prediction_results" FOR INSERT WITH CHECK ("user_id" = auth.uid());
CREATE POLICY "Users can update their own prediction results" ON "prediction_results" FOR UPDATE USING ("user_id" = auth.uid()) WITH CHECK ("user_id" = auth.uid());
CREATE POLICY "Users can delete their own prediction results" ON "prediction_results" FOR DELETE USING ("user_id" = auth.uid());