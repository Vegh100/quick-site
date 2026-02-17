import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create service categories
  const categories = [
    {
      name: "House Cleaning",
      slug: "cleaning",
      icon: "🏠",
      description: "Professional home and office cleaning services",
      sortOrder: 1,
    },
    {
      name: "Garden Care",
      slug: "garden",
      icon: "🌱",
      description: "Garden maintenance, landscaping and lawn care",
      sortOrder: 2,
    },
    {
      name: "Car Wash",
      slug: "carwash",
      icon: "🚗",
      description: "Interior and exterior car cleaning services",
      sortOrder: 3,
    },
    {
      name: "Handyman",
      slug: "handyman",
      icon: "🔧",
      description: "Home repairs, installations and maintenance",
      sortOrder: 4,
    },
    {
      name: "Pet Care",
      slug: "pet",
      icon: "🐾",
      description: "Pet sitting, grooming and walking services",
      sortOrder: 5,
    },
    {
      name: "Moving",
      slug: "moving",
      icon: "📦",
      description: "Moving, packing and transportation services",
      sortOrder: 6,
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

  console.log(`✅ Created ${created.length} service categories`);
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
