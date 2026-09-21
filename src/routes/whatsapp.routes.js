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

    // Ignore non-text messages
    if (!message || !phone) {
      return res.status(200).json({
        success: true,
        message: "Non-text message ignored",
      });
    }

    console.log("Customer phone:", phone);
    console.log("Customer message:", message);

    // Conversation history will be connected later
    const conversation = "";

    // Send message to existing AI service
    const aiResponse = await runAI(
      message,
      conversation,
      phone
    );

    console.log("AI response:", aiResponse);

    // Send AI response back to WhatsApp through Vonage
    const vonageResponse = await fetch(
      "https://messages-sandbox.nexmo.com/v1/messages",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization":
            "Basic " +
            Buffer.from(
              `${'5c385db8'}:${process.env.VONAGE_API_SECRET}`
            ).toString("base64"),
        },

        body: JSON.stringify({
          from: "14157386102",
          to: phone,
          message_type: "text",
          text: aiResponse,
          channel: "whatsapp",
        }),
      }
    );

    const vonageData = await vonageResponse.json();

    console.log("Vonage send status:", vonageResponse.status);
    console.log("Vonage send response:", vonageData);

    if (!vonageResponse.ok) {
      throw new Error(
        `Vonage message send failed: ${JSON.stringify(vonageData)}`
      );
    }

    return res.status(200).json({
      success: true,
      response: aiResponse,
      vonage: vonageData,
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