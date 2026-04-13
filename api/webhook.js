import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simulate what HighLevel sends when a tag fires
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { contact_name, phone, tag, reply, dnd } = req.body;

  // Step 1: DND check
  if (dnd === true) {
    return res.status(200).json({
      status: "blocked",
      reason: "DND",
      message: `Contact ${contact_name} is opted out. Pipeline halted. No message sent.`,
      steps: buildSteps("dnd", contact_name, phone, tag, null, null),
    });
  }

  // Step 2: Classify reply intent
  let intent = "outreach";
  if (reply) {
    const lower = reply.toLowerCase().trim();
    if (lower === "stop" || lower.includes("unsubscribe") || lower.includes("remove me")) intent = "stop";
    else if (lower === "book" || lower.includes("book") || lower.includes("schedule")) intent = "book";
    else intent = "question";
  }

  // Step 3: Generate GPT-4o SMS
  const smsPrompt = buildSMSPrompt(contact_name, tag, intent, reply);
  let smsText = "";
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You write short, warm, compliant SMS messages for a Miami healthcare clinic. Max 2 sentences. No hashtags. Natural human tone.",
        },
        { role: "user", content: smsPrompt },
      ],
      max_tokens: 120,
      temperature: 0.8,
    });
    smsText = completion.choices[0].message.content.trim();
  } catch (err) {
    smsText = `Hi ${contact_name.split(" ")[0]}, this is Miami Care Clinic reaching out. Reply BOOK to schedule your visit or call us at (305) 555-0100.`;
  }

  // Step 4: Decide if voice call needed
  const triggerVoice = intent === "book";
  const voiceScript = triggerVoice
    ? `Hello, may I speak with ${contact_name.split(" ")[0]}? This is an automated call from Miami Care Clinic confirming your appointment request. Press 1 to confirm your preferred time, or stay on the line for a coordinator.`
    : null;

  return res.status(200).json({
    status: "executed",
    intent,
    sms: { to: phone, body: smsText, sent: true },
    voice: triggerVoice ? { to: phone, script: voiceScript, triggered: true } : null,
    steps: buildSteps(intent, contact_name, phone, tag, smsText, voiceScript),
  });
}

function buildSMSPrompt(name, tag, intent, reply) {
  const first = name.split(" ")[0];
  if (intent === "stop") return `Write a polite opt-out confirmation SMS to ${first} who replied "Stop". Confirm removal and leave door open.`;
  if (intent === "book") return `Write a confirmation SMS to ${first} who replied "Book". Tell them a coordinator will call in 10 minutes to confirm their appointment.`;
  if (intent === "question") return `Write a reassuring SMS to ${first} who sent a question. Tell them a coordinator will personally reach out within 10 minutes.`;
  const tagMap = {
    reactivation: `${first} hasn't visited in a while — reactivate with a warm outreach SMS encouraging them to book.`,
    missed_appointment: `${first} missed their appointment — write an understanding SMS offering to reschedule.`,
    new_lead: `${first} is a new lead — write a welcoming first-touch SMS from Miami Care Clinic.`,
  };
  return tagMap[tag] || `Write a warm outreach SMS to ${first} from Miami Care Clinic.`;
}

function buildSteps(intent, name, phone, tag, sms, voice) {
  return [
    { step: 1, label: "Webhook received", status: "done", detail: `Tag: ${tag} · Contact: ${name}` },
    {
      step: 2,
      label: "DND check",
      status: intent === "dnd" ? "blocked" : "done",
      detail: intent === "dnd" ? "Contact is opted out — pipeline halted" : "Clear — contact eligible for outreach",
    },
    {
      step: 3,
      label: "Reply routing",
      status: intent === "dnd" ? "skipped" : "done",
      detail: intent === "dnd" ? "Skipped" : `Intent classified: ${intent}`,
    },
    {
      step: 4,
      label: "GPT-4o SMS generation",
      status: intent === "dnd" ? "skipped" : "done",
      detail: sms ? "Message generated" : "Skipped",
    },
    {
      step: 5,
      label: "Actions executed",
      status: intent === "dnd" ? "skipped" : "done",
      detail: intent === "dnd" ? "No action — DND respected" : voice ? "SMS sent + voice call triggered" : "SMS sent",
    },
  ];
}
