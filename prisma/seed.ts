import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const DEFAULT_ZONES = [
  "Lagos Zone 1",
  "Lagos Zone 2",
  "Lagos Zone 3",
  "Abuja Zone",
  "Port Harcourt Zone",
  "Ibadan Zone",
  "Kano Zone",
  "Enugu Zone",
  "Ogun Zone",
  "Delta Zone",
];

async function main() {
  console.log("Seeding database...");

  for (const name of DEFAULT_ZONES) {
    await db.zone.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(`✓ ${DEFAULT_ZONES.length} zones created`);

  const email = "admin@cbt.local";
  const existing = await db.admin.findUnique({ where: { email } });
  if (!existing) {
    const passwordHash = await bcrypt.hash("Admin@1234", 12);
    await db.admin.create({
      data: { name: "Super Admin", email, passwordHash, role: "SUPER_ADMIN" },
    });
    console.log(`✓ Default admin created: ${email} / Admin@1234`);
    console.log("  ⚠️  Change this password immediately after first login!");
  } else {
    console.log(`✓ Admin already exists: ${email}`);
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
