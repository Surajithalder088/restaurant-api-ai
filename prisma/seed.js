require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  // -------------------------
  // MENU CATEGORIES
  // -------------------------

  const starters = await prisma.menuCategory.create({
    data: {
      name: "Starters",
      description: "Delicious starters and appetizers",
    },
  });

  const mainCourse = await prisma.menuCategory.create({
    data: {
      name: "Main Course",
      description: "Main dishes",
    },
  });

  const beverages = await prisma.menuCategory.create({
    data: {
      name: "Beverages",
      description: "Refreshing drinks",
    },
  });

  // -------------------------
  // MENU ITEMS
  // -------------------------

  await prisma.menuItem.createMany({
    data: [
      {
        name: "Chicken Tikka",
        description: "Grilled chicken pieces with spices",
        price: 280,
        categoryId: starters.id,
      },
      {
        name: "Paneer Tikka",
        description: "Grilled paneer with Indian spices",
        price: 240,
        categoryId: starters.id,
      },
      {
        name: "Butter Chicken",
        description: "Creamy tomato-based chicken curry",
        price: 320,
        categoryId: mainCourse.id,
      },
      {
        name: "Paneer Butter Masala",
        description: "Paneer cooked in creamy tomato gravy",
        price: 280,
        categoryId: mainCourse.id,
      },
      {
        name: "Fresh Lime Soda",
        description: "Refreshing lime soda",
        price: 90,
        categoryId: beverages.id,
      },
    ],
  });

  // -------------------------
  // TABLES
  // -------------------------

  await prisma.restaurantTable.createMany({
    data: [
      { tableNumber: "T1", capacity: 2 },
      { tableNumber: "T2", capacity: 2 },
      { tableNumber: "T3", capacity: 4 },
      { tableNumber: "T4", capacity: 4 },
      { tableNumber: "T5", capacity: 6 },
      { tableNumber: "T6", capacity: 8 },
    ],
  });

  // -------------------------
  // CUSTOMERS
  // -------------------------

  await prisma.customer.createMany({
    data: [
      {
        name: "Rahul Sharma",
        phone: "9876543210",
        token: "customer-token-001",
      },
      {
        name: "Priya Das",
        phone: "9123456780",
        token: "customer-token-002",
      },
      {
        name: "Arjun Roy",
        phone: "9830123456",
        token: "customer-token-003",
      },
    ],
  });

  console.log("Seed data created successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });