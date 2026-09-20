const prisma = require("../config/prisma");

async function getOrCreateCustomer({
  phone,
  name,
}) {
  if (!phone) {
    throw new Error("Phone number is required");
  }

  const customer = await prisma.customer.upsert({
    where: {
      phone,
    },
    update: {
      ...(name ? { name } : {}),
    },
    create: {
      phone,
      name: name || null,
      token: `customer-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
    },
  });

  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    token: customer.token,
  };
}

module.exports = {
  getOrCreateCustomer,
};