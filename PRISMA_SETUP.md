# Prisma ORM Setup with Supabase

## Prerequisites
- Node.js installed
- Supabase project created
- PostgreSQL database credentials from Supabase

## Installation Steps

### 1. Install Dependencies
```bash
npm install --save-dev prisma
npm install @prisma/client
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and update with your Supabase credentials:

```env
# Get these from Supabase Dashboard > Settings > Database
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

### 3. Initialize Prisma (First Time Setup)
```bash
npx prisma init
```

### 4. Pull Existing Schema from Supabase (Optional)
If you already have tables in Supabase:
```bash
npx prisma db pull
```

### 5. Generate Prisma Client
```bash
npx prisma generate
```

### 6. Create Initial Migration
```bash
npx prisma migrate dev --name init
```

### 7. Deploy to Production
```bash
npx prisma migrate deploy
```

## Database Schema

The Prisma schema includes:
- **User & Profile Management**: User authentication and profile data
- **Family Management**: Multi-user family groups with roles
- **Financial Accounts**: Bank accounts and balances
- **Categories**: Income and expense categories
- **Goals**: Financial goals with progress tracking
- **Transactions**: All financial transactions
- **Budgets**: Budget planning and tracking

## Multi-Schema Support

This setup uses Prisma's multi-schema feature:
- `auth` schema: For Supabase authentication users
- `public` schema: For application data

## Migration Strategy

### For New Supabase Database
1. Run migrations to create all tables
2. Execute seed script to populate initial data
3. Apply RLS policies using SQL scripts

### For Existing Database
1. Use `prisma db pull` to introspect current schema
2. Compare with our schema file
3. Create migration for differences
4. Test thoroughly before deploying

## Seed Data
Run the seed script to populate initial data:
```bash
npm run seed
```

## Common Commands

```bash
# Generate Prisma Client
npx prisma generate

# Create new migration
npx prisma migrate dev --name <migration_name>

# Deploy migrations to production
npx prisma migrate deploy

# Open Prisma Studio (GUI)
npx prisma studio

# Reset database (CAUTION: Deletes all data)
npx prisma migrate reset

# Format schema file
npx prisma format

# Validate schema
npx prisma validate
```

## Troubleshooting

### Connection Issues
- Ensure your Supabase project is active
- Check DATABASE_URL is correctly formatted
- Verify network connectivity to Supabase

### Migration Conflicts
- Use `npx prisma migrate resolve` for stuck migrations
- Check migration history with `npx prisma migrate status`

### Schema Sync Issues
- Run `npx prisma db pull` to sync with database
- Use `npx prisma format` to fix formatting issues

## RLS Policies and Triggers
After running Prisma migrations, apply RLS policies and triggers:
```bash
npm run apply-rls
```

This executes the SQL scripts in `src/sql/` directory to set up:
- Row Level Security policies
- Database triggers
- Custom functions
- Views and materialized views
