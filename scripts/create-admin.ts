import { createInitialAdmin } from "../src/lib/auth/bootstrap.ts";

const [username, rpName, password] = process.argv.slice(2);

if (!username || !rpName || !password) {
  throw new Error("Usage: pnpm admin:create <username> <rp-name> <password>");
}

const profile = await createInitialAdmin({ username, rpName, password });
console.log(`Created admin ${profile.username}.`);
