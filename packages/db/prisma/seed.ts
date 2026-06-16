import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Seed default roles
  const roles = ["owner", "admin", "member", "viewer"];
  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} role` },
    });
  }
  console.log("Seeded roles:", roles.join(", "));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
