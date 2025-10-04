#!/usr/bin/env node

/**
 * Performance Index Application Script
 * 
 * This script applies critical database indexes to dramatically improve
 * login and authentication performance.
 * 
 * Run this script after any database schema changes to ensure optimal performance.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyPerformanceIndexes() {
  console.log('🚀 Applying performance indexes...');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'prisma', 'migrations', 'add_performance_indexes.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 SQL file content length:', sqlContent.length);
    console.log('📄 First 200 chars:', sqlContent.substring(0, 200));
    
    // Clean up the SQL content and split by semicolon
    const cleanedContent = sqlContent
      .replace(/\r\n/g, ' ')  // Replace Windows line breaks
      .replace(/\n/g, ' ')    // Replace Unix line breaks
      .replace(/\s+/g, ' ')   // Replace multiple spaces with single space
      .trim();
    
    const allStatements = cleanedContent.split(';').map(stmt => stmt.trim());
    console.log('📄 Total statements after split:', allStatements.length);
    
    const statements = allStatements.filter(stmt => {
      const isValid = stmt.length > 0 && !stmt.startsWith('--') && stmt.toUpperCase().startsWith('CREATE INDEX');
      if (stmt.length > 0 && !stmt.startsWith('--') && stmt.length > 10) {
        console.log('📄 Statement:', stmt.substring(0, 50) + '...', 'Valid:', isValid);
      }
      return isValid;
    });
    
    console.log(`📊 Found ${statements.length} index statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement);
        successCount++;
        console.log(`✅ Applied: ${statement.split(' ')[2]} index`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️  Index already exists: ${statement.split(' ')[2]}`);
          successCount++;
        } else {
          console.error(`❌ Failed to apply: ${statement.split(' ')[2]}`, error.message);
          errorCount++;
        }
      }
    }
    
    console.log(`\n📈 Performance Index Summary:`);
    console.log(`   ✅ Successfully applied: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📊 Total: ${statements.length}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 All performance indexes applied successfully!');
      console.log('🚀 Login performance should be significantly improved.');
    } else {
      console.log('\n⚠️  Some indexes failed to apply. Check the errors above.');
    }
    
  } catch (error) {
    console.error('❌ Error applying performance indexes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  applyPerformanceIndexes()
    .then(() => {
      console.log('\n✨ Performance optimization complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Performance optimization failed:', error);
      process.exit(1);
    });
}

module.exports = { applyPerformanceIndexes };
