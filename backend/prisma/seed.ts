import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create the two supported service domains
  const categories = [
    {
      name: "House Cleaning",
      slug: "house-cleaning",
      icon: "🏠",
      description: "Professional home cleaning for apartments and houses",
      sortOrder: 1,
    },
    {
      name: "Car Detailing",
      slug: "car-detailing",
      icon: "🚗",
      description: "Interior and exterior vehicle detailing services",
      sortOrder: 2,
    },
  ];

  const created = await Promise.all(
    categories.map((cat) =>
      prisma.category.upsert({
        where: { slug: cat.slug },
        update: {
          name: cat.name,
          icon: cat.icon,
          description: cat.description,
          sortOrder: cat.sortOrder,
        },
        create: cat,
      }),
    ),
  );

  await prisma.category.updateMany({
    where: { slug: { notIn: categories.map((cat) => cat.slug) } },
    data: { isActive: false },
  });

  console.log(`✅ Upserted ${created.length} service categories`);

  // Create predefined service types per category
  const serviceTypes: {
    categorySlug: string;
    name: string;
    description: string;
    defaultDurationMin: number;
    sortOrder: number;
  }[] = [
    {
      categorySlug: "house-cleaning",
      name: "House Cleaning",
      description: "Home cleaning packages for apartments and houses",
      defaultDurationMin: 180,
      sortOrder: 1,
    },
    {
      categorySlug: "car-detailing",
      name: "Car Detailing",
      description: "Interior and exterior vehicle detailing packages",
      defaultDurationMin: 90,
      sortOrder: 1,
    },
  ];

  let stCreated = 0;
  for (const st of serviceTypes) {
    const category = created.find((c) => c.slug === st.categorySlug);
    if (!category) continue;

    await prisma.serviceType.upsert({
      where: {
        categoryId_name: { categoryId: category.id, name: st.name },
      },
      update: {
        description: st.description,
        defaultDurationMin: st.defaultDurationMin,
        sortOrder: st.sortOrder,
        isActive: true,
      },
      create: {
        categoryId: category.id,
        name: st.name,
        description: st.description,
        defaultDurationMin: st.defaultDurationMin,
        sortOrder: st.sortOrder,
        isActive: true,
      },
    });
    stCreated++;
  }

  await prisma.serviceType.updateMany({
    where: {
      categoryId: { in: created.map((category) => category.id) },
      name: { notIn: serviceTypes.map((serviceType) => serviceType.name) },
    },
    data: { isActive: false },
  });

  await prisma.serviceType.updateMany({
    where: {
      category: {
        slug: { notIn: categories.map((category) => category.slug) },
      },
    },
    data: { isActive: false },
  });

  console.log(`✅ Created ${stCreated} predefined service types`);
  console.log("🎉 Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
