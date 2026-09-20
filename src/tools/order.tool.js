const prisma = require("../config/prisma");

async function createOrder({
  customerId,
  items,
  notes,
}) {
  if (!customerId) {
    throw new Error("customerId is required");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one order item is required");
  }

  const customer = await prisma.customer.findUnique({
    where: {
      id: Number(customerId),
    },
  });

  if (!customer) {
    throw new Error("Customer not found");
  }

  for (const item of items) {
    if (
      !item.menuItemId ||
      !item.quantity ||
      Number(item.quantity) <= 0
    ) {
      throw new Error(
        "Each item must have a valid menuItemId and quantity"
      );
    }
  }

  const menuItemIds = items.map((item) =>
    Number(item.menuItemId)
  );

  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: {
        in: menuItemIds,
      },
      isAvailable: true,
    },
  });

  if (menuItems.length !== menuItemIds.length) {
    throw new Error(
      "One or more menu items are unavailable"
    );
  }

  let totalAmount = 0;

  const orderItems = items.map((item) => {
    const menuItem = menuItems.find(
      (menu) => menu.id === Number(item.menuItemId)
    );

    const quantity = Number(item.quantity);
    const price = menuItem.price;

    totalAmount += price * quantity;

    return {
      menuItemId: menuItem.id,
      quantity,
      price,
    };
  });

  const order = await prisma.order.create({
    data: {
      customerId: Number(customerId),
      totalAmount,
      notes,
      items: {
        create: orderItems,
      },
    },
    include: {
      customer: true,
      items: {
        include: {
          menuItem: true,
        },
      },
    },
  });

  return order;
}

async function getOrder({ orderId }) {
  if (!orderId) {
    throw new Error("orderId is required");
  }

  const order = await prisma.order.findUnique({
    where: {
      id: Number(orderId),
    },
    include: {
      customer: true,
      items: {
        include: {
          menuItem: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  return {
    id: order.id,
    status: order.status,
    totalAmount: order.totalAmount,
    notes: order.notes,
    customer: {
      id: order.customer.id,
      name: order.customer.name,
      phone: order.customer.phone,
    },
    items: order.items.map((item) => ({
      menuItemId: item.menuItemId,
      name: item.menuItem.name,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.price * item.quantity,
    })),
    createdAt: order.createdAt,
  };
}
async function modifyOrder({
  orderId,
  items,
  notes,
}) {
  if (!orderId) {
    throw new Error("orderId is required");
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one order item is required");
  }

  const order = await prisma.order.findUnique({
    where: {
      id: Number(orderId),
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (
    order.status === "COMPLETED" ||
    order.status === "CANCELLED"
  ) {
    throw new Error("This order cannot be modified");
  }

  for (const item of items) {
    if (
      !item.menuItemId ||
      !item.quantity ||
      Number(item.quantity) <= 0
    ) {
      throw new Error(
        "Each item must have a valid menuItemId and quantity"
      );
    }
  }

  const menuItemIds = items.map((item) =>
    Number(item.menuItemId)
  );

  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: {
        in: menuItemIds,
      },
      isAvailable: true,
    },
  });

  if (menuItems.length !== menuItemIds.length) {
    throw new Error(
      "One or more menu items are unavailable"
    );
  }

  let totalAmount = 0;

  const orderItems = items.map((item) => {
    const menuItem = menuItems.find(
      (menu) => menu.id === Number(item.menuItemId)
    );

    const quantity = Number(item.quantity);
    const price = menuItem.price;

    totalAmount += price * quantity;

    return {
      menuItemId: menuItem.id,
      quantity,
      price,
    };
  });

  const updatedOrder = await prisma.$transaction(
    async (tx) => {
      await tx.orderItem.deleteMany({
        where: {
          orderId: order.id,
        },
      });

      return tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          totalAmount,
          notes:
            notes !== undefined
              ? notes
              : order.notes,

          items: {
            create: orderItems,
          },
        },
        include: {
          customer: true,
          items: {
            include: {
              menuItem: true,
            },
          },
        },
      });
    }
  );

  return updatedOrder;
}

async function cancelOrder({ orderId }) {
  if (!orderId) {
    throw new Error("orderId is required");
  }

  const order = await prisma.order.findUnique({
    where: {
      id: Number(orderId),
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.status === "CANCELLED") {
    throw new Error("Order is already cancelled");
  }

  if (order.status === "COMPLETED") {
    throw new Error("Completed order cannot be cancelled");
  }

  const cancelledOrder = await prisma.order.update({
    where: {
      id: order.id,
    },
    data: {
      status: "CANCELLED",
    },
    include: {
      customer: true,
      items: {
        include: {
          menuItem: true,
        },
      },
    },
  });

  return cancelledOrder;
}

module.exports = {
  createOrder,
  getOrder,
  modifyOrder,
  cancelOrder,
};