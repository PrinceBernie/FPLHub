const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Check if admin user exists
    let adminUser = await prisma.user.findUnique({
      where: {
        email: 'admin@fplhub.com'
      }
    });

    if (!adminUser) {
      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      adminUser = await prisma.user.create({
        data: {
          email: 'admin@fplhub.com',
          username: 'admin',
          password: hashedPassword,
          phone: '+233500000000',
          isVerified: true
        }
      });

      console.log('✅ Admin user created successfully!');
      console.log('Email:', adminUser.email);
      console.log('User ID:', adminUser.id);
    } else {
      // Update existing user to verified
      adminUser = await prisma.user.update({
        where: {
          id: adminUser.id
        },
        data: {
          isVerified: true
        }
      });

      console.log('✅ Admin user updated successfully!');
      console.log('Email:', adminUser.email);
      console.log('User ID:', adminUser.id);
    }

    console.log('\n🎯 You can now login with:');
    console.log('Email: admin@fplhub.com');
    console.log('Password: admin123');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
