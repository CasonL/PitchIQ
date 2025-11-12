export const leadSpecSchema = {
  type: "object",
  properties: {
    product: { type: "string", description: "What they sell" },
    audience: { type: "string", description: "Who they sell to" }
  },
  required: ["product", "audience"],
  additionalProperties: false
} as const;
