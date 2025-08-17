const { exec } = require('child_process');

console.log('🔄 Installing Prisma dependencies...');

// Install packages
exec('npm install @prisma/client prisma', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Installation failed:', error);
    return;
  }
  console.log('✅ Dependencies installed');
  
  // Generate Prisma client
  console.log('🔄 Generating Prisma client...');
  exec('npx prisma generate', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Client generation failed:', error);
      console.log('Please run: npx prisma generate');
      return;
    }
    console.log('✅ Prisma client generated successfully');
    console.log(stdout);
  });
});
