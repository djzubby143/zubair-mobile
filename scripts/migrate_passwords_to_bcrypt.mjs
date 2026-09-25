import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const USERS_FILE = path.resolve(process.cwd(), "data", "customer_users.json");

function isBcryptHash(hash) {
  if (!hash || typeof hash !== "string") return false;
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash);
}

export function runPasswordMigration() {
  console.log("🔒 Checking customer users password hashing algorithm...");
  if (!fs.existsSync(USERS_FILE)) {
    console.log("Notice: No customer_users.json found.");
    return { migrated: 0, total: 0 };
  }

  const raw = fs.readFileSync(USERS_FILE, "utf-8");
  let users = [];
  try {
    users = JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse customer_users.json:", err.message);
    return { error: err.message };
  }

  let migratedCount = 0;
  const upgradedUsers = users.map((u) => {
    const item = { ...u };
    // If user has a plaintext password, hash with Bcrypt
    if (item.password) {
      item.password_hash = bcrypt.hashSync(item.password, 10);
      delete item.password;
      migratedCount++;
    } else if (item.password_hash && !isBcryptHash(item.password_hash)) {
      // Legacy SHA-256 hash detected: Default demo password is "ZM@User2026" or hash can be re-salted
      // We re-hash with Bcrypt for modern storage
      item.password_hash = bcrypt.hashSync(item.password_hash, 10);
      migratedCount++;
    }
    return item;
  });

  if (migratedCount > 0) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(upgradedUsers, null, 2), "utf-8");
    console.log(`✅ Successfully upgraded ${migratedCount} user passwords to Bcrypt ($2a$).`);
  } else {
    console.log("✅ All user accounts already secured with Bcrypt.");
  }

  return { migrated: migratedCount, total: users.length };
}

if (process.argv[1]?.endsWith("migrate_passwords_to_bcrypt.mjs")) {
  runPasswordMigration();
}
