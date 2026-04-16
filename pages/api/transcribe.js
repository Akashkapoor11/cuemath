export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { audio, mimeType } = req.body;
  if (!audio) return res.status(400).json({ error: "No audio data" });

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY not set" });
  }

  try {
    const buffer = Buffer.from(audio, "base64");
    const blob = new Blob([buffer], { type: mimeType || "audio/webm" });

    const formData = new FormData();
    formData.append("file", blob, `audio.${mimeType?.includes("mp4") ? "mp4" : mimeType?.includes("ogg") ? "ogg" : "webm"}`);
    formData.append("model", "whisper-large-v3");
    formData.append("language", "en");
    formData.append("response_format", "json");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Whisper error:", err);
      return res.status(500).json({ error: "Transcription failed" });
    }

    const data = await response.json();
    return res.status(200).json({ text: data.text || "" });
  } catch (e) {
    console.error("Transcribe error:", e);
    return res.status(500).json({ error: "Internal error" });
  }
}
