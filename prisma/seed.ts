import { PrismaClient } from "@prisma/client";
import { boomzinoSeed } from "./seedData";
import { seedAdmin } from "./seedAdmin";

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

  const winner = landing.prizes.find((p) => p.order === winningOrder);
  if (!winner) throw new Error(`Seed error: no prize with order ${winningOrder} for winningOrder`);
  await prisma.landing.update({
    where: { id: landing.id },
    data: { winningPrizeId: winner.id },
  });

  console.log(`Seeded landing "${landing.slug}" on ${hostname}`);

  // A second landing on its own host to exercise the 3D template + PWA flow.
  const pwaHost = "jackpot.localhost";
  await prisma.domain.deleteMany({ where: { hostname: pwaHost } });
  await prisma.landing.deleteMany({ where: { slug: "jackpot-demo" } });
  const demo = await prisma.landing.create({
    data: {
      slug: "jackpot-demo",
      name: "Jackpot Demo",
      status: "published",
      heading: "BOOM your luck",
      subtitle: "Spin to win",
      winTitle: "JACKPOT — You won!",
      claimLabel: "Claim jackpot →",
      theme,
      template: "jackpot-vault",
      spinsBeforeWin: 1,
      redirectUrl: "https://example.com/offer",
      pwaName: "Boomzino App",
      pwaIconUrl: "https://example.com/icon.png",
      pwaUrl: "https://example.com/offer?app=1",
      prizes: { create: prizes },
      domains: { create: { hostname: pwaHost, verified: true } },
    },
    include: { prizes: true },
  });
  const demoWinner = demo.prizes.find((p) => p.order === winningOrder) ?? demo.prizes[demo.prizes.length - 1];
  await prisma.landing.update({ where: { id: demo.id }, data: { winningPrizeId: demoWinner.id } });
  console.log(`Seeded 3D landing "${demo.slug}" on ${pwaHost}`);

  await seedAdmin(
    prisma,
    process.env.ADMIN_EMAIL ?? "admin@boomzino.example",
    process.env.ADMIN_PASSWORD ?? "changeme123",
  );
  console.log(`Seeded admin ${process.env.ADMIN_EMAIL ?? "admin@boomzino.example"}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
