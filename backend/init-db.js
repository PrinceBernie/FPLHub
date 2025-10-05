#!/usr/bin/env node

// Database initialization script for Railway deployment
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Initializing database for Railway deployment...');

try {
  // Ensure the prisma directory exists
  const prismaDir = path.join(__dirname, 'prisma');
  if (!fs.existsSync(prismaDir)) {
    fs.mkdirSync(prismaDir, { recursive: true });
  }

  // Set environment variables for Prisma
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./prisma/production.db';
  
  console.log('📊 Database URL:', process.env.DATABASE_URL);

  // Generate Prisma client
  console.log('🔧 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  // Run database migrations
  console.log('📦 Running database migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });

  // Verify database connection
  console.log('✅ Verifying database connection...');
  execSync('npx prisma db push', { stdio: 'inherit' });

  console.log('🎉 Database initialization completed successfully!');
  
} catch (error) {
  console.error('❌ Database initialization failed:', error.message);
  process.exit(1);
}
