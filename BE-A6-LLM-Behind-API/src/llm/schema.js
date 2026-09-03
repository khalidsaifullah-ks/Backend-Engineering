const { z } = require("zod");

// Closed output shape for the /triage endpoint. Any category-like field
// comes from a short list written down in JOB-CARD.md.
const TriageOutputSchema = z.object({
  category: z.enum(["billing", "bug", "feature", "other"]),
  urgency: z.enum(["low", "normal", "high"]),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1).max(300),
});

const TriageInputSchema = z.object({
  text: z.string().min(1, "text must not be empty").max(2000, "text must be 2000 characters or fewer"),
});

module.exports = { TriageOutputSchema, TriageInputSchema };
