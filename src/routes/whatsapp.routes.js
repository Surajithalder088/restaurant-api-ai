const express = require("express");

const router = express.Router();

const VERIFY_TOKEN = process.env.WHATSAPP_TOKEN;

// Meta webhook verification
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// Receive WhatsApp events
router.post("/webhook", (req, res) => {
  console.log("WhatsApp webhook received:");
  console.log(JSON.stringify(req.body, null, 2));

  // Acknowledge Meta
  return res.sendStatus(200);
});

module.exports = router;