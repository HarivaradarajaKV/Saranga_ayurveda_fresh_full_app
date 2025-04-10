const { execSync } = require('child_process');

try {
    console.log('Starting Expo development server...');
    // Use execSync to run the command and inherit stdio
    execSync('npx expo start', { 
        stdio: 'inherit'  // This will show the QR code and all output directly in the console
    });
} catch (error) {
    console.error('Error starting Expo:', error.message);
    process.exit(1);
} 