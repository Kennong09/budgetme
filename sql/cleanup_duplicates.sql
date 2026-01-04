-- Script to clean up duplicate predictions
-- Run this in Supabase SQL Editor

-- First, check what we have
SELECT id, timeframe, generated_at, confidence_score, access_count
FROM prophet_predictions 
WHERE user_id = 'fd158bbc-ae37-4adc-893a-1cc4c0fdb958'
ORDER BY generated_at DESC;

-- Delete the older duplicate (keeping the one with access_count = 60)
DELETE FROM prophet_predictions 
WHERE id = 'cbb217d7-aba1-4dcb-ad11-3a389077441c';

-- Verify cleanup
SELECT id, timeframe, generated_at, confidence_score, access_count
FROM prophet_predictions 
WHERE user_id = 'fd158bbc-ae37-4adc-893a-1cc4c0fdb958'
ORDER BY generated_at DESC;

