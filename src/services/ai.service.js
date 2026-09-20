const groq = require("../config/groq");
const tools = require("../tools");
const { getOrCreateCustomer } = require("../tools/customer.tool");

const MODEL = "openai/gpt-oss-20b";

const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "get_menu",
      description: "Get all currently available menu items.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },

  {
    type: "function",
    function: {
      name: "get_or_create_customer",
      description:
        "Find an existing customer by phone number or create a new customer.",
      parameters: {
        type: "object",
        properties: {
          phone: {
            type: "string",
            description: "Customer WhatsApp phone number.",
          },
          name: {
            type: ["string", "null"],
            description: "Customer name if known.",
          },
        },
        required: ["phone"],
        additionalProperties: false,
      },
    },
  },

  {
    type: "function",
    function: {
      name: "check_available_tables",
      description:
        "Check available restaurant tables for a specific time and number of guests.",
      parameters: {
        type: "object",
        properties: {
          startTime: {
            type: "string",
            description: "Reservation start time in ISO 8601 format.",
          },
          endTime: {
            type: "string",
            description: "Reservation end time in ISO 8601 format.",
          },
          guests: {
            type: "number",
            description: "Number of guests.",
          },
        },
        required: ["startTime", "endTime", "guests"],
        additionalProperties: false,
      },
    },
  },

  {
    type: "function",
    function: {
      name: "create_reservation",
      description:
        "Create a reservation only after table availability has been checked and the customer has confirmed.",
      parameters: {
        type: "object",
        properties: {
          customerId: {
            type: "number",
          },
          tableId: {
            type: "number",
          },
          startTime: {
            type: "string",
          },
          endTime: {
            type: "string",
          },
          guests: {
            type: "number",
          },
          notes: {
            type: ["string", "null"],
          },
        },
        required: [
          "customerId",
          "tableId",
          "startTime",
          "endTime",
          "guests",
        ],
        additionalProperties: false,
      },
    },
  },

  {
    type: "function",
    function: {
      name: "modify_reservation",
      description: "Modify an existing restaurant reservation.",
      parameters: {
        type: "object",
        properties: {
          reservationId: {
            type: "number",
          },
          tableId: {
            type: ["number", "null"],
          },
          startTime: {
            type: ["string", "null"],
          },
          endTime: {
            type: ["string", "null"],
          },
          guests: {
            type: ["number", "null"],
          },
          notes: {
            type: ["string", "null"],
          },
        },
        required: ["reservationId"],
        additionalProperties: false,
      },
    },
  },

  {
    type: "function",
    function: {
      name: "cancel_reservation",
      description: "Cancel an existing restaurant reservation.",
      parameters: {
        type: "object",
        properties: {
          reservationId: {
            type: "number",
          },
        },
        required: ["reservationId"],
        additionalProperties: false,
      },
    },
  },

  {
    type: "function",
    function: {
      name: "create_order",
      description: "Create a food order for a customer.",
      parameters: {
        type: "object",
        properties: {
          customerId: {
            type: "number",
          },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                menuItemId: {
                  type: "number",
                },
                quantity: {
                  type: "number",
                },
              },
              required: ["menuItemId", "quantity"],
              additionalProperties: false,
            },
          },
          notes: {
            type: ["string", "null"],
          },
        },
        required: ["customerId", "items"],
        additionalProperties: false,
      },
    },
  },

  {
    type: "function",
    function: {
      name: "get_order",
      description:
        "Get an existing order including its current status and items.",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "number",
          },
        },
        required: ["orderId"],
        additionalProperties: false,
      },
    },
  },

  {
    type: "function",
    function: {
      name: "modify_order",
      description: "Modify an existing food order.",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "number",
          },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                menuItemId: {
                  type: "number",
                },
                quantity: {
                  type: "number",
                },
              },
              required: ["menuItemId", "quantity"],
              additionalProperties: false,
            },
          },
          notes: {
            type: ["string", "null"],
          },
        },
        required: ["orderId", "items"],
        additionalProperties: false,
      },
    },
  },

  {
    type: "function",
    function: {
      name: "cancel_order",
      description: "Cancel an existing food order.",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "number",
          },
        },
        required: ["orderId"],
        additionalProperties: false,
      },
    },
  },
];

const systemPrompt = `
You are the AI assistant for a restaurant.

Your responsibilities:
- Answer restaurant and menu questions.
- Help customers make table reservations.
- Help customers modify or cancel reservations.
- Help customers place food orders.
- Help customers modify or cancel food orders.
- Help customers check order status.

IMPORTANT RULES:

1. Never invent restaurant data.
   - Never invent menu items.
   - Never invent prices.
   - Never invent tables.
   - Never invent reservation IDs.
   - Never invent order IDs.

2. Use tools whenever actual restaurant data is required.

3. Customer identification:
   - Use get_or_create_customer when you need the customer's database ID.
   - The customer's WhatsApp phone number will be provided by the application.

4. Reservations:
   - Always check table availability before creating a reservation.
   - Never create a reservation without checking availability.
   - Do not create a reservation until the customer has confirmed the selected table/time.
   - If the requested time is unclear, ask the customer for clarification.
   - Never claim a reservation was created unless create_reservation succeeds.

5. Orders:
   - Use get_menu when you need menu information.
   - Never invent menu prices.
   - Never claim an order was created unless create_order succeeds.
   - Never claim an order was cancelled unless cancel_order succeeds.

6. Tool errors:
   - If a tool returns an error, explain the problem naturally to the customer.
   - Do not expose internal database errors or stack traces.

7. Communication:
   - Be concise.
   - Be friendly and natural.
   - Ask only for information that is actually missing.
   - Do not overwhelm the customer with technical details.

8. Dates and times:
   - Always make sure the requested date and time are clear before making reservations.
   - Use ISO 8601 timestamps when calling reservation tools.
`;

async function executeToolCall(toolCall) {
  const functionName = toolCall.function.name;
  const functionArgs = JSON.parse(
    toolCall.function.arguments || "{}"
  );

  const functionToCall = tools[functionName];

  if (!functionToCall) {
    throw new Error(`Unknown tool: ${functionName}`);
  }

  return await functionToCall(functionArgs);
}

async function runAI(message, conversation, phone) {
      const customer = await getOrCreateCustomer({
    phone,
  });
  const messages = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: `
Customer ID: ${customer.id}
Customer phone: ${customer.phone}
Customer name: ${customer.name || "Unknown"}

Previous conversation:
${conversation || "No previous conversation"}

Latest customer message:
${message}
      `,
    },
  ];

  const maxIterations = 10;

  for (let i = 0; i < maxIterations; i++) {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages,
      tools: toolDefinitions,
      tool_choice: "auto",
      temperature: 0,
    });

    const responseMessage = response.choices[0].message;
    const toolCalls = responseMessage.tool_calls || [];

    // No tool call means the AI has produced the final answer.
    if (toolCalls.length === 0) {
      return responseMessage.content || "";
    }

    // Add the assistant's tool-call message to the conversation.
    messages.push(responseMessage);

    // Execute all requested tools.
    for (const toolCall of toolCalls) {
      try {
        const result = await executeToolCall(toolCall);

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify({
            success: true,
            data: result,
          }),
        });
      } catch (error) {
        console.error(
          `Tool error [${toolCall.function.name}]:`,
          error
        );

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify({
            success: false,
            error: error.message,
          }),
        });
      }
    }
  }

  throw new Error(
    "AI reached the maximum number of tool-calling iterations"
  );
}

module.exports = {
  runAI,
};