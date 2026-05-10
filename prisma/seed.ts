import { PrismaClient, Tier } from "@prisma/client";

const prisma = new PrismaClient();

const modules: Array<{ title: string; requiredTier: Tier; lessons: string[] }> = [
  { title: "Credit Literacy Foundations", requiredTier: "APPRENTICE", lessons: ["Credit Score Basics", "Reading Your Report"] },
  { title: "Dispute Letter Templates", requiredTier: "JOURNEYMAN", lessons: ["Template Selection", "Supporting Evidence"] },
  { title: "Arbitration Essentials", requiredTier: "MASTER", lessons: ["Arbitration Readiness", "Process Timeline"] },
];

async function main() {
  for (const [index, module] of modules.entries()) {
    const created = await prisma.module.upsert({
      where: { id: `module-${index}` },
      update: { title: module.title, requiredTier: module.requiredTier, order: index + 1 },
      create: { id: `module-${index}`, title: module.title, requiredTier: module.requiredTier, order: index + 1 },
    });

    for (const [lessonIndex, lesson] of module.lessons.entries()) {
      await prisma.lesson.upsert({
        where: { id: `lesson-${index}-${lessonIndex}` },
        update: { title: lesson, content: `${lesson} educational content`, order: lessonIndex + 1 },
        create: {
          id: `lesson-${index}-${lessonIndex}`,
          moduleId: created.id,
          title: lesson,
          content: `${lesson} educational content`,
          order: lessonIndex + 1,
        },
      });
    }
  }
}

main().finally(async () => prisma.$disconnect());
