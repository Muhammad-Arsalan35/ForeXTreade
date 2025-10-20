require('dotenv').config();

const base = process.env.BACKEND_URL?.replace(/\/$/, '') || 'http://localhost:5000/api';

async function post(path, body, headers = {}) {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, json };
}

async function get(path, headers = {}) {
  const res = await fetch(`${base}${path}`, { headers });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, json };
}

(async () => {
  try {
    const ts = Date.now();
    const email = `api_test_${ts}@example.com`;
    const password = 'TestPassword123!';

    console.log('1) Signup via backend API...');
    const signup = await post('/auth/signup', {
      full_name: 'API Test User',
      email,
      phone_number: '+15555550123',
      password
    });
    console.log('Signup status:', signup.status, 'ok:', signup.ok);
    console.log(JSON.stringify(signup.json, null, 2));
    if (!signup.ok) {
      console.error('Signup failed; aborting.');
      process.exit(1);
    }

    console.log('\n2) Login via backend API...');
    const login = await post('/auth/login', { identifier: email, password });
    console.log('Login status:', login.status, 'ok:', login.ok);
    console.log(JSON.stringify(login.json, null, 2));
    if (!login.ok) {
      console.error('Login failed; aborting.');
      process.exit(1);
    }

    const token = login.json?.data?.token;
    if (!token) {
      console.error('Missing token in login response');
      process.exit(1);
    }
    const authHeaders = { Authorization: `Bearer ${token}` };

    console.log('\n3) Fetch tasks with token...');
    const tasks = await get('/tasks', authHeaders);
    console.log('Tasks status:', tasks.status, 'ok:', tasks.ok);
    console.log(JSON.stringify(tasks.json, null, 2));

    console.log('\n4) Health check...');
    const health = await get('/health');
    console.log(JSON.stringify(health.json, null, 2));

    console.log('\n✅ Backend API signup/login/tasks test completed.');
  } catch (err) {
    console.error('Test error:', err.message);
    process.exit(1);
  }
})();