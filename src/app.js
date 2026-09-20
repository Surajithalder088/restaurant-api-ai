const express = require("express");
const menuRoutes = require("./routes/menu.routes");
const tableRoutes = require("./routes/table.routes");
const customerRoutes = require("./routes/customer.routes");
const reservationRoutes = require("./routes/reservation.routes");
const orderRoutes = require("./routes/order.routes");
const aiRoutes = require("./routes/ai.routes");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Restaurant AI Agent API is running",
  });
});

app.use("/api/menu", menuRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/ai", aiRoutes);

module.exports = app;