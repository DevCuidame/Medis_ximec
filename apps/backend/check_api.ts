import { UserRepository } from './src/repositories/user.repository.js';
import jwt from 'jsonwebtoken';
import http from 'http';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

async function test() {
  const admin = await UserRepository.findByEmail('admin@medisxime.com');
  const token = jwt.sign({ sub: admin.id, email: admin.email, role: admin.role }, JWT_SECRET, { expiresIn: '1h' });

  const req = http.request('http://localhost:3001/api/users', {
    headers: { 'Authorization': `Bearer ${token}` }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const parsed = JSON.parse(data);
      console.log(parsed.data.users.map((u: any) => ({ email: u.email, idNumber: u.idNumber })));
      process.exit(0);
    });
  });
  req.end();
}

test().catch(console.error);
