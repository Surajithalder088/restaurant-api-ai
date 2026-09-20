const express = require("express");
const { runAI } = require("../services/ai.service");

const router = express.Router();

router.post("/chat", async (req, res) => {
  try {
    const { message ,conversation,phone} = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    const response = await runAI(message,conversation,phone);

    res.json({
      success: true,
      data: {
        response,
      },
    });
  } catch (error) {
    console.error("AI chat error:", error);

    res.status(500).json({
      success: false,
      message: "AI request failed",
    });
  }
});

module.exports = router;