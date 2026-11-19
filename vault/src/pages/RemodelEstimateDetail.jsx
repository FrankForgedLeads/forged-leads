import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchRemodelEstimate,
  updateRemodelEstimate,
  deleteRemodelEstimate,
  fetchRemodelRooms,
  addRemodelRoom,
  updateRemodelRoom,
  deleteRemodelRoom,
  addRemodelRoomItem,
  updateRemodelRoomItem,
  deleteRemodelRoomItem,
  fetchRemodelItems,
  fetchRemodelMacros,
} from "../lib/api/remodelEstimates.js";
import { generateRemodelEstimatePdf } from "../lib/remodel/pdf.js";
import { roomTotal, computeEstimateTotals } from "../lib/remodel/totals.js";
import {
  hasMeasurements,
  hasSketch,
  isOnFloorPlan,
  floorAreaSF,
  ceilingAreaSF,
  perimeterLF,
  wallAreaSF,
  wallGrossAreaSF,
  baseboardLF,
  roomVolumeCF,
} from "../lib/remodel/measurements.js";
import { upgradeLegacySketchData, computeSketchMeasurements } from "../lib/remodel/sketch.js";
import { useAuth } from "../lib/AuthContext.jsx";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { Field, Input, Select } from "../components/ui/Field.jsx";
import { formatCurrency, midpoint } from "../lib/format.js";
import CatalogItemProvenance from "../components/remodel/CatalogItemProvenance.jsx";

const CATEGORY_LABEL = {
  paint: "Paint",
  drywall_texture: "Drywall & Texture",
  flooring: "Flooring",
  trim_molding: "Trim & Molding",
  cabinetry_countertops: "Cabinetry & Countertops",
  tile_stone: "Tile & Stone",
  doors_windows: "Doors & Windows",
  hardware_accessories: "Hardware & Accessories",
  electrical: "Electrical",
  light_fixtures: "Light Fixtures",
  plumbing: "Plumbing",
  plumbing_fixtures: "Plumbing Fixtures",
  insulation: "Insulation",
  stairs_railings: "Stairs & Railings",
  closets_storage: "Closets & Storage",
  hvac: "HVAC",
  roofing: "Roofing",
  exterior: "Exterior",
  framing_structural: "Framing & Structural",
  demolition: "Demolition",
  masonry: "Masonry",
  appliances_fixtures: "Appliances & Fixtures",
  water_mitigation: "Water Mitigation / Mold",
  fire_smoke_restoration: "Fire & Smoke Restoration",
  general: "Protection, Cleaning & Content Manipulation",
};

// Just autocomplete suggestions for the room-name box below — typing
// anything else is fine, this isn't a fixed list the room is limited to.
const ROOM_NAME_SUGGESTIONS = [
  "Kitchen",
  "Bathroom",
  "Living Room",
  "Family Room",
  "Dining Room",
  "Master Bedroom",
  "Bedroom",
  "Den",
  "Foyer / Entryway",
  "Hallway",
  "Stairs",
  "Closet",
  "Pantry",
  "Laundry Room",
  "Garage",
  "Office",
  "Exterior",
  "Roof",
];

// Everything about where a line item's quantity came from — the whole-room
// measurements plus, when the room was sketched wall-by-wall, each wall's
// own net/gross/flood-cut SF. A line tagged with one of these codes can be
// "refreshed" later without guessing what it meant.
const MEASUREMENT_SOURCE_LABELS = {
  floor_sf: "Floor SF",
  ceiling_sf: "Ceiling SF",
  wall_net_sf: "Wall SF (net)",
  wall_gross_sf: "Wall SF (gross)",
  perimeter_lf: "Perimeter LF",
  baseboard_lf: "Baseboard LF",
  room_volume_cf: "Room volume CF",
};

// Recomputes the room's full wall-by-wall breakdown from its stored sketch
// data, so the quantity-source picker can offer "Wall 2 — net SF" etc. —
// the room's own sketch_wall_area_sf etc. columns only hold the whole-room
// totals, not the per-wall numbers.
function getRoomSketchCalc(room) {
  if (!room?.sketch_data) return null;
  const sd = upgradeLegacySketchData(room.sketch_data);
  if (!sd?.points?.length || !sd?.walls?.length) return null;
  return computeSketchMeasurements({
    points: sd.points,
    walls: sd.walls.map((w) => ({
      heightFt: w.heightFt,
      openings: w.openings || [],
      floodCut: w.floodCut,
    })),
    pixelsPerFoot: sd.pixelsPerFoot,
    ceilingHeightFt: room.ceiling_height_ft || 8,
  });
}

function measurementSourceOptions(room, sketchCalc) {
  if (!hasMeasurements(room)) return [];
  const wholeRoom = [
    ["floor_sf", floorAreaSF(room)],
    ["ceiling_sf", ceilingAreaSF(room)],
    ["wall_net_sf", wallAreaSF(room)],
    ["wall_gross_sf", wallGrossAreaSF(room)],
    ["perimeter_lf", perimeterLF(room)],
    ["baseboard_lf", baseboardLF(room)],
    ["room_volume_cf", roomVolumeCF(room)],
  ].map(([value, qty]) => ({
    value,
    qty,
    label: `${MEASUREMENT_SOURCE_LABELS[value]} (${qty.toFixed(value === "room_volume_cf" ? 0 : 1)})`,
  }));

  const perWall = [];
  if (sketchCalc) {
    sketchCalc.walls.forEach((w, i) => {
      perWall.push({
        value: `wall_${i}_net_sf`,
        qty: w.netSF,
        label: `Wall ${i + 1} — net SF (${w.netSF.toFixed(1)})`,
      });
      perWall.push({
        value: `wall_${i}_gross_sf`,
        qty: w.grossSF,
        label: `Wall ${i + 1} — gross SF (${w.grossSF.toFixed(1)})`,
      });
      if (w.floodCutSF > 0) {
        perWall.push({
          value: `wall_${i}_flood_cut_sf`,
          qty: w.floodCutSF,
          label: `Wall ${i + 1} — flood cut SF (${w.floodCutSF.toFixed(1)})`,
        });
      }
    });
  }
  return [...wholeRoom, ...perWall];
}

function resolveMeasurementQuantity(sourceCode, room, sketchCalc) {
  if (!sourceCode) return null;
  const match = measurementSourceOptions(room, sketchCalc).find((o) => o.value === sourceCode);
  return match ? match.qty : null;
}

function describeMeasurementSource(sourceCode, room, sketchCalc) {
  if (!sourceCode) return null;
  const match = measurementSourceOptions(room, sketchCalc).find((o) => o.value === sourceCode);
  return match ? match.label.replace(/\s*\([^)]*\)$/, "") : sourceCode;
}

export default function RemodelEstimateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [estimate, setEstimate] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [macros, setMacros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchRemodelEstimate(id),
      fetchRemodelRooms(id),
      fetchRemodelItems(),
      fetchRemodelMacros(),
    ])
      .then(([est, roomRows, items, macroRows]) => {
        if (cancelled) return;
        if (!est) {
          setError("Estimate not found.");
          return;
        }
        setEstimate(est);
        setRooms(roomRows);
        setCatalog(items);
        setMacros(macroRows);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const totals = useMemo(
    () =>
      estimate
        ? computeEstimateTotals(rooms, {
            overheadPct: estimate.overhead_pct,
            profitPct: estimate.profit_pct,
            taxPct: estimate.tax_pct,
          })
        : null,
    [rooms, estimate],
  );

  async function handleAddRoom() {
    const newRoom = await addRemodelRoom({
      estimateId: id,
      name: "Untitled room",
      sortOrder: rooms.length,
    });
    setRooms((r) => [...r, newRoom]);
  }

  async function handleDeleteEstimate() {
    if (!window.confirm("Delete this estimate? This cannot be undone.")) return;
    await deleteRemodelEstimate(id);
    navigate("/remodel");
  }

  async function handleExportPdf() {
    setExporting(true);
    setError("");
    try {
      const doc = await generateRemodelEstimatePdf({ profile, estimate, rooms });
      const safeName = (estimate.title || "estimate").replace(/[^\w\- ]+/g, "").trim() || "estimate";
      doc.save(`${safeName}.pdf`);
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <div className="container-vault py-10 text-white/60">Loading…</div>;
  if (error && !estimate) return <div className="container-vault py-10 font-semibold text-red-400">{error}</div>;

  return (
    <div className="container-vault max-w-4xl py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <EstimateHeader estimate={estimate} onSaved={setEstimate} />
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate(`/remodel/${id}/floorplan`)}>
            📐 Floor Plan
          </Button>
          <Button variant="secondary" onClick={handleExportPdf} disabled={exporting}>
            {exporting ? "Exporting…" : "Export PDF"}
          </Button>
          <Button variant="danger" onClick={handleDeleteEstimate}>
            Delete
          </Button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm font-semibold text-red-400">{error}</p>}

      <div className="mt-8 space-y-6">
        {rooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            catalog={catalog}
            macros={macros}
            onRoomChanged={(updated) =>
              setRooms((rs) => rs.map((r) => (r.id === updated.id ? updated : r)))
            }
            onRoomDeleted={(roomId) => setRooms((rs) => rs.filter((r) => r.id !== roomId))}
          />
        ))}

        <Button variant="secondary" onClick={handleAddRoom}>
          + Add room
        </Button>

        {totals && <TotalsCard estimate={estimate} totals={totals} onSaved={setEstimate} />}
      </div>
    </div>
  );
}

function EstimateHeader({ estimate, onSaved }) {
  const [form, setForm] = useState({
    title: estimate.title || "",
    client_name: estimate.client_name || "",
    property_address: estimate.property_address || "",
  });
  const [saving, setSaving] = useState(false);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleBlurSave() {
    setSaving(true);
    try {
      const updated = await updateRemodelEstimate(estimate.id, {
        title: form.title || "Untitled estimate",
        client_name: form.client_name || null,
        property_address: form.property_address || null,
      });
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 space-y-2">
      <input
        value={form.title}
        onChange={set("title")}
        onBlur={handleBlurSave}
        placeholder="Untitled estimate"
        className="w-full bg-transparent text-3xl font-extrabold text-white placeholder:text-white/30 focus:outline-none"
      />
      <div className="flex flex-wrap gap-3 text-sm">
        <input
          value={form.client_name}
          onChange={set("client_name")}
          onBlur={handleBlurSave}
          placeholder="Client name"
          className="bg-transparent text-white/60 placeholder:text-white/30 focus:outline-none"
        />
        <span className="text-white/30">·</span>
        <input
          value={form.property_address}
          onChange={set("property_address")}
          onBlur={handleBlurSave}
          placeholder="Property address"
          className="bg-transparent text-white/60 placeholder:text-white/30 focus:outline-none"
        />
      </div>
      {saving && <p className="text-xs text-white/30">Saving…</p>}
    </div>
  );
}

function RoomCard({ room, catalog, macros, onRoomChanged, onRoomDeleted }) {
  const navigate = useNavigate();
  const [name, setName] = useState(room.name || "");
  const [measurements, setMeasurements] = useState({
    length_ft: room.length_ft ?? "",
    width_ft: room.width_ft ?? "",
    ceiling_height_ft: room.ceiling_height_ft ?? "",
    door_count: room.door_count ?? 0,
    window_count: room.window_count ?? 0,
  });
  const items = room.remodel_room_items || [];

  async function handleNameBlur() {
    if (name === room.name) return;
    const updated = await updateRemodelRoom(room.id, { name: name || "Untitled room" });
    onRoomChanged({ ...updated, remodel_room_items: items });
  }

  function setMeasurement(field) {
    return (e) => setMeasurements((m) => ({ ...m, [field]: e.target.value }));
  }

  async function handleMeasurementsBlur() {
    const cleaned = {
      length_ft: measurements.length_ft === "" ? null : Number(measurements.length_ft),
      width_ft: measurements.width_ft === "" ? null : Number(measurements.width_ft),
      ceiling_height_ft:
        measurements.ceiling_height_ft === "" ? null : Number(measurements.ceiling_height_ft),
      door_count: Number(measurements.door_count) || 0,
      window_count: Number(measurements.window_count) || 0,
    };
    const unchanged =
      cleaned.length_ft === (room.length_ft ?? null) &&
      cleaned.width_ft === (room.width_ft ?? null) &&
      cleaned.ceiling_height_ft === (room.ceiling_height_ft ?? null) &&
      cleaned.door_count === (room.door_count ?? 0) &&
      cleaned.window_count === (room.window_count ?? 0);
    if (unchanged) return;
    const updated = await updateRemodelRoom(room.id, cleaned);
    onRoomChanged({ ...updated, remodel_room_items: items });
  }

  const roomWithMeasurements = { ...room, ...measurements };
  // Once a room is on the Floor Plan (and has no separate legacy sketch),
  // its measurements already come from real geometry there — the
  // freeform sketch tool and the manual door/window counts would just be
  // a second, possibly-disagreeing source for the same numbers.
  const onFloorPlan = isOnFloorPlan(room) && !hasSketch(room);

  async function handleDeleteRoom() {
    if (!window.confirm(`Delete "${room.name}" and all its items?`)) return;
    await deleteRemodelRoom(room.id);
    onRoomDeleted(room.id);
  }

  function handleItemAdded(newItem) {
    onRoomChanged({ ...room, remodel_room_items: [...items, newItem] });
  }

  function handleItemsAdded(newItems) {
    onRoomChanged({ ...room, remodel_room_items: [...items, ...newItems] });
  }

  function handleItemChanged(updatedItem) {
    onRoomChanged({
      ...room,
      remodel_room_items: items.map((it) => (it.id === updatedItem.id ? updatedItem : it)),
    });
  }

  function handleItemDeleted(itemId) {
    onRoomChanged({ ...room, remodel_room_items: items.filter((it) => it.id !== itemId) });
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/40">
            Room name (type anything — not a fixed list)
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameBlur}
            placeholder="e.g. Living Room, Stairs, Pantry…"
            list={`room-name-suggestions-${room.id}`}
            className="w-full rounded-lg border border-navy-500 bg-navy-900/60 px-3 py-2 text-lg font-bold text-white placeholder:text-sm placeholder:font-normal placeholder:text-white/30 focus:border-gold-500 focus:outline-none"
          />
          <datalist id={`room-name-suggestions-${room.id}`}>
            {ROOM_NAME_SUGGESTIONS.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        </div>
        <button
          type="button"
          onClick={handleDeleteRoom}
          className="text-xs font-semibold text-red-400 hover:underline"
        >
          Delete room
        </button>
      </div>

      <div className="mt-4 rounded-lg border border-navy-500 bg-navy-900/40 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/40">
            {hasSketch(room)
              ? "Measured by sketch"
              : onFloorPlan
                ? "Measured by Floor Plan"
                : "Measurements (optional)"}
          </span>
          {onFloorPlan ? (
            <Button
              as="button"
              type="button"
              variant="secondary"
              onClick={() => navigate(`/remodel/${room.estimate_id}/floorplan`)}
              className="px-3 py-1.5 text-xs"
            >
              📐 Open in Floor Plan
            </Button>
          ) : (
            <Button
              as="button"
              type="button"
              variant="secondary"
              onClick={() => navigate(`/remodel/${room.estimate_id}/sketch/${room.id}`)}
              className="px-3 py-1.5 text-xs"
            >
              📐 {hasSketch(room) ? "Re-sketch this room" : "Sketch this room"}
            </Button>
          )}
        </div>
        {hasSketch(room) && (
          <p className="mb-2 text-xs text-white/40">
            This room was measured with the sketch tool — the Length/Width fields below are
            ignored while a sketch exists. Re-sketch to update, or clear it from the sketch page.
          </p>
        )}
        {onFloorPlan && (
          <p className="mb-2 text-xs text-white/40">
            This room's dimensions, doors, and windows come from the Floor Plan now — edit them
            there so the sketch and this estimate always agree.
          </p>
        )}
      <div className={`grid grid-cols-2 gap-2 ${onFloorPlan ? "sm:grid-cols-3" : "sm:grid-cols-5"}`}>
        <Field label="Length (ft)">
          <Input
            type="number"
            step="0.1"
            value={measurements.length_ft}
            onChange={setMeasurement("length_ft")}
            onBlur={handleMeasurementsBlur}
            placeholder="e.g. 12"
          />
        </Field>
        <Field label="Width (ft)">
          <Input
            type="number"
            step="0.1"
            value={measurements.width_ft}
            onChange={setMeasurement("width_ft")}
            onBlur={handleMeasurementsBlur}
            placeholder="e.g. 10"
          />
        </Field>
        <Field label="Ceiling ht (ft)">
          <Input
            type="number"
            step="0.1"
            value={measurements.ceiling_height_ft}
            onChange={setMeasurement("ceiling_height_ft")}
            onBlur={handleMeasurementsBlur}
            placeholder="default 8"
          />
        </Field>
        {!onFloorPlan && (
          <>
            <Field label="# Doors">
              <Input
                type="number"
                step="1"
                value={measurements.door_count}
                onChange={setMeasurement("door_count")}
                onBlur={handleMeasurementsBlur}
              />
            </Field>
            <Field label="# Windows">
              <Input
                type="number"
                step="1"
                value={measurements.window_count}
                onChange={setMeasurement("window_count")}
                onBlur={handleMeasurementsBlur}
              />
            </Field>
          </>
        )}
        {hasMeasurements(roomWithMeasurements) && (
          <div className="col-span-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/60 sm:col-span-5">
            <span>Floor: {floorAreaSF(roomWithMeasurements).toFixed(1)} SF</span>
            <span>Ceiling: {ceilingAreaSF(roomWithMeasurements).toFixed(1)} SF</span>
            <span>Walls, net: {wallAreaSF(roomWithMeasurements).toFixed(1)} SF</span>
            <span>Walls, gross: {wallGrossAreaSF(roomWithMeasurements).toFixed(1)} SF</span>
            <span>Perimeter: {perimeterLF(roomWithMeasurements).toFixed(1)} LF</span>
            <span>Baseboard: {baseboardLF(roomWithMeasurements).toFixed(1)} LF</span>
            <span>Volume: {roomVolumeCF(roomWithMeasurements).toFixed(0)} CF</span>
          </div>
        )}
      </div>
      </div>

      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <RoomItemRow
            key={item.id}
            item={item}
            room={roomWithMeasurements}
            onChanged={handleItemChanged}
            onDeleted={handleItemDeleted}
          />
        ))}
      </div>

      <MacroPicker
        roomId={room.id}
        room={roomWithMeasurements}
        macros={macros}
        onItemsAdded={handleItemsAdded}
      />

      <AddItemForm
        roomId={room.id}
        catalog={catalog}
        room={roomWithMeasurements}
        onAdded={handleItemAdded}
      />

      <div className="mt-4 flex justify-end border-t border-navy-600/60 pt-3">
        <span className="font-bold text-white">
          Room subtotal: {formatCurrency(roomTotal({ remodel_room_items: items }))}
        </span>
      </div>
    </Card>
  );
}

function RoomItemRow({ item, room, onChanged, onDeleted }) {
  const [fields, setFields] = useState({
    description: item.description,
    unit: item.unit,
    quantity: item.quantity,
    unit_price: item.unit_price,
    note: item.note || "",
  });

  const sketchCalc = useMemo(() => getRoomSketchCalc(room), [room]);
  const sourceLabel = describeMeasurementSource(item.measurement_source, room, sketchCalc);

  function set(field) {
    return (e) => setFields((f) => ({ ...f, [field]: e.target.value }));
  }

  async function save() {
    const newQuantity = Number(fields.quantity) || 0;
    const becameOverridden = item.measurement_source && newQuantity !== Number(item.quantity);
    const updated = await updateRemodelRoomItem(item.id, {
      description: fields.description,
      unit: fields.unit,
      quantity: newQuantity,
      unit_price: Number(fields.unit_price) || 0,
      note: fields.note || null,
      ...(becameOverridden ? { quantity_overridden: true } : {}),
    });
    onChanged(updated);
  }

  async function handleRefresh() {
    const fresh = resolveMeasurementQuantity(item.measurement_source, room, sketchCalc);
    if (fresh == null) return;
    const rounded = Number(fresh.toFixed(2));
    setFields((f) => ({ ...f, quantity: rounded }));
    const updated = await updateRemodelRoomItem(item.id, {
      quantity: rounded,
      quantity_overridden: false,
    });
    onChanged(updated);
  }

  async function handleDelete() {
    await deleteRemodelRoomItem(item.id);
    onDeleted(item.id);
  }

  const total = Number(fields.quantity || 0) * Number(fields.unit_price || 0);

  return (
    <div className="grid grid-cols-12 items-center gap-2 rounded-lg bg-navy-900/60 p-2.5 text-sm">
      <div className="col-span-5">
        <input
          value={fields.description}
          onChange={set("description")}
          onBlur={save}
          className="w-full bg-transparent text-white focus:outline-none"
        />
        {item.measurement_source && (
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/40">
            <span>
              via {sourceLabel}
              {item.quantity_overridden ? " (edited)" : ""}
            </span>
            <button
              type="button"
              onClick={handleRefresh}
              className="font-semibold text-gold-400 hover:underline"
              title="Pull this quantity from the sketch again"
            >
              🔄 Refresh
            </button>
          </div>
        )}
      </div>
      <input
        value={fields.quantity}
        onChange={set("quantity")}
        onBlur={save}
        type="number"
        step="0.01"
        className="col-span-1 bg-transparent text-white focus:outline-none"
      />
      <input
        value={fields.unit}
        onChange={set("unit")}
        onBlur={save}
        className="col-span-1 bg-transparent text-white/70 focus:outline-none"
      />
      <input
        value={fields.unit_price}
        onChange={set("unit_price")}
        onBlur={save}
        type="number"
        step="0.01"
        className="col-span-2 bg-transparent text-right text-white focus:outline-none"
      />
      <span className="col-span-2 text-right font-semibold text-white">{formatCurrency(total)}</span>
      <button
        type="button"
        onClick={handleDelete}
        className="col-span-1 text-right text-xs font-semibold text-red-400 hover:underline"
      >
        Remove
      </button>
    </div>
  );
}

// Matches the room name typed during sketching (or on the room card) to the
// macro that fits it, so naming a room "Kitchen" is enough — no separate,
// disconnected macro pick for the common cases.
const MACRO_NAME_SUGGESTIONS = [
  { keywords: ["bathroom", "bath"], macroName: "Bathroom Remodel (Full)" },
  { keywords: ["kitchen"], macroName: "Kitchen Remodel (Full)" },
  { keywords: ["bedroom", "bed room"], macroName: "Bedroom Refresh" },
  { keywords: ["roof"], macroName: "Hurricane Roof Replacement" },
  { keywords: ["water", "flood", "leak"], macroName: "Water Damage Dry-Out" },
  { keywords: ["fire", "smoke", "soot"], macroName: "Fire & Smoke Restoration (per room)" },
];

function suggestMacroForRoomName(name, macros) {
  if (!name) return null;
  const lower = name.toLowerCase();
  for (const { keywords, macroName } of MACRO_NAME_SUGGESTIONS) {
    if (keywords.some((k) => lower.includes(k))) {
      return macros.find((m) => m.name === macroName) || null;
    }
  }
  return null;
}

// Resolves one macro line's quantity against the room's live measurements —
// same functions the quick-fill buttons below use — falling back to the
// macro's fixed_quantity for a room with nothing measured yet.
function resolveMacroItemQuantity(mode, fixedQuantity, room) {
  if (!hasMeasurements(room)) return fixedQuantity;
  switch (mode) {
    case "floor_sf":
      return floorAreaSF(room);
    case "wall_sf":
      return wallAreaSF(room);
    case "ceiling_sf":
      return ceilingAreaSF(room);
    case "perimeter_lf":
      return perimeterLF(room);
    default:
      return fixedQuantity;
  }
}

const MACRO_MODE_TO_SOURCE = {
  floor_sf: "floor_sf",
  wall_sf: "wall_net_sf",
  ceiling_sf: "ceiling_sf",
  perimeter_lf: "perimeter_lf",
};

function MacroPicker({ roomId, room, macros, onItemsAdded }) {
  const [macroId, setMacroId] = useState("");
  const [userPicked, setUserPicked] = useState(false);
  const [showAllMacros, setShowAllMacros] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const suggested = useMemo(
    () => suggestMacroForRoomName(room?.name, macros),
    [room?.name, macros],
  );

  useEffect(() => {
    if (!userPicked && suggested) setMacroId(suggested.id);
  }, [suggested, userPicked]);

  if (!macros.length) return null;

  async function applyMacroById(idToApply) {
    const macro = macros.find((m) => m.id === idToApply);
    if (!macro) return;
    setBusy(true);
    setError("");
    try {
      const macroItems = [...(macro.remodel_macro_items || [])].sort(
        (a, b) => a.sort_order - b.sort_order,
      );
      const newItems = [];
      for (const mi of macroItems) {
        const catalogItem = mi.remodel_items;
        if (!catalogItem) continue;
        const quantity = resolveMacroItemQuantity(
          mi.quantity_mode,
          Number(mi.fixed_quantity) || 1,
          room,
        );
        const newItem = await addRemodelRoomItem({
          roomId,
          remodelItemId: catalogItem.id,
          description: catalogItem.description,
          unit: catalogItem.unit,
          quantity: Number(Number(quantity).toFixed(2)),
          unitPrice: midpoint(catalogItem.price_low, catalogItem.price_high),
          measurementSource: hasMeasurements(room) ? MACRO_MODE_TO_SOURCE[mi.quantity_mode] || null : null,
        });
        newItems.push(newItem);
      }
      onItemsAdded(newItems);
      setMacroId("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const showSuggestedOnly = suggested && !userPicked && !showAllMacros;

  return (
    <div className="mt-4 rounded-lg border border-gold-500/40 bg-gold-500/5 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold-400">
        ⚡ Macros — add a whole job's items in one click
      </div>

      {showSuggestedOnly ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <p className="text-sm text-white">
              Matched to this room's name: <strong>{suggested.name}</strong>
            </p>
            {suggested.description && (
              <p className="text-xs text-white/50">{suggested.description}</p>
            )}
          </div>
          <Button
            as="button"
            type="button"
            onClick={() => applyMacroById(suggested.id)}
            disabled={busy}
            className="px-4 py-3.5"
          >
            {busy ? "Adding…" : `Apply: ${suggested.name}`}
          </Button>
          <button
            type="button"
            onClick={() => setShowAllMacros(true)}
            className="text-xs font-semibold text-white/50 hover:text-white/80 hover:underline"
          >
            Not this one — choose a different macro
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <Field label="Macro">
                <Select
                  value={macroId}
                  onChange={(e) => {
                    setMacroId(e.target.value);
                    setUserPicked(true);
                  }}
                >
                  <option value="">Select a macro…</option>
                  {macros.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button
              as="button"
              type="button"
              onClick={() => applyMacroById(macroId)}
              disabled={!macroId || busy}
              className="px-4 py-3.5"
            >
              {busy ? "Adding…" : "Apply macro"}
            </Button>
          </div>
          {macroId && macros.find((m) => m.id === macroId)?.description && (
            <p className="mt-2 text-xs text-white/50">
              {macros.find((m) => m.id === macroId).description}
            </p>
          )}
        </>
      )}
      {error && <p className="mt-2 text-xs font-semibold text-red-400">{error}</p>}
    </div>
  );
}

function AddItemForm({ roomId, catalog, room, onAdded }) {
  const [mode, setMode] = useState("catalog"); // "catalog" | "custom"
  const [category, setCategory] = useState("");
  const [catalogItemId, setCatalogItemId] = useState("");
  const [custom, setCustom] = useState({ description: "", unit: "EA", unitPrice: "" });
  const [quantity, setQuantity] = useState(1);
  const [measurementSource, setMeasurementSource] = useState("");
  const [autoFilledQty, setAutoFilledQty] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const sketchCalc = useMemo(() => getRoomSketchCalc(room), [room]);
  const sourceOptions = useMemo(() => measurementSourceOptions(room, sketchCalc), [room, sketchCalc]);

  const itemsInCategory = (category ? catalog.filter((it) => it.category === category) : catalog)
    .slice()
    .sort((a, b) => a.description.localeCompare(b.description));

  function handleSourceChange(e) {
    const value = e.target.value;
    setMeasurementSource(value);
    const match = sourceOptions.find((o) => o.value === value);
    if (match) {
      const decimals = match.value === "room_volume_cf" ? 0 : 2;
      const rounded = Number(match.qty.toFixed(decimals));
      setQuantity(rounded);
      setAutoFilledQty(rounded);
    } else {
      setAutoFilledQty(null);
    }
  }

  async function handleAdd() {
    setBusy(true);
    setError("");
    try {
      const quantityOverridden = Boolean(measurementSource) && Number(quantity) !== autoFilledQty;
      if (mode === "catalog") {
        const picked = catalog.find((it) => it.id === catalogItemId);
        if (!picked) {
          setError("Pick an item from the list first.");
          return;
        }
        const unitPrice = midpoint(picked.price_low, picked.price_high);
        const newItem = await addRemodelRoomItem({
          roomId,
          remodelItemId: picked.id,
          description: picked.description,
          unit: picked.unit,
          quantity: Number(quantity) || 1,
          unitPrice,
          measurementSource: measurementSource || null,
          quantityOverridden,
        });
        onAdded(newItem);
        setCatalogItemId("");
      } else {
        if (!custom.description || !custom.unitPrice) {
          setError("Description and price are required.");
          return;
        }
        const newItem = await addRemodelRoomItem({
          roomId,
          description: custom.description,
          unit: custom.unit || "EA",
          quantity: Number(quantity) || 1,
          unitPrice: Number(custom.unitPrice),
          measurementSource: measurementSource || null,
          quantityOverridden,
        });
        onAdded(newItem);
        setCustom({ description: "", unit: "EA", unitPrice: "" });
      }
      setQuantity(1);
      setMeasurementSource("");
      setAutoFilledQty(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-dashed border-navy-500 p-3">
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setMode("catalog")}
          className={`rounded px-2 py-1 font-semibold ${mode === "catalog" ? "bg-gold-500 text-navy-900" : "text-white/60"}`}
        >
          From catalog
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className={`rounded px-2 py-1 font-semibold ${mode === "custom" ? "bg-gold-500 text-navy-900" : "text-white/60"}`}
        >
          Custom item
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-12 sm:items-end">
        {sourceOptions.length > 0 && (
          <div className="sm:col-span-12">
            <Field label="Quantity source (optional — fills Qty below and tags the line so it can be refreshed later)">
              <Select value={measurementSource} onChange={handleSourceChange}>
                <option value="">Manual / custom quantity</option>
                {sourceOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}
        {mode === "catalog" ? (
          <>
            <div className="sm:col-span-3">
              <Field label="Trade (narrows the list — optional)">
                <Select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setCatalogItemId("");
                  }}
                >
                  <option value="">All items</option>
                  {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="sm:col-span-6">
              <Field label="Item">
                <Select value={catalogItemId} onChange={(e) => setCatalogItemId(e.target.value)}>
                  <option value="">Select…</option>
                  {itemsInCategory.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.code ? `${it.code} — ` : ""}
                      {it.description} ({it.unit})
                    </option>
                  ))}
                </Select>
              </Field>
              <CatalogItemProvenance item={catalog.find((it) => it.id === catalogItemId)} />
            </div>
            <div className="sm:col-span-1">
              <Field label="Qty">
                <Input
                  type="number"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Button as="button" type="button" onClick={handleAdd} disabled={busy} className="w-full py-3.5">
                {busy ? "Adding…" : "Add"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="sm:col-span-4">
              <Field label="Description">
                <Input
                  value={custom.description}
                  onChange={(e) => setCustom((c) => ({ ...c, description: e.target.value }))}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Unit">
                <Input
                  value={custom.unit}
                  onChange={(e) => setCustom((c) => ({ ...c, unit: e.target.value }))}
                  placeholder="SF, LF, EA…"
                />
              </Field>
            </div>
            <div className="sm:col-span-1">
              <Field label="Qty">
                <Input
                  type="number"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Unit price ($)">
                <Input
                  type="number"
                  step="0.01"
                  value={custom.unitPrice}
                  onChange={(e) => setCustom((c) => ({ ...c, unitPrice: e.target.value }))}
                />
              </Field>
            </div>
            <div className="sm:col-span-1">
              <Button as="button" type="button" onClick={handleAdd} disabled={busy} className="w-full py-3.5">
                {busy ? "…" : "Add"}
              </Button>
            </div>
          </>
        )}
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-red-400">{error}</p>}
    </div>
  );
}

function TotalsCard({ estimate, totals, onSaved }) {
  const [pcts, setPcts] = useState({
    overhead_pct: estimate.overhead_pct,
    profit_pct: estimate.profit_pct,
    tax_pct: estimate.tax_pct,
  });

  function set(field) {
    return (e) => setPcts((p) => ({ ...p, [field]: e.target.value }));
  }

  async function save() {
    const updated = await updateRemodelEstimate(estimate.id, {
      overhead_pct: Number(pcts.overhead_pct) || 0,
      profit_pct: Number(pcts.profit_pct) || 0,
      tax_pct: Number(pcts.tax_pct) || 0,
    });
    onSaved(updated);
  }

  return (
    <Card className="border-gold-500/30">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Overhead %">
          <Input type="number" step="0.1" value={pcts.overhead_pct} onChange={set("overhead_pct")} onBlur={save} />
        </Field>
        <Field label="Profit %">
          <Input type="number" step="0.1" value={pcts.profit_pct} onChange={set("profit_pct")} onBlur={save} />
        </Field>
        <Field label="Tax %">
          <Input type="number" step="0.1" value={pcts.tax_pct} onChange={set("tax_pct")} onBlur={save} />
        </Field>
      </div>

      <div className="mt-5 space-y-1.5 text-sm">
        <div className="flex justify-between text-white/70">
          <span>Subtotal</span>
          <span>{formatCurrency(totals.subtotal)}</span>
        </div>
        <div className="flex justify-between text-white/70">
          <span>Overhead</span>
          <span>{formatCurrency(totals.overheadAmount)}</span>
        </div>
        <div className="flex justify-between text-white/70">
          <span>Profit</span>
          <span>{formatCurrency(totals.profitAmount)}</span>
        </div>
        <div className="flex justify-between text-white/70">
          <span>Tax</span>
          <span>{formatCurrency(totals.taxAmount)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-navy-600/60 pt-2 text-lg font-extrabold text-white">
          <span>Total</span>
          <span>{formatCurrency(totals.grandTotal)}</span>
        </div>
      </div>
    </Card>
  );
}
