const { getMenu } = require("./menu.tool");
const { checkAvailableTables ,createReservation,modifyReservation,cancelReservation,} = require("./reservation.tool");
const {
  createOrder,getOrder,modifyOrder,cancelOrder,
} = require("./order.tool");
const {
  getOrCreateCustomer,
} = require("./customer.tool");


const tools = {
  get_menu: getMenu,

   get_or_create_customer: getOrCreateCustomer,

  check_available_tables: checkAvailableTables,
  create_reservation: createReservation,
   modify_reservation: modifyReservation,
    cancel_reservation: cancelReservation,

  create_order: createOrder,
  get_order: getOrder,
  modify_order: modifyOrder,
  cancel_order: cancelOrder,
};

module.exports = tools;