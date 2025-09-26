# Supabase Rate Limiting Implementation

This document explains how to use the Supabase rate limiting system implemented in this application.

## Overview

The rate limiting system provides client-side rate limiting for Supabase operations to:
- Prevent exceeding API limits
- Provide better user experience
- Handle rate limit errors gracefully
- Implement retry logic for failed requests

## Core Components

### 1. SupabaseRateLimiter Service

The main service that handles rate limiting logic.

```typescript
import { SupabaseRateLimiter } from '../services/supabaseRateLimiter';

// Configure rate limiting (optional)
SupabaseRateLimiter.configure({
  maxRequests: 100,
  timeWindow: 60000, // 1 minute
  retryDelay: 1000,  // 1 second
  maxRetries: 3
});

// Execute a function with rate limiting
const result = await SupabaseRateLimiter.executeWithRateLimit('my-operation-key', async () => {
  // Your Supabase operation here
  return await supabase.from('table').select('*');
});

// Check rate limit status
const status = SupabaseRateLimiter.getRateLimitStatus('my-operation-key');
console.log(status.allowed, status.count, status.maxRequests);
```

### 2. useRateLimiter Hook

A React hook for using rate limiting in components.

```typescript
import { useRateLimiter } from '../hooks/useRateLimiter';

function MyComponent() {
  const { executeWithLimit, isRateLimited, waitTime } = useRateLimiter();
  
  const handleOperation = async () => {
    try {
      const result = await executeWithLimit('my-operation', async () => {
        return await supabase.from('table').select('*');
      });
    } catch (error) {
      // Handle error
    }
  };
  
  if (isRateLimited) {
    return <div>Please wait {waitTime} seconds before trying again</div>;
  }
  
  return <button onClick={handleOperation}>Perform Operation</button>;
}
```

### 3. Rate Limit Utilities

Utility functions for common operations.

```typescript
import { 
  rateLimitedDbOperation, 
  RATE_LIMIT_KEYS 
} from '../utils/supabaseRateLimitUtils';

// Rate limited database select
const users = await rateLimitedDbOperation.select(
  RATE_LIMIT_KEYS.DB_SELECT('users'),
  () => supabase.from('users').select('*')
);
```

## Configuration

The rate limiter is configured in `src/config/supabaseRateLimitConfig.ts` with the following defaults:

- **Max Requests**: 100 per time window
- **Time Window**: 60 seconds (1 minute)
- **Retry Delay**: 1 second
- **Max Retries**: 3

## Usage Examples

### 1. Auth Operations

```typescript
import { signInWithEmail } from '../utils/authService';
import { RATE_LIMIT_KEYS } from '../utils/supabaseRateLimitUtils';

// Using the auth service (already implements rate limiting)
const result = await signInWithEmail('user@example.com', 'password');

// Or using the rate limiter directly
const result = await SupabaseRateLimiter.executeWithRateLimit(
  RATE_LIMIT_KEYS.AUTH_SIGNIN('user@example.com'),
  async () => {
    return await supabase.auth.signInWithPassword({
      email: 'user@example.com',
      password: 'password'
    });
  }
);
```

### 2. Database Operations

```typescript
import { rateLimitedDbOperation, RATE_LIMIT_KEYS } from '../utils/supabaseRateLimitUtils';

// Select with rate limiting
const { data, error } = await rateLimitedDbOperation.select(
  RATE_LIMIT_KEYS.DB_SELECT('profiles'),
  () => supabase.from('profiles').select('*')
);

// Insert with rate limiting
const { data, error } = await rateLimitedDbOperation.insert(
  RATE_LIMIT_KEYS.DB_INSERT('profiles'),
  () => supabase.from('profiles').insert({ name: 'John' })
);
```

### 3. Custom Operations

```typescript
import { SupabaseRateLimiter } from '../services/supabaseRateLimiter';

// Custom operation with rate limiting
const result = await SupabaseRateLimiter.executeWithRateLimit(
  'custom:my-operation:user123',
  async () => {
    // Your custom logic here
    return await someAsyncOperation();
  },
  { retries: 2 } // Custom retry count
);
```

## Error Handling

The rate limiter automatically handles rate limit errors:

```typescript
try {
  const result = await SupabaseRateLimiter.executeWithRateLimit('my-key', async () => {
    return await supabase.from('table').select('*');
  });
} catch (error) {
  if (error.message.includes('Rate limit exceeded')) {
    // Show user-friendly message
    alert('Too many requests. Please try again later.');
  }
}
```

## Best Practices

1. **Use descriptive keys**: Use meaningful keys that identify the operation and user
2. **Group related operations**: Use the same key for related operations that should share limits
3. **Handle errors gracefully**: Always catch and handle rate limit errors
4. **Provide user feedback**: Inform users when they're rate limited and how long to wait
5. **Monitor usage**: Use `getRateLimitStatus` to monitor usage and warn users before limits

## Resetting Limits

```typescript
// Reset a specific key
SupabaseRateLimiter.resetRateLimit('my-operation-key');

// Reset all limits (use with caution)
SupabaseRateLimiter.resetAllRateLimits();
```

## Supabase Free Tier Limits

Keep in mind Supabase free tier limits:
- 30,000 requests per day
- 500 MB database space
- 1 GB bandwidth
- 100 MB storage

The rate limiter helps prevent hitting these limits by implementing client-side throttling.