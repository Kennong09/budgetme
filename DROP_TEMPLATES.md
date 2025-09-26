# Database Object Cleanup Templates
**Safe DROP Statement Patterns for SQL Schema Files**

## Drop Order Strategy

Objects must be dropped in reverse dependency order to prevent referential integrity violations:

```
1. Views & Materialized Views
2. Policies (RLS)
3. Triggers
4. Functions
5. Indexes
6. Constraints (FK)
7. Tables
8. Types & Domains
```

## Safety Framework Templates

### 1. Policies (Row Level Security)
```sql
-- Drop policies first
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "policy_name" ON schema.table_name;
    -- Additional policies...
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
```

### 2. Triggers
```sql
-- Drop triggers
DO $$ 
BEGIN
    DROP TRIGGER IF EXISTS trigger_name ON schema.table_name;
    -- Additional triggers...
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
```

### 3. Functions
```sql
-- Drop functions
DO $$ 
BEGIN
    DROP FUNCTION IF EXISTS schema.function_name(parameter_types);
    -- Additional functions...
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
```

### 4. Views and Materialized Views
```sql
-- Drop views (use CASCADE for dependent objects)
DROP VIEW IF EXISTS schema.view_name CASCADE;
DROP MATERIALIZED VIEW IF EXISTS schema.materialized_view_name CASCADE;
```

### 5. Indexes
```sql
-- Drop indexes
DROP INDEX IF EXISTS schema.index_name;
```

### 6. Tables
```sql
-- Drop tables (use CASCADE for tables with dependents)
DROP TABLE IF EXISTS schema.table_name CASCADE;
```

## Complete Template Structure

```sql
-- =====================================================
-- CLEANUP: DROP EXISTING OBJECTS
-- =====================================================

-- Drop policies first
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "policy_name" ON schema.table_name;
    -- ... more policies
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop triggers
DO $$ 
BEGIN
    DROP TRIGGER IF EXISTS trigger_name ON schema.table_name;
    -- ... more triggers
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop functions
DO $$ 
BEGIN
    DROP FUNCTION IF EXISTS schema.function_name(parameter_types);
    -- ... more functions
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop views
DROP VIEW IF EXISTS schema.view_name CASCADE;
DROP MATERIALIZED VIEW IF EXISTS schema.materialized_view_name CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS schema.index_name;

-- Drop tables
DROP TABLE IF EXISTS schema.table_name CASCADE;

-- =====================================================
-- EXISTING CONTENT PRESERVED BELOW
-- =====================================================
-- [All existing content remains unchanged]
```

## Function Signature Examples

Functions must specify exact parameter types for proper dropping:

```sql
-- Example function signatures from analysis:
DROP FUNCTION IF EXISTS public.update_goal_progress();
DROP FUNCTION IF EXISTS public.contribute_to_goal(UUID, DECIMAL, UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS public.create_period_budget(UUID, TEXT, DECIMAL, TEXT, UUID, TEXT, DATE);
DROP FUNCTION IF EXISTS public.is_admin_user();
DROP FUNCTION IF EXISTS public.log_admin_activity(UUID, TEXT, TEXT, JSONB, TEXT);
```

## Special Considerations

### Circular Dependencies
- Some files like `06-post-constraints.sql` handle circular dependencies
- These need careful ordering of DROP statements

### Complex Functions
- Functions with multiple signatures need specific parameter types
- Use CASCADE only when necessary

### Materialized Views
- Use CASCADE for materialized views with dependent objects
- Example: `DROP MATERIALIZED VIEW IF EXISTS public.user_financial_summary CASCADE;`

### Error Handling
- Use DO blocks with exception handling for policies, triggers, and functions
- Use simple DROP IF EXISTS for views, indexes, and tables
- EXCEPTION WHEN OTHERS THEN NULL; prevents script failure