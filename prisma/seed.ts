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
  const pwaHost = "jackpot.localhost:3000";
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
      redirectUrl: "https://example.com/offer?app=1",
      pwaName: "Boomzino App",
      pwaIconUrl: "https://example.com/icon.png",
      prizes: { create: prizes },
      domains: { create: { hostname: pwaHost, verified: true } },
    },
    include: { prizes: true },
  });
  const demoWinner = demo.prizes.find((p) => p.order === winningOrder);
  if (!demoWinner) throw new Error(`Seed error: no prize with order ${winningOrder} for 3D demo landing "${demo.slug}"`);
  await prisma.landing.update({ where: { id: demo.id }, data: { winningPrizeId: demoWinner.id } });
  console.log(`Seeded 3D landing "${demo.slug}" on ${pwaHost}`);

  // A slot landing on its own host — no wheel config, just win text + the PWA link/logo.
  const slotHost = "bookofra.localhost:3000";
  await prisma.domain.deleteMany({ where: { hostname: slotHost } });
  await prisma.landing.deleteMany({ where: { slug: "slot-demo" } });
  const slot = await prisma.landing.create({
    data: {
      slug: "slot-demo",
      name: "Slot Demo",
      status: "published",
      heading: "Unearth the Book",
      subtitle: "Spin to reveal riches",
      winTitle: "Riches revealed!",
      claimLabel: "Claim your bonus →",
      theme,
      template: "book-of-ra",
      spinsBeforeWin: 2,
      redirectUrl: "https://example.com/slot-offer?app=1",
      pwaName: "Book of Riches",
      pwaIconUrl: "https://example.com/slot-icon.png",
      winText: "200 Free Spins",
      prizes: { create: prizes },
      domains: { create: { hostname: slotHost, verified: true } },
    },
    include: { prizes: true },
  });
  const slotWinner = slot.prizes.find((p) => p.order === winningOrder);
  if (!slotWinner) throw new Error(`Seed error: no prize with order ${winningOrder} for slot-demo`);
  await prisma.landing.update({ where: { id: slot.id }, data: { winningPrizeId: slotWinner.id } });
  console.log(`Seeded slot landing "${slot.slug}" on ${slotHost}`);

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
