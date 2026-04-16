import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { name, report, avgScore } = req.body;
  if (!name || !report) return res.status(400).json({ error: "Missing data" });

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    // Email not configured — skip silently (don't break the app)
    return res.status(200).json({ ok: true, skipped: true });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const verdictColor =
      report.overall === "Move Forward" ? "#059669"
      : report.overall === "Hold"       ? "#d97706"
      :                                    "#dc2626";

    const scores = Object.entries(report.scores || {})
      .map(([k, v]) => `<tr><td style="padding:6px 0;color:#374151;font-size:13px">${k}</td><td style="padding:6px 0;font-weight:700;color:${v>=8?"#059669":v>=5?"#6366f1":"#d97706"};font-size:13px">${v}/10</td></tr>`)
      .join("");

    const strengths = (report.strengths || [])
      .map(s => `<li style="color:#374151;font-size:13px;margin-bottom:4px">${s}</li>`)
      .join("");

    const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f6fb;padding:24px">
        <div style="background:linear-gradient(135deg,#6366f1,#0ea5e9);border-radius:16px;padding:24px 28px;margin-bottom:20px">
          <div style="font-size:11px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Cuemath AI Tutor Screener</div>
          <div style="font-size:24px;font-weight:800;color:#fff;margin-bottom:4px">New Candidate Report</div>
          <div style="font-size:14px;color:rgba(255,255,255,0.8)">${new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</div>
        </div>

        <div style="background:#fff;border-radius:16px;padding:24px;margin-bottom:16px;border:1px solid #e5e7eb">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
            <div>
              <div style="font-size:20px;font-weight:700;color:#111827">${name}</div>
              <div style="font-size:13px;color:#6b7280;margin-top:2px">Tutor Screening Interview</div>
            </div>
            <div style="padding:8px 18px;border-radius:8px;background:${verdictColor}18;border:1.5px solid ${verdictColor};color:${verdictColor};font-weight:700;font-size:14px">
              ${report.overall}
            </div>
          </div>
          <div style="font-size:38px;font-weight:800;color:${avgScore>=8?"#059669":avgScore>=5?"#6366f1":"#d97706"};margin-bottom:8px">${avgScore}<span style="font-size:18px;color:#9ca3af;font-weight:400">/10</span></div>
          <div style="font-size:13px;color:#374151;line-height:1.7">${report.summary}</div>
        </div>

        <div style="background:#fff;border-radius:16px;padding:24px;margin-bottom:16px;border:1px solid #e5e7eb">
          <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.07em;font-weight:600;margin-bottom:14px">Dimension Scores</div>
          <table style="width:100%;border-collapse:collapse">${scores}</table>
        </div>

        <div style="background:#fff;border-radius:16px;padding:24px;margin-bottom:16px;border:1px solid #e5e7eb">
          <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.07em;font-weight:600;margin-bottom:12px">Key Strengths</div>
          <ul style="margin:0;padding-left:20px">${strengths}</ul>
        </div>

        <div style="background:#fff;border-radius:16px;padding:20px 24px;border:1px solid #e5e7eb">
          <div style="font-size:13px;color:#374151;line-height:1.7"><strong>Recommendation:</strong> ${report.recommendation}</div>
        </div>

        <div style="text-align:center;margin-top:20px;font-size:11px;color:#9ca3af">
          Sent by Cuemath AI Tutor Screener · Automated report
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Cuemath AI Screener" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,  // send to yourself
      subject: `[Cuemath Screener] ${name} — ${report.overall} (${avgScore}/10)`,
      html,
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Email send error:", e);
    return res.status(200).json({ ok: true, skipped: true }); // don't fail the app
  }
}
