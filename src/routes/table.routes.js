const express = require("express");
const prisma = require("../config/prisma");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const tables = await prisma.restaurantTable.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        tableNumber: "asc",
      },
    });

    res.json({
      success: true,
      data: tables,
    });
  } catch (error) {
    console.error("Table fetch error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch tables",
    });
  }
});

module.exports = router;