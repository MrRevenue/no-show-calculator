// pages/api/send-report.js
import nodemailer from "nodemailer";
import { PassThrough } from "stream";
import { generatePdf } from "../../utils/pdfTemplate";
import * as UAParserPkg from "ua-parser-js";

console.log("SEND-REPORT LOADED", __filename);

/** ✅ CORS: erlaubte Origins (HubSpot Landingpage) */
const ALLOWED_ORIGINS = [
  "https://www.aleno.me",
  "https://aleno.me", // optional, falls ihr auch ohne www nutzt
];

function streamToBuffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on("data", (c) => chunks.push(c));
    readable.on("end", () => resolve(Buffer.concat(chunks)));
    readable.on("error", reject);
  });
}

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) return String(xff).split(",")[0].trim();

  const xRealIp = req.headers["x-real-ip"];
  if (xRealIp) return String(xRealIp).trim();

  const xVercelFwd = req.headers["x-vercel-forwarded-for"];
  if (xVercelFwd) return String(xVercelFwd).split(",")[0].trim();

  return null;
}

function parseUa(req) {
  const uaString = req.headers["user-agent"] || "";

  // robust gegen ESM/CJS Export-Unterschiede
  const UAParserCtor = UAParserPkg?.UAParser || UAParserPkg?.default || UAParserPkg;

  const parser = new UAParserCtor(String(uaString));
  const ua = parser.getResult();

  const deviceType =
    ua.device?.type === "mobile"
      ? "mobile"
      : ua.device?.type === "tablet"
        ? "tablet"
        : "desktop";

  const browser = ua.browser?.name
    ? `${ua.browser.name}${ua.browser.version ? " " + ua.browser.version : ""}`.trim()
    : "unknown";

  const os = ua.os?.name
    ? `${ua.os.name}${ua.os.version ? " " + ua.os.version : ""}`.trim()
    : "unknown";

  return { deviceType, browser, os };
}

function getHubspotUtkFromCookie(req) {
  const cookieHeader = req.headers.cookie || "";
  const m = cookieHeader.match(/(?:^|;\s*)hubspotutk=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

// Sanitize: Token nie loggen, E-Mail nur teilweise, Payload kompakt
function maskEmail(email) {
  const s = String(email || "");
  const [u, d] = s.split("@");
  if (!u || !d) return "unknown";
  return `${u.slice(0, 2)}***@${d}`;
}

function sanitizeFields(fields) {
  // Nur Feldnamen + gekürzte Werte loggen
  return (fields || []).map((f) => {
    const val = f?.value == null ? "" : String(f.value);
    const short = val.length > 80 ? val.slice(0, 80) + "…" : val;
    return { name: f?.name, value: short };
  });
}

async function submitToHubSpotForm({
  portalId,
  formGuid,
  token,
  region,
  fields,
  context,
  debug,
}) {
  if (!portalId || !formGuid || !token) {
    throw new Error(
      "Missing HubSpot ENV (HUBSPOT_PORTAL_ID / HUBSPOT_FORM_GUID / HUBSPOT_PRIVATE_APP_TOKEN)."
    );
  }

  const hsRegion = region || "na1";
  const url = `https://api.hsforms.com/submissions/v3/integration/secure/submit/${portalId}/${formGuid}`;

  if (debug) {
    console.log("HUBSPOT DEBUG -> url:", url);
    console.log("HUBSPOT DEBUG -> context:", {
      ...context,
      hutk: context?.hutk ? "***present***" : undefined,
      ipAddress: context?.ipAddress ? "***present***" : undefined,
    });
    console.log("HUBSPOT DEBUG -> fields:", sanitizeFields(fields));
  }

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fields, context }),
  });

  const text = await resp.text(); // immer lesen, damit du Fehlerdetails bekommst

  if (!resp.ok) {
    if (debug) {
      console.error("HUBSPOT DEBUG -> submit failed", {
        status: resp.status,
        statusText: resp.statusText,
        body: text,
      });
    }
    throw new Error(`HubSpot submit failed: ${resp.status} ${text}`);
  }

  // Erfolgsresponse ist JSON
  try {
    return JSON.parse(text);
  } catch {
    return { ok: true, raw: text };
  }
}

export default async function handler(req, res) {
  /** ✅ CORS Header immer als erstes setzen */
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin"); // wichtig für CDN-Caching
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  /** ✅ Preflight Requests beantworten */
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Allow only POST
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST", "OPTIONS"]);
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const debugHubspot =
    req.query?.debugHubspot === "1" || process.env.HUBSPOT_DEBUG === "1";

  try {
    const body = req.body || {};

    // ----------------------------
    // 1) Serverseitige Enrichment-Daten
    // ----------------------------
    const ip = getClientIp(req);
    const { deviceType, browser, os } = parseUa(req);

    const hutk = getHubspotUtkFromCookie(req) || body?.hutk || null;
    const pageUri = body?.pageUri || null;
    const pageName = body?.pageName || "No-Show-Rechner";

    // ----------------------------
    // 2) Validierung
    // ----------------------------
    const email = String(body.email || "").trim();
    const firstName = String(body.firstName || "").trim();

    if (!email) {
      return res.status(400).json({ success: false, error: "Empfängeradresse fehlt" });
    }

    // ----------------------------
    // 3) PDF erzeugen
    // ----------------------------
    const doc = generatePdf(body);

    const pass = new PassThrough();
    doc.pipe(pass);
    doc.end();

    const pdfBuffer = await streamToBuffer(pass);
    console.log("PDF BUFFER SIZE", pdfBuffer?.length || 0);

    // ----------------------------
    // 4) Mail versenden
    // ----------------------------
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPass) {
      console.error("❌ Missing ENV vars (GMAIL_USER / GMAIL_APP_PASSWORD)");
      return res.status(500).json({
        success: false,
        error: "Server-Konfiguration fehlt (GMAIL_USER / GMAIL_APP_PASSWORD).",
      });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });

    await transporter.sendMail({
      from: `"No-Show Report" <${gmailUser}>`,
      to: email,
      cc: "marketing@aleno.me",
      subject: "Dein No-Show-Report",
      text: `Hallo ${firstName || ""},

im Anhang findest du deinen No-Show-Report.

Buche hier eine kostenlose Online-Demo: https://www.aleno.me/de/demo

Herzlichen Gruss
Olaf`,
      attachments: [
        {
          filename: "no-show-report.pdf",
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    console.log("MAIL SENT OK ->", maskEmail(email));

    // ----------------------------
    // 5) HubSpot submit (best effort)
    // ----------------------------
    try {
      const fields = [
        { name: "email", value: email },
        { name: "firstname", value: String(body.firstName || "") },
        { name: "lastname", value: String(body.lastName || "") },

        { name: "restaurant_name", value: String(body.restaurantName || "") },
        { name: "restaurant_typ", value: String(body.restaurantType || "") },

        { name: "reservation_tool", value: String(body.reservationTool || "") },
        { name: "no_show_fee", value: String(body.noShowFee || "") },

        { name: "calc_no_show_rate", value: String(body?.calculated?.noShowRate ?? "") },
        { name: "calc_loss_30", value: String(body?.calculated?.loss30 ?? "") },

        // Nur wenn du diese Properties angelegt hast:
        // { name: "lead_device", value: deviceType },
        // { name: "lead_browser", value: browser },
        // { name: "lead_os", value: os },
      ];

      const context = {
        hutk: hutk || undefined,
        pageUri: pageUri || undefined,
        pageName: pageName || undefined,
        ipAddress: ip || undefined,
      };

      const hsRes = await submitToHubSpotForm({
        portalId: process.env.HUBSPOT_PORTAL_ID,
        formGuid: process.env.HUBSPOT_FORM_GUID,
        token: process.env.HUBSPOT_PRIVATE_APP_TOKEN,
        region: process.env.HUBSPOT_REGION || "na1",
        fields,
        context,
        debug: debugHubspot,
      });

      console.log("HUBSPOT SUBMIT OK ->", maskEmail(email), debugHubspot ? hsRes : "");
    } catch (hsErr) {
      console.error("⚠️ HubSpot submit failed (non-blocking):", hsErr?.message || hsErr);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Fehler beim Versand/PDF:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || String(err),
    });
  }
}
