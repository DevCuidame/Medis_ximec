import { UserRepository } from './src/repositories/user.repository.js';

async function test() {
  const users = await UserRepository.list();
  console.log(users.map(u => ({ email: u.email, idNumber: u.idNumber })));
  process.exit(0);
}

test().catch(console.error);
