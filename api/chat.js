import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are MedFlow AI, a healthcare outreach agent for a Miami-based medical clinic.

Your job is to:
- Help patients schedule, reschedule, or cancel appointments
- Answer general questions about clinic services
- Handle reactivation outreach (patients who haven't visited in a while)
- Triage replies: detect if someone wants to BOOK, STOP communications, or ask a question
- Always be warm, professional, and HIPAA-aware — never ask for or repeat sensitive medical details in chat

When someone wants to book:
- Confirm their interest enthusiastically
- Tell them a coordinator will call within 10 minutes to confirm the time
- Ask for the best callback number if they haven't provided one

When someone says STOP or unsubscribe:
- Acknowledge immediately, apologize for any inconvenience
- Confirm they've been removed from outreach
- Leave the door open: "If you ever need us, we're here"

When someone asks a medical question:
- Do NOT answer clinical questions — you are not a doctor
- Tell them a licensed coordinator or physician will follow up
- Offer to book an appointment instead

Tone: friendly, concise, human. Never robotic. Keep responses under 3 sentences unless more detail is truly needed.

Location context: Miami, FL. Clinic name: Miami Care Clinic. Phone: (305) 555-0100.`;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 300,
      temperature: 0.7,
    });

    const reply = completion.choices[0].message.content;

    // Detect intent for the frontend to act on
    const lower = reply.toLowerCase();
    let intent = "engage";
    if (lower.includes("removed") || lower.includes("unsubscribe") || lower.includes("opted out")) intent = "stop";
    if (lower.includes("coordinator will call") || lower.includes("book") || lower.includes("appointment confirmed")) intent = "book";

    return res.status(200).json({
      reply,
      intent,
      usage: completion.usage,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "OpenAI error" });
  }
}
