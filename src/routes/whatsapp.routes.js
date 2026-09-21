const express = require("express");
const { runAI } = require("../services/ai.service");

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
    console.log("Vonage WhatsApp webhook received:");
    console.log(JSON.stringify(req.body, null, 2));

    const message = req.body.text;
    const phone = req.body.from;

    // Ignore non-text messages for now
    if (!message || !phone) {
      return res.status(200).json({
        success: true,
        message: "Non-text message ignored",
      });
    }

    console.log("Customer phone:", phone);
    console.log("Customer message:", message);

    // We will connect conversation history later.
    const conversation = "";

    const aiResponse = await runAI(
      message,
      conversation,
      phone
    );

    console.log("AI response:", aiResponse);

    return res.status(200).json({
      success: true,
      response: aiResponse,
    });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);

    return res.status(500).json({
      success: false,
      message: "WhatsApp AI request failed",
    });
  }
});
module.exports = router;