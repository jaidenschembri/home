const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if serve.json exists
const serveConfigPath = path.join(__dirname, 'serve.json');
if (!fs.existsSync(serveConfigPath)) {
  console.error('serve.json not found. Please create it first.');
  process.exit(1);
}

console.log('Starting local development server with CORS enabled...');
console.log('Frontend will be available at: http://localhost:3000');
console.log('Backend API should be running at: http://127.0.0.1:8787');

// Start serve with the config file
const serve = exec('npx serve --config serve.json -l 3000');

serve.stdout.on('data', (data) => {
  console.log(data.toString());
});

serve.stderr.on('data', (data) => {
  console.error(data.toString());
});

serve.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('Stopping server...');
  serve.kill();
  process.exit(0);
}); 