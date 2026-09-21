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
// Receive Vonage WhatsApp messages
router.post("/webhook/whatsapp", async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("HEADERS:", req.headers);

    return res.status(200).json({
      success: true,
      body: req.body,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
module.exports = router;