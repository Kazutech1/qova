import 'dotenv/config';
import { getMasterBalance, getSubaccounts } from '../src/services/nomba';

async function main() {
  const [master_wallet, subaccounts] = await Promise.all([getMasterBalance(), getSubaccounts()]);
  const totalKobo = subaccounts.reduce((s, a) => s + a.balanceKobo, 0);
  console.log(JSON.stringify({
    master_wallet,
    subaccounts,
    summary: { count: subaccounts.length, totalKobo, totalNaira: (totalKobo / 100).toFixed(2), currency: 'NGN' },
  }, null, 2));
}

main().catch(console.error);
