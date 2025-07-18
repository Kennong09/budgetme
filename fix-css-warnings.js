const fs = require('fs');
const path = require('path');

// Files to patch
const filesToPatch = [
  'node_modules/bootstrap/dist/css/bootstrap.min.css',
  'node_modules/startbootstrap-sb-admin-2/css/sb-admin-2.min.css'
];

console.log('🔍 Fixing deprecated CSS properties...');

filesToPatch.forEach(filePath => {
  try {
    const fullPath = path.resolve(filePath);
    console.log(`Checking file: ${fullPath}`);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ File not found: ${fullPath}`);
      return;
    }

    // Read file content
    let cssContent = fs.readFileSync(fullPath, 'utf8');
    console.log(`📄 File size: ${cssContent.length} bytes`);
    
    // Search for color-adjust occurrences
    const colorAdjustCount = (cssContent.match(/color-adjust:/g) || []).length;
    console.log(`🔍 Found ${colorAdjustCount} occurrences of 'color-adjust:' in ${filePath}`);
    
    // Replace color-adjust with print-color-adjust
    const originalContent = cssContent;
    cssContent = cssContent.replace(/color-adjust:/g, 'print-color-adjust:');
    
    // Write back to the file if changes were made
    if (cssContent !== originalContent) {
      fs.writeFileSync(fullPath, cssContent);
      console.log(`✅ Fixed deprecated CSS properties in ${filePath}`);
    } else {
      console.log(`ℹ️ No fixes needed in ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
  }
});

console.log('🎉 CSS patching complete!'); 