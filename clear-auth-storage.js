// Script to clear authentication storage for testing
// Run this in the browser console to clear all auth-related storage

console.log('Clearing authentication storage...');

// Clear localStorage items
const keys = Object.keys(localStorage);
keys.forEach(key => {
  if (key.includes('auth') || key.includes('supabase') || key.includes('budgetme')) {
    console.log('Removing:', key);
    localStorage.removeItem(key);
  }
});

// Clear sessionStorage items
const sessionKeys = Object.keys(sessionStorage);
sessionKeys.forEach(key => {
  if (key.includes('auth') || key.includes('supabase') || key.includes('budgetme')) {
    console.log('Removing from session:', key);
    sessionStorage.removeItem(key);
  }
});

console.log('Authentication storage cleared! You can now test login/logout functionality.');