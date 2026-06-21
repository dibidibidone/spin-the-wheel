import { PrismaClient } from "@prisma/client";
import { boomzinoSeed } from "./seedData";

const prisma = new PrismaClient();

async function main() {
  const { prizes, winningOrder, hostname, theme, ...landingFields } = boomzinoSeed;

  await prisma.domain.deleteMany({ where: { hostname } });
  await prisma.landing.deleteMany({ where: { slug: landingFields.slug } });

  const landing = await prisma.landing.create({
    data: {
      ...landingFields,
      theme,
      prizes: { create: prizes },
      domains: { create: { hostname, verified: true } },
    },
    include: { prizes: true },
  });

  const winner = landing.prizes.find((p) => p.order === winningOrder)!;
  await prisma.landing.update({
    where: { id: landing.id },
    data: { winningPrizeId: winner.id },
  });

  console.log(`Seeded landing "${landing.slug}" on ${hostname}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
