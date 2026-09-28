import { portalUrl } from "@/lib/documents";
import { qrSvgDataUri } from "@/lib/qr";

export function PortalQRCode({ token, size = 180 }: { token: string; size?: number }) {
  const url = portalUrl(token);
  const src = qrSvgDataUri(url, size);
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-5 text-center">
      <img src={src} alt="QR code for the student document portal" width={size} height={size} className="rounded-md bg-white p-2" />
      <p className="text-sm text-muted-foreground">Scan to open the student document portal.</p>
    </div>
  );
}
