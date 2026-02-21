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

  // Create predefined service types per category
  const serviceTypes: {
    categorySlug: string;
    name: string;
    description: string;
    defaultDurationMin: number;
    sortOrder: number;
  }[] = [
    // Cleaning
    {
      categorySlug: "cleaning",
      name: "Alaptakarítás",
      description: "Általános takarítás (por, porszívó, felmosás)",
      defaultDurationMin: 120,
      sortOrder: 1,
    },
    {
      categorySlug: "cleaning",
      name: "Mélytisztítás",
      description: "Alapos mélytisztítás minden felületen",
      defaultDurationMin: 240,
      sortOrder: 2,
    },
    {
      categorySlug: "cleaning",
      name: "Ablaktisztítás",
      description: "Ablak- és üvegtisztítás",
      defaultDurationMin: 90,
      sortOrder: 3,
    },
    {
      categorySlug: "cleaning",
      name: "Irodatakarítás",
      description: "Irodai és üzleti területek takarítása",
      defaultDurationMin: 180,
      sortOrder: 4,
    },
    {
      categorySlug: "cleaning",
      name: "Költözés utáni takarítás",
      description: "Teljes takarítás beköltözés/kiköltözés után",
      defaultDurationMin: 300,
      sortOrder: 5,
    },
    {
      categorySlug: "cleaning",
      name: "Kárpittisztítás",
      description: "Bútorok, szőnyegek mélytisztítása",
      defaultDurationMin: 120,
      sortOrder: 6,
    },

    // Garden
    {
      categorySlug: "garden",
      name: "Fűnyírás",
      description: "Gyepnyírás és kertrendezés",
      defaultDurationMin: 90,
      sortOrder: 1,
    },
    {
      categorySlug: "garden",
      name: "Sövénynyírás",
      description: "Sövények, bokrok formázása",
      defaultDurationMin: 120,
      sortOrder: 2,
    },
    {
      categorySlug: "garden",
      name: "Fakivágás",
      description: "Fák kivágása és eltávolítása",
      defaultDurationMin: 240,
      sortOrder: 3,
    },
    {
      categorySlug: "garden",
      name: "Kertrendezés",
      description: "Teljes kert kialakítása, rendezése",
      defaultDurationMin: 300,
      sortOrder: 4,
    },
    {
      categorySlug: "garden",
      name: "Öntözőrendszer telepítés",
      description: "Automata öntözőrendszer kiépítése",
      defaultDurationMin: 360,
      sortOrder: 5,
    },
    {
      categorySlug: "garden",
      name: "Gyomirtás",
      description: "Gyommentesítés, növényvédelem",
      defaultDurationMin: 120,
      sortOrder: 6,
    },

    // Car Wash
    {
      categorySlug: "carwash",
      name: "Külső mosás",
      description: "Karosszéria mosás és szárítás",
      defaultDurationMin: 45,
      sortOrder: 1,
    },
    {
      categorySlug: "carwash",
      name: "Belső takarítás",
      description: "Belső porszívózás és törlés",
      defaultDurationMin: 60,
      sortOrder: 2,
    },
    {
      categorySlug: "carwash",
      name: "Komplett autómosás",
      description: "Teljes külső-belső tisztítás",
      defaultDurationMin: 120,
      sortOrder: 3,
    },
    {
      categorySlug: "carwash",
      name: "Polír + WAX",
      description: "Karosszéria polírozás és waxolás",
      defaultDurationMin: 180,
      sortOrder: 4,
    },
    {
      categorySlug: "carwash",
      name: "Motortér-tisztítás",
      description: "Motortér gőzös tisztítása",
      defaultDurationMin: 60,
      sortOrder: 5,
    },
    {
      categorySlug: "carwash",
      name: "Üléskárpit-tisztítás",
      description: "Ülések mélytisztítása",
      defaultDurationMin: 120,
      sortOrder: 6,
    },

    // Handyman
    {
      categorySlug: "handyman",
      name: "Villanyszerelés",
      description: "Elektromos javítás, szerelés",
      defaultDurationMin: 120,
      sortOrder: 1,
    },
    {
      categorySlug: "handyman",
      name: "Vízszerelés",
      description: "Csapok, csövek javítása, szerelése",
      defaultDurationMin: 120,
      sortOrder: 2,
    },
    {
      categorySlug: "handyman",
      name: "Festés",
      description: "Szoba festés, mázolás",
      defaultDurationMin: 300,
      sortOrder: 3,
    },
    {
      categorySlug: "handyman",
      name: "Bútor összeszerelés",
      description: "IKEA és egyéb bútorok szerelése",
      defaultDurationMin: 120,
      sortOrder: 4,
    },
    {
      categorySlug: "handyman",
      name: "Csempézés",
      description: "Csempe és burkolat lerakása",
      defaultDurationMin: 360,
      sortOrder: 5,
    },
    {
      categorySlug: "handyman",
      name: "Zárcserélés",
      description: "Ajtózár csere, bejárati zár javítás",
      defaultDurationMin: 60,
      sortOrder: 6,
    },

    // Pet Care
    {
      categorySlug: "pet",
      name: "Kutyasétáltatás",
      description: "Kutyasétáltatás 30-60 perc",
      defaultDurationMin: 60,
      sortOrder: 1,
    },
    {
      categorySlug: "pet",
      name: "Háziállat felügyelet",
      description: "Napközbeni felügyelet otthonában",
      defaultDurationMin: 240,
      sortOrder: 2,
    },
    {
      categorySlug: "pet",
      name: "Kutyakozmetika",
      description: "Fürdetés, szőrápolás, karmvágás",
      defaultDurationMin: 90,
      sortOrder: 3,
    },
    {
      categorySlug: "pet",
      name: "Macskagondozás",
      description: "Macska ellátás és felügyelet",
      defaultDurationMin: 60,
      sortOrder: 4,
    },
    {
      categorySlug: "pet",
      name: "Állatorvoshoz szállítás",
      description: "Háziállat szállítása orvoshoz",
      defaultDurationMin: 120,
      sortOrder: 5,
    },

    // Moving
    {
      categorySlug: "moving",
      name: "Lakás költöztetés",
      description: "Teljes lakás be/kiköltöztetés",
      defaultDurationMin: 480,
      sortOrder: 1,
    },
    {
      categorySlug: "moving",
      name: "Iroda költöztetés",
      description: "Irodai bútorok, eszközök költöztetése",
      defaultDurationMin: 480,
      sortOrder: 2,
    },
    {
      categorySlug: "moving",
      name: "Bútorszállítás",
      description: "Egyes bútorok szállítása",
      defaultDurationMin: 180,
      sortOrder: 3,
    },
    {
      categorySlug: "moving",
      name: "Csomagolás",
      description: "Professzionális becsomagolás",
      defaultDurationMin: 240,
      sortOrder: 4,
    },
    {
      categorySlug: "moving",
      name: "Lomtalanítás",
      description: "Felesleges holmik elszállítása",
      defaultDurationMin: 180,
      sortOrder: 5,
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
      },
      create: {
        categoryId: category.id,
        name: st.name,
        description: st.description,
        defaultDurationMin: st.defaultDurationMin,
        sortOrder: st.sortOrder,
      },
    });
    stCreated++;
  }

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
