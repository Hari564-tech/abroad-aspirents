import { documentStats, portalUrl } from "@/lib/documents";
import { formatShortDate } from "@/lib/format";
import { qrSvgDataUri } from "@/lib/qr";
import type { Student, StudentDocumentPortal } from "@/lib/types";

export function printPortalInstructions(
  student: Student,
  portal: StudentDocumentPortal,
  stats: ReturnType<typeof documentStats>,
) {
  const url = portalUrl(portal.token);
  const method =
    portal.accessMethod === "email_only" ? "Email only" : portal.accessMethod === "link_only" ? "Link only" : "Email + Link";
  const qr = qrSvgDataUri(url, 160);
  const html = `<!doctype html>
<html><head><title>Meridian — Student document portal</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #111827; }
  .brand { display:flex; align-items:center; gap:12px; }
  .mark { width:32px; height:32px; background:#2563eb; border-radius:8px; }
  h1 { font-size: 22px; margin: 8px 0 4px; }
  h2 { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color:#6b7280; margin: 28px 0 10px; }
  .meta { display:grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; font-size:14px; }
  .k { color:#6b7280; font-size:12px; }
  ol { padding-left: 18px; line-height: 1.7; }
  footer { margin-top: 48px; font-size: 12px; color:#6b7280; border-top:1px solid #e5e7eb; padding-top:12px; display:flex; justify-content:space-between; }
  .row { display:flex; gap:32px; align-items:flex-start; }
  code { font-size:12px; }
</style></head>
<body>
  <div class="brand"><div class="mark"></div><div><strong>MERIDIAN</strong><div class="k">Student operations</div></div></div>
  <h1>Student document upload portal</h1>
  <p class="k">Controlled access · configured by your counselor</p>
  <div class="row">
    <div class="meta" style="flex:1">
      <div><div class="k">Student</div><div>${student.name}</div></div>
      <div><div class="k">Student ID</div><div>${student.id}</div></div>
      <div><div class="k">Portal</div><div><code>${url}</code></div></div>
      <div><div class="k">Access</div><div>${method}</div></div>
      <div><div class="k">Expires</div><div>${portal.expiresAt ? formatShortDate(portal.expiresAt) : "Never"}</div></div>
      <div><div class="k">Documents requested</div><div>${stats.requiredTotal}</div></div>
      <div><div class="k">Submitted</div><div>${stats.complete}</div></div>
      <div><div class="k">Remaining</div><div>${stats.remaining}</div></div>
    </div>
    <img src="${qr}" width="140" height="140" alt="Portal QR" />
  </div>
  <h2>Instructions</h2>
  <ol>
    <li>Open the portal link.</li>
    <li>Verify your email if requested.</li>
    <li>Upload the required documents.</li>
    <li>Review your submissions.</li>
    <li>Replace any document requested by your counselor.</li>
  </ol>
  <footer>
    <span>Meridian Student Operations</span>
    <span>Generated ${formatShortDate(new Date().toISOString())}</span>
  </footer>
</body></html>`;
  const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=1100");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  window.setTimeout(() => w.print(), 400);
}
