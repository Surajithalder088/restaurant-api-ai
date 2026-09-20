const express = require("express");
const prisma = require("../config/prisma");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { customerId, items, notes } = req.body;

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "customerId and at least one item are required",
      });
    }

    const customer = await prisma.customer.findUnique({
      where: {
        id: Number(customerId),
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    for (const item of items) {
      if (!item.menuItemId || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Each item must have a valid menuItemId and quantity",
        });
      }
    }

    const menuItemIds = items.map((item) => Number(item.menuItemId));

    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: {
          in: menuItemIds,
        },
        isAvailable: true,
      },
    });

    if (menuItems.length !== menuItemIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more menu items are unavailable",
      });
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

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    console.error("Order creation error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create order",
    });
  }
});

//get all

router.get("/", async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Orders fetch error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
});

// by food item
router.get("/food/:menuItemId", async (req, res) => {
  try {
    const menuItemId = Number(req.params.menuItemId);

    if (Number.isNaN(menuItemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid menu item ID",
      });
    }

    const orders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            menuItemId,
          },
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
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Food orders fetch error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch food orders",
    });
  }
});

//by customer id

router.get("/customer/:customerId", async (req, res) => {
  try {
    const customerId = Number(req.params.customerId);

    if (Number.isNaN(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const orders = await prisma.order.findMany({
      where: {
        customerId,
      },
      include: {
        customer: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Customer orders fetch error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer orders",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const orderId = Number(req.params.id);

    if (Number.isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
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
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Order fetch error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
    });
  }
});

//status change
router.patch("/:id/status", async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const { status } = req.body;

    if (Number.isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const validStatuses = [
      "PENDING",
      "CONFIRMED",
      "PREPARING",
      "READY",
      "COMPLETED",
      "CANCELLED",
    ];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const updatedOrder = await prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        status,
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

    res.json({
      success: true,
      message: "Order status updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Order status update error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update order status",
    });
  }
});

//modify order an order
router.patch("/:id", async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const { items, notes } = req.body;

    if (Number.isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one item is required",
      });
    }

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (["COMPLETED", "CANCELLED"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "Completed or cancelled order cannot be modified",
      });
    }

    const menuItemIds = items.map((item) => Number(item.menuItemId));

    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: {
          in: menuItemIds,
        },
        isAvailable: true,
      },
    });

    if (menuItems.length !== menuItemIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more menu items are unavailable",
      });
    }

    let totalAmount = 0;

    const orderItems = items.map((item) => {
      const menuItem = menuItems.find(
        (menu) => menu.id === Number(item.menuItemId)
      );

      const quantity = Number(item.quantity);

      if (!quantity || quantity <= 0) {
        throw new Error("Invalid item quantity");
      }

      totalAmount += menuItem.price * quantity;

      return {
        menuItemId: menuItem.id,
        quantity,
        price: menuItem.price,
      };
    });

    const updatedOrder = await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({
        where: {
          orderId,
        },
      });

      return tx.order.update({
        where: {
          id: orderId,
        },
        data: {
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
    });

    res.json({
      success: true,
      message: "Order updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Order update error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to update order",
    });
  }
});

module.exports = router;