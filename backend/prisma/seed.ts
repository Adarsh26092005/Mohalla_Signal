import { PrismaClient } from '@prisma/client';
import { normalizeText } from '../src/modules/products/utils/text-normalizer.util';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Mohalla Signal database seeding...');

  // 1. Seed Neighborhoods (Phase 4)
  const neighborhoodsData = [
    {
      name: 'Indiranagar',
      slug: 'indiranagar',
      city: 'Bengaluru',
      pincode: '560038',
    },
    {
      name: 'Koramangala',
      slug: 'koramangala',
      city: 'Bengaluru',
      pincode: '560034',
    },
    {
      name: 'Connaught Place',
      slug: 'connaught-place',
      city: 'New Delhi',
      pincode: '110001',
    },
    {
      name: 'Sector 15 Gurgaon',
      slug: 'sector-15-gurgaon',
      city: 'Gurugram',
      pincode: '122001',
    },
  ];

  for (const n of neighborhoodsData) {
    await prisma.neighborhood.upsert({
      where: { slug: n.slug },
      create: {
        name: n.name,
        slug: n.slug,
        city: n.city,
        pincode: n.pincode,
      },
      update: {
        name: n.name,
        city: n.city,
        pincode: n.pincode,
      },
    });
    console.log(`  ✓ Neighborhood: ${n.name} (${n.city} - PIN: ${n.pincode})`);
  }

  // 2. Seed Categories
  const categoriesData = [
    {
      name: 'Flours & Grains',
      slug: 'flours-grains',
      description: 'Staple, specialty, and gluten-free flours, millets, and grains',
    },
    {
      name: 'Dairy & Plant Beverages',
      slug: 'dairy-beverages',
      description: 'Dairy essentials and plant-based alternative beverages',
    },
    {
      name: 'Spices & Seasonings',
      slug: 'spices-seasonings',
      description: 'Authentic Indian whole and powdered spices',
    },
    {
      name: 'Staples & Pulses',
      slug: 'staples-pulses',
      description: 'Essential pulses, lentils, rice, and cooking ingredients',
    },
  ];

  const categoryMap = new Map<string, string>();

  for (const cat of categoriesData) {
    const upserted = await prisma.category.upsert({
      where: { slug: cat.slug },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
      },
      update: {
        name: cat.name,
        description: cat.description,
      },
    });
    categoryMap.set(cat.slug, upserted.id);
    console.log(`  ✓ Category: ${cat.name}`);
  }

  // 3. Seed Products with Curated Aliases
  const productsData = [
    {
      name: 'Ragi Flour',
      categorySlug: 'flours-grains',
      description: 'Nutrient-dense organic finger millet flour (Mandua / Nachni atta)',
      aliases: [
        'ragi atta',
        'finger millet flour',
        'nachni flour',
        'mandua atta',
        'nachni atta',
        'ragi flour',
        'mandwa flour',
      ],
    },
    {
      name: 'Rice Flour',
      categorySlug: 'flours-grains',
      description: 'Fine stone-ground white rice flour for culinary batters and doughs',
      aliases: [
        'chawal ka atta',
        'arisi maavu',
        'rice atta',
        'rice powder',
        'chawal atta',
        'biyyam pindi',
      ],
    },
    {
      name: 'Wheat Flour',
      categorySlug: 'flours-grains',
      description: 'Stone-ground 100% whole wheat chakki atta',
      aliases: [
        'gehu ka atta',
        'whole wheat atta',
        'chakki atta',
        'atta flour',
        'gehu atta',
        'sharbati atta',
      ],
    },
    {
      name: 'Gram Flour (Besan)',
      categorySlug: 'flours-grains',
      description: 'Pure roasted chana dal gram flour / besan',
      aliases: [
        'besan',
        'chana atta',
        'chickpea flour',
        'gram flour',
        'kadala maavu',
        'senaga pindi',
      ],
    },
    {
      name: 'Almond Milk',
      categorySlug: 'dairy-beverages',
      description: 'Unsweetened plant-based almond milk beverage',
      aliases: [
        'badam milk',
        'almond beverage',
        'almond drink',
        'almond plant milk',
        'dairy free almond milk',
      ],
    },
    {
      name: 'Oat Milk',
      categorySlug: 'dairy-beverages',
      description: 'Creamy barista-grade plant-based oat beverage',
      aliases: [
        'oats milk',
        'oat beverage',
        'oat drink',
        'plant based oat milk',
      ],
    },
    {
      name: 'Turmeric Powder',
      categorySlug: 'spices-seasonings',
      description: 'High-curcumin organic pure turmeric powder (Haldi)',
      aliases: [
        'haldi',
        'haldi powder',
        'turmeric',
        'manjal powder',
        'pasupu',
      ],
    },
  ];

  for (const prod of productsData) {
    const categoryId = categoryMap.get(prod.categorySlug);
    if (!categoryId) continue;

    const normName = normalizeText(prod.name);

    // Find existing product by normalized name & category
    const existing = await prisma.product.findFirst({
      where: {
        normalizedName: normName,
        categoryId,
      },
    });

    let productId: string;

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          name: prod.name,
          description: prod.description,
          isActive: true,
        },
      });
      productId = existing.id;
    } else {
      const created = await prisma.product.create({
        data: {
          name: prod.name,
          normalizedName: normName,
          description: prod.description,
          categoryId,
          isActive: true,
        },
      });
      productId = created.id;
    }

    // Upsert aliases for this product
    for (const aliasText of prod.aliases) {
      const normAlias = normalizeText(aliasText);
      if (!normAlias) continue;

      await prisma.productAlias.upsert({
        where: {
          productId_normalizedAlias: {
            productId,
            normalizedAlias: normAlias,
          },
        },
        create: {
          alias: aliasText,
          normalizedAlias: normAlias,
          productId,
        },
        update: {
          alias: aliasText,
        },
      });
    }

    console.log(`  ✓ Product: ${prod.name} (${prod.aliases.length} aliases seeded)`);
  }

  console.log('✅ Mohalla Signal database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
