const prisma = require("../config/prisma");

async function getMenu() {
  const menu = await prisma.menuItem.findMany({
    where: {
      isAvailable: true,
    },
    include: {
      category: true,
    },
    orderBy: {
      categoryId: "asc",
    },
  });

  return menu.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    category: item.category
      ? item.category.name
      : null,
  }));
}

module.exports = {
  getMenu,
};