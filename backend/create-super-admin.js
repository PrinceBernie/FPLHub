#!/usr/bin/env node

// File: fpl-hub-backend/create-super-admin.js
// Script to create initial Super Admin user

const readline = require('readline');
const AdminUserService = require('./src/services/adminUserService');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function createSuperAdmin() {
  console.log('🔐 FPL Hub - Create Initial Super Admin\n');
  console.log('This script will create the first Super Admin user for your FPL Hub system.');
  console.log('Only one Super Admin can be created using this method.\n');

  try {
    // Get Super Admin details
    const email = await askQuestion('📧 Super Admin Email: ');
    const username = await askQuestion('👤 Username: ');
    const phone = await askQuestion('📱 Phone Number (with country code, e.g., +233501234567): ');
    
    // Get password with confirmation
    let password, confirmPassword;
    do {
      password = await askQuestion('🔒 Password (min 8 characters): ');
      if (password.length < 8) {
        console.log('❌ Password must be at least 8 characters long\n');
        continue;
      }
      
      confirmPassword = await askQuestion('🔒 Confirm Password: ');
      if (password !== confirmPassword) {
        console.log('❌ Passwords do not match\n');
      }
    } while (password.length < 8 || password !== confirmPassword);

    // Confirm creation
    console.log('\n📋 Super Admin Details:');
    console.log(`Email: ${email}`);
    console.log(`Username: ${username}`);
    console.log(`Phone: ${phone}`);
    console.log(`Role: SUPER_ADMIN`);
    
    const confirm = await askQuestion('\n✅ Create this Super Admin user? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
      console.log('❌ Super Admin creation cancelled.');
      rl.close();
      return;
    }

    // Create Super Admin
    console.log('\n🔄 Creating Super Admin...');
    
    const result = await AdminUserService.createInitialSuperAdmin({
      email,
      username,
      password,
      phone
    });

    if (result.success) {
      console.log('\n🎉 Super Admin created successfully!');
      console.log('\n📋 Login Details:');
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
      console.log('\n⚠️  IMPORTANT: Save these credentials securely!');
      console.log('\n🚀 You can now:');
      console.log('1. Login to the admin panel');
      console.log('2. Create additional admin users via API');
      console.log('3. Promote existing users to admin roles');
    } else {
      console.log('❌ Failed to create Super Admin:', result.error);
    }

  } catch (error) {
    console.error('❌ Error creating Super Admin:', error.message);
    
    if (error.message.includes('Super Admin already exists')) {
      console.log('\n💡 To create additional admin users:');
      console.log('1. Login as Super Admin');
      console.log('2. Use POST /api/admin/users/create-admin');
      console.log('3. Or use POST /api/admin/users/promote to promote existing users');
    }
  } finally {
    rl.close();
  }
}

// Handle script termination
process.on('SIGINT', () => {
  console.log('\n\n❌ Super Admin creation cancelled.');
  rl.close();
  process.exit(0);
});

// Run the script
createSuperAdmin();

