// Test connection feature
const http = require('http');

function makeRequest(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(body);
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test() {
  try {
    console.log('=== Testing Connection Feature ===\n');

    // Register Alice
    console.log('1. Registering Alice...');
    let res = await makeRequest('POST', '/api/auth/register', {
      name: 'Alice',
      email: 'alice@test.com',
      password: 'pass123',
      course: 'BCA',
      semester: 'Semester I'
    });
    console.log(`   Success: ${res.success}\n`);

    // Register Bob
    console.log('2. Registering Bob...');
    res = await makeRequest('POST', '/api/auth/register', {
      name: 'Bob',
      email: 'bob@test.com',
      password: 'pass123',
      course: 'BCA',
      semester: 'Semester I'
    });
    console.log(`   Success: ${res.success}\n`);

    // Login Alice
    console.log('3. Login Alice...');
    res = await makeRequest('POST', '/api/auth/login', {
      email: 'alice@test.com',
      password: 'pass123'
    });
    const aliceToken = res.token;
    console.log(`   Token: ${aliceToken.substring(0, 8)}...\n`);

    // Login Bob
    console.log('4. Login Bob...');
    res = await makeRequest('POST', '/api/auth/login', {
      email: 'bob@test.com',
      password: 'pass123'
    });
    const bobToken = res.token;
    const bobUserId = res.user.id;
    console.log(`   Token: ${bobToken.substring(0, 8)}...\n`);

    // Alice sends connection request
    console.log('5. Alice sends connection request to Bob...');
    res = await makeRequest('POST', '/api/connections/request', {
      receiver_id: bobUserId,
      subject: 'DBMS'
    }, aliceToken);
    console.log(`   Response:`, res);
    if (!res.success) {
      console.log(`   ❌ Failed: ${res.error}`);
      return;
    }
    console.log(`   ✅ Success: ${res.message}\n`);

    // Bob checks pending requests
    console.log('6. Bob checks pending requests...');
    res = await makeRequest('GET', '/api/connections/requests', null, bobToken);
    console.log(`   Response:`, res);
    if (!res.requests || res.requests.length === 0) {
      console.log(`   ❌ No pending requests found\n`);
      return;
    }
    console.log(`   ✅ Pending requests: ${res.requests.length}`);
    console.log(`   From: ${res.requests[0].name} (Subject: ${res.requests[0].subject})\n`);

    const requestId = res.requests[0].id;

    // Bob accepts request
    console.log('7. Bob accepts connection request...');
    res = await makeRequest('POST', `/api/connections/accept/${requestId}`, {}, bobToken);
    console.log(`   Response:`, res);
    if (!res.success) {
      console.log(`   ❌ Failed: ${res.error}\n`);
      return;
    }
    console.log(`   ✅ Success: ${res.message}\n`);

    // Check both users' connections
    console.log('8. Alice checks her connections...');
    res = await makeRequest('GET', '/api/connections', null, aliceToken);
    console.log(`   Connections: ${res.connections.length}`);
    if (res.connections.length > 0) {
      console.log(`   Connected with: ${res.connections[0].user.name}\n`);
    }

    // Test creating a group
    console.log('9. Alice creates a study group...');
    res = await makeRequest('POST', '/api/groups', {
      name: 'DBMS Study Group',
      subject: 'DBMS'
    }, aliceToken);
    console.log(`   Success: ${res.success}`);
    console.log(`   Message: ${res.message}\n`);

    console.log('✅ All tests passed!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

test();
