const express = require("express");
const prisma = require("../config/prisma");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const {
      customerId,
      tableId,
      startTime,
      endTime,
      guests,
      notes,
    } = req.body;

    if (!customerId || !tableId || !startTime || !endTime || !guests) {
      return res.status(400).json({
        success: false,
        message:
          "customerId, tableId, startTime, endTime and guests are required",
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid startTime or endTime",
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: "endTime must be after startTime",
      });
    }

    const durationMinutes = (end - start) / (1000 * 60);

    if (durationMinutes < 30) {
      return res.status(400).json({
        success: false,
        message: "Reservation must be at least 30 minutes",
      });
    }

    if (durationMinutes > 120) {
      return res.status(400).json({
        success: false,
        message: "Reservation cannot exceed 2 hours",
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

    const table = await prisma.restaurantTable.findUnique({
      where: {
        id: Number(tableId),
      },
    });

    if (!table || !table.isActive) {
      return res.status(404).json({
        success: false,
        message: "Table not found or inactive",
      });
    }

    if (table.capacity < Number(guests)) {
      return res.status(400).json({
        success: false,
        message: "Table capacity is not enough for this number of guests",
      });
    }

    // Check for overlapping reservations
    const conflictingReservation = await prisma.reservation.findFirst({
      where: {
        tableId: Number(tableId),
        status: {
          not: "CANCELLED",
        },
        startTime: {
          lt: end,
        },
        endTime: {
          gt: start,
        },
      },
    });

    if (conflictingReservation) {
      return res.status(409).json({
        success: false,
        message: "Table is already reserved for this time",
      });
    }

    const reservation = await prisma.reservation.create({
      data: {
        customerId: Number(customerId),
        tableId: Number(tableId),
        startTime: start,
        endTime: end,
        guests: Number(guests),
        notes,
      },
      include: {
        customer: true,
        table: true,
      },
    });

    res.status(201).json({
      success: true,
      data: reservation,
    });
  } catch (error) {
    console.error("Reservation creation error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create reservation",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const reservations = await prisma.reservation.findMany({
      include: {
        customer: true,
        table: true,
      },
      orderBy: {
        startTime: "asc",
      },
    });

    res.json({
      success: true,
      data: reservations,
    });
  } catch (error) {
    console.error("Reservation fetch error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch reservations",
    });
  }
});
router.get("/available-tables", async (req, res) => {
  try {
    const { startTime, endTime, guests } = req.query;

    if (!startTime || !endTime || !guests) {
      return res.status(400).json({
        success: false,
        message: "startTime, endTime and guests are required",
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const guestCount = Number(guests);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid startTime or endTime",
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: "endTime must be after startTime",
      });
    }

    if (guestCount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Guests must be greater than 0",
      });
    }

    const tables = await prisma.restaurantTable.findMany({
      where: {
        isActive: true,
        capacity: {
          gte: guestCount,
        },
      },
      include: {
        reservations: {
          where: {
            status: {
              not: "CANCELLED",
            },
            startTime: {
              lt: end,
            },
            endTime: {
              gt: start,
            },
          },
        },
      },
      orderBy: {
        capacity: "asc",
      },
    });

    const availableTables = tables.filter(
      (table) => table.reservations.length === 0
    );

    const formattedTables = availableTables.map((table) => ({
      id: table.id,
      tableNumber: table.tableNumber,
      capacity: table.capacity,
    }));

    res.json({
      success: true,
      data: formattedTables,
    });
  } catch (error) {
    console.error("Available tables error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to check available tables",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const reservationId = Number(req.params.id);

    if (Number.isNaN(reservationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reservation ID",
      });
    }

    const reservation = await prisma.reservation.findUnique({
      where: {
        id: reservationId,
      },
      include: {
        customer: true,
        table: true,
      },
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found",
      });
    }

    res.json({
      success: true,
      data: reservation,
    });
  } catch (error) {
    console.error("Reservation fetch error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch reservation",
    });
  }
});


// to modify reservation
router.patch("/:id", async (req, res) => {
  try {
    const reservationId = Number(req.params.id);

    if (Number.isNaN(reservationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reservation ID",
      });
    }

    const {
      tableId,
      startTime,
      endTime,
      guests,
      notes,
    } = req.body;

    if (!tableId || !startTime || !endTime || !guests) {
      return res.status(400).json({
        success: false,
        message: "tableId, startTime, endTime and guests are required",
      });
    }

    const reservation = await prisma.reservation.findUnique({
      where: {
        id: reservationId,
      },
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found",
      });
    }

    if (reservation.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Cancelled reservation cannot be modified",
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid startTime or endTime",
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: "endTime must be after startTime",
      });
    }

    const durationMinutes = (end - start) / (1000 * 60);

    if (durationMinutes < 30) {
      return res.status(400).json({
        success: false,
        message: "Reservation must be at least 30 minutes",
      });
    }

    if (durationMinutes > 120) {
      return res.status(400).json({
        success: false,
        message: "Reservation cannot exceed 2 hours",
      });
    }

    const table = await prisma.restaurantTable.findUnique({
      where: {
        id: Number(tableId),
      },
    });

    if (!table || !table.isActive) {
      return res.status(404).json({
        success: false,
        message: "Table not found or inactive",
      });
    }

    if (table.capacity < Number(guests)) {
      return res.status(400).json({
        success: false,
        message: "Table capacity is not enough for the number of guests",
      });
    }

    const conflictingReservation = await prisma.reservation.findFirst({
      where: {
        id: {
          not: reservationId,
        },
        tableId: Number(tableId),
        status: {
          not: "CANCELLED",
        },
        startTime: {
          lt: end,
        },
        endTime: {
          gt: start,
        },
      },
    });

    if (conflictingReservation) {
      return res.status(409).json({
        success: false,
        message: "Table is already reserved for this time",
      });
    }

    const updatedReservation = await prisma.reservation.update({
      where: {
        id: reservationId,
      },
      data: {
        tableId: Number(tableId),
        startTime: start,
        endTime: end,
        guests: Number(guests),
        notes,
      },
      include: {
        customer: true,
        table: true,
      },
    });

    res.json({
      success: true,
      message: "Reservation updated successfully",
      data: updatedReservation,
    });
  } catch (error) {
    console.error("Reservation update error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update reservation",
    });
  }
});


//to cancel reservation
router.patch("/:id/cancel", async (req, res) => {
  try {
    const reservationId = Number(req.params.id);

    if (Number.isNaN(reservationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reservation ID",
      });
    }

    const reservation = await prisma.reservation.findUnique({
      where: {
        id: reservationId,
      },
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found",
      });
    }

    if (reservation.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Reservation is already cancelled",
      });
    }

    const updatedReservation = await prisma.reservation.update({
      where: {
        id: reservationId,
      },
      data: {
        status: "CANCELLED",
      },
      include: {
        customer: true,
        table: true,
      },
    });

    res.json({
      success: true,
      message: "Reservation cancelled successfully",
      data: updatedReservation,
    });
  } catch (error) {
    console.error("Reservation cancellation error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to cancel reservation",
    });
  }
});



module.exports = router;