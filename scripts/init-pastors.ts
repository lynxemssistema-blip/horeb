import { prisma } from "../lib/prisma";

async function main() {
  const pastors = await prisma.user.findMany({
    where: {
      OR: [
        { role: "PASTOR" },
        { name: { contains: "Pastor" } },
        { name: { contains: "Pr." } },
        { email: "luandemattos102030@gmail.com" },
      ],
    },
  });

  const defaultSchedule = JSON.stringify({
    activeDays: ["TERCA", "QUINTA", "SEXTA"],
    days: [
      {
        day: "TERCA",
        label: "Terça-feira",
        start: "14:00",
        end: "18:00",
        slots: ["14:00", "14:40", "15:20", "16:00", "16:40", "17:20"],
      },
      {
        day: "QUINTA",
        label: "Quinta-feira",
        start: "09:00",
        end: "12:00",
        slots: ["09:00", "09:40", "10:20", "11:00", "11:40"],
      },
      {
        day: "SEXTA",
        label: "Sexta-feira",
        start: "14:00",
        end: "17:00",
        slots: ["14:00", "14:40", "15:20", "16:00", "16:40"],
      },
    ],
    slotDurationMinutes: 40,
    modalities: ["ONLINE_CHAT", "PRESENCIAL"],
    location: "Gabinete Pastoral - Templo Central",
  });

  for (const p of pastors) {
    await prisma.user.update({
      where: { id: p.id },
      data: {
        isPastoralCounselor: true,
        isLiveAvailable: true, // Disponível ao vivo para teste inicial
        pastoralTitle: p.name.includes("Luan")
          ? "Pastor Titular & Conselheiro"
          : "Pastor Titular",
        pastoralBio:
          "Disponível para oração, direcionamento bíblico e acolhimento pastoral sigiloso.",
        pastoralPhone: "(31) 99876-5432",
        pastoralScheduleConfig: defaultSchedule,
      },
    });
    console.log(`Pastor ${p.name} (${p.email}) configurado com sucesso!`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
