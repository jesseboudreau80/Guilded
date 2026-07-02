import { PrismaClient } from "@prisma/client";
import { curriculum } from "../content/curriculum";

const prisma = new PrismaClient();

async function main() {
  for (const mod of curriculum) {
    const moduleId = `module-${mod.slug}`;
    const data = {
      title: mod.title,
      description: mod.description,
      requiredTier: mod.requiredTier,
      order: mod.order,
    };
    await prisma.module.upsert({
      where: { id: moduleId },
      update: data,
      create: { id: moduleId, ...data },
    });

    for (const [index, lesson] of mod.lessons.entries()) {
      const lessonId = `lesson-${mod.slug}-${lesson.slug}`;
      const lessonData = { title: lesson.title, content: lesson.content, order: index + 1 };
      await prisma.lesson.upsert({
        where: { id: lessonId },
        update: lessonData,
        create: { id: lessonId, moduleId, ...lessonData },
      });
    }
    console.log(`seeded ${moduleId} (${mod.lessons.length} lessons)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
