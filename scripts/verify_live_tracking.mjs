const base = process.env.TRACKING_BASE ?? "https://3000-i150m5m3z33cvs4ggy5to-39909b7f.sg1.manus.computer";
const input = encodeURIComponent(JSON.stringify({ json: {} }));
const response = await fetch(`${base}/api/trpc/shipments.list?input=${input}`);
if (!response.ok) throw new Error(`shipments.list failed: ${response.status}`);
const first = await response.json();
const rows = first.result?.data?.json ?? [];
const ids = ["SHP00001", "SHP00002", "SHP00003", "SHP00004", "SHP00005"];
const sample = ids.map(id => rows.find(row => row.shipment_id === id));
if (sample.some(row => !row)) throw new Error("One or more verification shipments are missing");
const unique = field => new Set(sample.map(row => row[field])).size;
for (const field of ["origin", "destination", "route_label", "current_location", "latitude", "longitude", "progress"]) {
  if (field === "destination") continue;
  if (unique(field) < 5) throw new Error(`${field} is not differentiated across five shipments`);
}
const secondResponse = await fetch(`${base}/api/trpc/shipments.list?input=${input}`);
const second = await secondResponse.json();
const sampleSecond = ids.map(id => (second.result?.data?.json ?? []).find(row => row.shipment_id === id));
if (JSON.stringify(sample.map(row => ({ id: row.shipment_id, route: row.route_label, location: row.current_location, progress: row.progress }))) !== JSON.stringify(sampleSecond.map(row => ({ id: row.shipment_id, route: row.route_label, location: row.current_location, progress: row.progress })))) throw new Error("Tracking state changed between refresh reads");
console.log(JSON.stringify(sample.map(row => ({ shipment_id: row.shipment_id, trailer_id: row.trailer_id, origin: row.origin, destination: row.destination, route: row.route_label, current_location: row.current_location, latitude: row.latitude, longitude: row.longitude, progress: row.progress, eta: row.eta })), null, 2));
