const express = require("express");
const prisma = require("../config/prisma");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
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

    res.json({
      success: true,
      data: menu,
    });
  } catch (error) {
    console.error("Menu fetch error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch menu",
    });
  }
});

module.exports = router;