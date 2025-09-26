-- =====================================================
-- SQL SCHEMAS DEPLOYMENT SCRIPT
-- =====================================================
-- This script deploys all SQL schemas in the correct order
-- to avoid dependency issues
-- Files have been renamed to match deployment sequence
-- =====================================================

\echo 'Starting SQL schemas deployment...'

-- =====================================================
-- STEP 1: FOUNDATION - Authentication System
-- =====================================================
\echo 'Deploying authentication schema (foundation)...'
\i 01-auth-schema.sql

-- =====================================================
-- STEP 2: UTILITIES - Shared functions and utilities
-- =====================================================
\echo 'Deploying shared utilities schema...'
\i 02-shared-schema.sql

-- =====================================================
-- STEP 3: CORE TABLES - Main business logic
-- =====================================================
\echo 'Deploying family schema...'
\i 03-family-schema.sql

\echo 'Deploying transactions schema...'
\i 04-transactions-schema.sql

\echo 'Deploying goals schema...'
\i 05-goals-schema.sql

\echo 'Applying post-deployment constraints...'
\i 06-post-constraints.sql

\echo 'Deploying budget schema...'
\i 07-budget-schema.sql

-- =====================================================
-- STEP 4: ADMINISTRATIVE - Admin functions
-- =====================================================
\echo 'Deploying admin schema...'
\i 08-admin-schema.sql

-- =====================================================
-- STEP 5: FEATURE MODULES - Additional features
-- =====================================================
\echo 'Deploying chatbot schema...'
\i 09-chatbot-schema.sql

\echo 'Deploying dashboard schema...'
\i 10-dashboard-schema.sql

\echo 'Deploying predictions schema...'
\i 11-predictions-schema.sql

\echo 'Deploying reports schema...'
\i 12-reports-schema.sql

\echo 'Deploying settings schema...'
\i 13-settings-schema.sql

\echo 'Applying final post-deployment updates...'
\i 14-post-admin-constraints.sql

-- =====================================================
-- DEPLOYMENT COMPLETE
-- =====================================================
\echo 'All SQL schemas deployed successfully!'
\echo 'Deployment order followed:'
\echo '1. Authentication (01-auth-schema.sql)'
\echo '2. Shared utilities (02-shared-schema.sql)'
\echo '3. Family management (03-family-schema.sql)'
\echo '4. Transactions (04-transactions-schema.sql)'
\echo '5. Goals (05-goals-schema.sql)'
\echo '6. Post-deployment constraints (06-post-constraints.sql)'
\echo '7. Budgets (07-budget-schema.sql)'
\echo '8. Admin (08-admin-schema.sql)'
\echo '9. Feature modules (09-13)'
\echo '10. Final post-admin updates (14-post-admin-constraints.sql)'