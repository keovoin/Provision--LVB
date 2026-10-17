import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/design-system/provisionkh";

// Camera barcode scanner (html5-qrcode loaded on demand, browser only).
export function ScanCamera({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let stop: (() => Promise<void>) | null = null;
    let cancelled = false;
    void (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled || !ref.current) return;
      const id = "scan-cam-" + Math.random().toString(36).slice(2);
      ref.current.id = id;
      const qr = new Html5Qrcode(id);
      stop = async () => { try { await qr.stop(); qr.clear(); } catch { /* not running */ } };
      try {
        await qr.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 160 } },
          (text) => { onScan(text); },
          () => { /* no code in frame */ },
        );
      } catch {
        setErr("បើកកាមេរ៉ាមិនបាន / Camera unavailable — check permission");
      }
    })();
    return () => { cancelled = true; if (stop) void stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4">
      <div className="mb-3 flex items-center justify-between text-white">
        <p className="flex items-center gap-2 text-sm font-medium"><Camera className="size-4" />ស្កេនបាកូដ / Scan barcode</p>
        <Button variant="outline" size="icon" aria-label="Close camera" onClick={onClose}><X className="size-4" /></Button>
      </div>
      <div ref={ref} className="mx-auto w-full max-w-md overflow-hidden rounded-control bg-black" />
      {err && <p className="mt-3 text-center text-sm text-red-300">{err}</p>}
    </div>
  );
}
