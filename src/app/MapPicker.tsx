import { useEffect, useRef } from "react";
import { LocateFixed } from "lucide-react";
import { Button } from "@/design-system/provisionkh";
import { usePrefs } from "./prefs";
import "leaflet/dist/leaflet.css";

export interface LatLng { lat: number; lng: number }
const PHNOM_PENH = { lat: 11.5564, lng: 104.9282 };

/** Draggable pin map. Leaflet loads only in the browser. */
export function MapPicker({ value, onChange }: { value: LatLng | null; onChange: (v: LatLng) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const api = useRef<{ setView: (v: LatLng) => void } | null>(null);
  const changeRef = useRef(onChange); changeRef.current = onChange;
  const { t } = usePrefs();

  useEffect(() => {
    let map: import("leaflet").Map | undefined; let cancelled = false;
    void import("leaflet").then((L) => {
      if (!box.current || cancelled) return;
      const start = value ?? PHNOM_PENH;
      map = L.map(box.current, { zoomControl: false }).setView(start, value ? 16 : 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
      const icon = L.divIcon({ className: "", html: '<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:var(--color-primary);border:3px solid white;box-shadow:0 2px 6px rgb(0 0 0/.3)"></div>', iconSize: [28, 28], iconAnchor: [14, 28] });
      const marker = L.marker(start, { draggable: true, icon }).addTo(map);
      marker.on("dragend", () => changeRef.current(marker.getLatLng()));
      map.on("click", (e) => { marker.setLatLng(e.latlng); changeRef.current(e.latlng); });
      api.current = { setView: (v) => { marker.setLatLng(v); map?.setView(v, 16); } };
    });
    return () => { cancelled = true; map?.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (value) api.current?.setView(value); }, [value?.lat, value?.lng]);

  function locate() {
    navigator.geolocation?.getCurrentPosition((p) => { const v = { lat: p.coords.latitude, lng: p.coords.longitude }; onChange(v); api.current?.setView(v); });
  }

  return <div>
    <div className="relative overflow-hidden rounded-control border border-border">
      <div ref={box} className="h-56 w-full" />
      <Button type="button" size="sm" variant="outline" className="absolute right-2 top-2 z-[500] bg-surface" onClick={locate}><LocateFixed className="size-4" />{t("myLocation")}</Button>
    </div>
    <p className="mt-1 text-xs text-muted-foreground">{t("dragPin")}</p>
  </div>;
}
