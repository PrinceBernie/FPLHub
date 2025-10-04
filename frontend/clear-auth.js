// Script to clear invalid authentication data from localStorage
// Run this in the browser console to fix authentication issues

console.log('🧹 CLEARING AUTHENTICATION DATA...');

// Clear all auth-related localStorage items
localStorage.removeItem('auth_token');
localStorage.removeItem('user');
localStorage.removeItem('auth_token_expiry');

// Clear any other potential auth-related items
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.includes('auth') || key.includes('token') || key.includes('user'))) {
    keysToRemove.push(key);
  }
}

keysToRemove.forEach(key => {
  localStorage.removeItem(key);
  console.log(`✅ Removed: ${key}`);
});

console.log('✅ Authentication data cleared!');
console.log('🔄 Please refresh the page and log in again.');

// Optional: Force page reload
if (confirm('Clear authentication data and reload page?')) {
  window.location.reload();
}
