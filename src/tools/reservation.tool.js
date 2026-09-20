const prisma = require("../config/prisma");

async function checkAvailableTables({
  startTime,
  endTime,
  guests,
}) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const guestCount = Number(guests);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid startTime or endTime");
  }

  if (end <= start) {
    throw new Error("endTime must be after startTime");
  }

  if (guestCount <= 0) {
    throw new Error("Guests must be greater than 0");
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

  return tables
    .filter((table) => table.reservations.length === 0)
    .map((table) => ({
      id: table.id,
      tableNumber: table.tableNumber,
      capacity: table.capacity,
    }));
}

async function createReservation({
  customerId,
  tableId,
  startTime,
  endTime,
  guests,
  notes,
}) {
  const customer = await prisma.customer.findUnique({
    where: {
      id: Number(customerId),
    },
  });

  if (!customer) {
    throw new Error("Customer not found");
  }

  const table = await prisma.restaurantTable.findUnique({
    where: {
      id: Number(tableId),
    },
  });

  if (!table || !table.isActive) {
    throw new Error("Table not found or inactive");
  }

  const start = new Date(startTime);
  const end = new Date(endTime);
  const guestCount = Number(guests);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid startTime or endTime");
  }

  if (end <= start) {
    throw new Error("endTime must be after startTime");
  }

  const durationMinutes = (end - start) / (1000 * 60);

  if (durationMinutes < 30) {
    throw new Error("Reservation must be at least 30 minutes");
  }

  if (durationMinutes > 120) {
    throw new Error("Reservation cannot exceed 2 hours");
  }

  if (guestCount <= 0) {
    throw new Error("Guests must be greater than 0");
  }

  if (table.capacity < guestCount) {
    throw new Error("Table capacity is not enough for the number of guests");
  }

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
    throw new Error("Table is already reserved for this time");
  }

  const reservation = await prisma.reservation.create({
    data: {
      customerId: Number(customerId),
      tableId: Number(tableId),
      startTime: start,
      endTime: end,
      guests: guestCount,
      notes,
    },
    include: {
      customer: true,
      table: true,
    },
  });

  return reservation;
}

async function modifyReservation({
  reservationId,
  tableId,
  startTime,
  endTime,
  guests,
  notes,
}) {
  const reservation = await prisma.reservation.findUnique({
    where: {
      id: Number(reservationId),
    },
  });

  if (!reservation) {
    throw new Error("Reservation not found");
  }

  if (
    reservation.status === "CANCELLED" ||
    reservation.status === "COMPLETED"
  ) {
    throw new Error("This reservation cannot be modified");
  }

  const newTableId = tableId
    ? Number(tableId)
    : reservation.tableId;

  const newStartTime = startTime
    ? new Date(startTime)
    : reservation.startTime;

  const newEndTime = endTime
    ? new Date(endTime)
    : reservation.endTime;

  const newGuests = guests
    ? Number(guests)
    : reservation.guests;

  const newNotes =
    notes !== undefined
      ? notes
      : reservation.notes;

  if (
    Number.isNaN(newStartTime.getTime()) ||
    Number.isNaN(newEndTime.getTime())
  ) {
    throw new Error("Invalid startTime or endTime");
  }

  if (newEndTime <= newStartTime) {
    throw new Error("endTime must be after startTime");
  }

  const durationMinutes =
    (newEndTime - newStartTime) / (1000 * 60);

  if (durationMinutes < 30) {
    throw new Error(
      "Reservation must be at least 30 minutes"
    );
  }

  if (durationMinutes > 120) {
    throw new Error(
      "Reservation cannot exceed 2 hours"
    );
  }

  if (newGuests <= 0) {
    throw new Error("Guests must be greater than 0");
  }

  const table = await prisma.restaurantTable.findUnique({
    where: {
      id: newTableId,
    },
  });

  if (!table || !table.isActive) {
    throw new Error("Table not found or inactive");
  }

  if (table.capacity < newGuests) {
    throw new Error(
      "Table capacity is not enough for the number of guests"
    );
  }

  const conflictingReservation =
    await prisma.reservation.findFirst({
      where: {
        id: {
          not: reservation.id,
        },
        tableId: newTableId,
        status: {
          not: "CANCELLED",
        },
        startTime: {
          lt: newEndTime,
        },
        endTime: {
          gt: newStartTime,
        },
      },
    });

  if (conflictingReservation) {
    throw new Error(
      "Table is already reserved for this time"
    );
  }

  const updatedReservation =
    await prisma.reservation.update({
      where: {
        id: reservation.id,
      },
      data: {
        tableId: newTableId,
        startTime: newStartTime,
        endTime: newEndTime,
        guests: newGuests,
        notes: newNotes,
      },
      include: {
        customer: true,
        table: true,
      },
    });

  return updatedReservation;
}

async function cancelReservation({ reservationId }) {
  const reservation = await prisma.reservation.findUnique({
    where: {
      id: Number(reservationId),
    },
    include: {
      customer: true,
      table: true,
    },
  });

  if (!reservation) {
    throw new Error("Reservation not found");
  }

  if (reservation.status === "CANCELLED") {
    throw new Error("Reservation is already cancelled");
  }

  if (reservation.status === "COMPLETED") {
    throw new Error("Completed reservation cannot be cancelled");
  }

  const cancelledReservation = await prisma.reservation.update({
    where: {
      id: reservation.id,
    },
    data: {
      status: "CANCELLED",
    },
    include: {
      customer: true,
      table: true,
    },
  });

  return cancelledReservation;
}


module.exports = {
  checkAvailableTables,
  createReservation,
  modifyReservation,
  cancelReservation,
};