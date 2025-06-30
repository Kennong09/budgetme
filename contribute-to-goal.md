# Goal Contribution SQL Function

This SQL file defines a stored procedure for the Supabase database that handles goal contributions in the BudgetMe application.

## Overview

The `contribute_to_goal` function provides an atomic transaction for contributing funds from a user's account to a financial goal. It handles:

1. Validating sufficient funds in the source account
2. Creating a transaction record
3. Updating the account balance
4. Updating the goal progress
5. Automatically marking goals as completed when the target amount is reached

## Installation

To install this function in your Supabase project:

1. Navigate to the SQL Editor in the Supabase Dashboard
2. Create a new query
3. Copy and paste the contents of `contribute-to-goal.sql` into the editor
4. Run the query to create the function

## Usage from JavaScript/TypeScript

```typescript
// Example usage in a React component
const makeContribution = async () => {
  try {
    const { data, error } = await supabase.rpc('contribute_to_goal', {
      p_goal_id: goalId,
      p_amount: amount,
      p_account_id: accountId,
      p_notes: notes,
      p_user_id: userId
    });
    
    if (error) throw error;
    
    // Handle success
    console.log('Contribution successful');
  } catch (err) {
    // Handle error
    console.error('Error making contribution:', err.message);
  }
};
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| p_goal_id | TEXT | The UUID of the goal to contribute to |
| p_amount | NUMERIC | The amount to contribute |
| p_account_id | TEXT | The UUID of the account to withdraw funds from |
| p_notes | TEXT | Description or notes for the transaction |
| p_user_id | TEXT | The UUID of the user making the contribution |

## Return Value

The function returns a boolean value:
- `TRUE` if the contribution was successful
- Raises an exception if there was an error

## Error Handling

The function will raise exceptions for the following conditions:
- Insufficient funds in the source account
- Goal not found
- Account not found
- Database errors during transaction processing

## Security

The function is defined with `SECURITY DEFINER` which means it runs with the permissions of the database user who created it, rather than the permissions of the caller. This ensures that proper access controls are maintained. 