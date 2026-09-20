const express = require("express");
const prisma = require("../config/prisma");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { name, phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    const customer = await prisma.customer.upsert({
      where: {
        phone,
      },
      update: {
        name,
      },
      create: {
        name,
        phone,
      },
    });

    res.status(201).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("Customer creation error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create customer",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error("Customer fetch error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const customerId = Number(req.params.id);

    if (Number.isNaN(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("Customer fetch error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer",
    });
  }
});

module.exports = router;