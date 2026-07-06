import 'dotenv/config';
import jwt from 'jsonwebtoken';

const USER_ID = '6a2a9a3b66805a1870fb7e2a';
const CIRCLE_ID = '6a4a8eeeea21035d699aee29';
const BASE = 'https://qova-j40s.onrender.com';

async function main() {
  const token = jwt.sign({ userId: USER_ID }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  for (const path of [`/circles/${CIRCLE_ID}/mandate`, `/circles/${CIRCLE_ID}/card-autopay`]) {
    try {
      const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
      console.log(path, '→', res.status, (await res.text()).slice(0, 150));
    } catch (e: any) {
      console.log(path, '→ FETCH ERROR:', e.message);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
