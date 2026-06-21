const http = require('http');
const { execSync } = require('child_process');
const { setTimeout: sleep } = require('timers/promises');

async function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3006${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: data.substring(0, 2000) }));
    }).on('error', reject);
  });
}

async function main() {
  console.log('Starting server...');
  const proc = require('child_process').spawn('npx.cmd', ['next', 'dev', '-p', '3006'], {
    cwd: process.cwd(),
    stdio: 'pipe',
    env: { ...process.env, NODE_ENV: 'development' }
  });

  proc.stdout.on('data', d => {
    const line = d.toString();
    if (line.includes('Ready')) console.log('✓ Server ready');
    if (line.includes('200')) process.stdout.write(line);
  });
  proc.stderr.on('data', d => process.stderr.write(d.toString()));

  // Wait for server
  await sleep(30000);

  // Test endpoints
  const endpoints = ['/api/fes/metrics', '/api/fes/track', '/api/fes/participants', '/api/health'];
  for (const ep of endpoints) {
    try {
      const result = await testEndpoint(ep);
      console.log(`\n${ep} → ${result.status}`);
      if (result.status === 200 && result.data.length < 500) console.log(result.data);
    } catch(e) {
      console.log(`${ep} → ERROR: ${e.message}`);
    }
  }

  proc.kill();
  process.exit(0);
}

main();
