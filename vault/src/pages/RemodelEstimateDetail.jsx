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
} from "../lib/api/remodelEstimates.js";
import { generateRemodelEstimatePdf } from "../lib/remodel/pdf.js";
import { roomTotal, computeEstimateTotals } from "../lib/remodel/totals.js";
import { useAuth } from "../lib/AuthContext.jsx";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { Field, Input, Select } from "../components/ui/Field.jsx";
import { formatCurrency, midpoint } from "../lib/format.js";

const CATEGORY_LABEL = {
  general: "General",
  kitchen: "Kitchen",
  bathroom: "Bathroom",
  roofing: "Roofing",
  electrical: "Electrical",
  plumbing: "Plumbing",
  doors_windows: "Doors & Windows",
  stairs_railings: "Stairs & Railings",
  closets_storage: "Closets & Storage",
  hvac: "HVAC",
  exterior: "Exterior",
  water_mitigation: "Water Mitigation / Mold",
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

export default function RemodelEstimateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [estimate, setEstimate] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchRemodelEstimate(id), fetchRemodelRooms(id), fetchRemodelItems()])
      .then(([est, roomRows, items]) => {
        if (cancelled) return;
        if (!est) {
          setError("Estimate not found.");
          return;
        }
        setEstimate(est);
        setRooms(roomRows);
        setCatalog(items);
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

function RoomCard({ room, catalog, onRoomChanged, onRoomDeleted }) {
  const [name, setName] = useState(room.name || "");
  const items = room.remodel_room_items || [];

  async function handleNameBlur() {
    if (name === room.name) return;
    const updated = await updateRemodelRoom(room.id, { name: name || "Untitled room" });
    onRoomChanged({ ...updated, remodel_room_items: items });
  }

  async function handleDeleteRoom() {
    if (!window.confirm(`Delete "${room.name}" and all its items?`)) return;
    await deleteRemodelRoom(room.id);
    onRoomDeleted(room.id);
  }

  function handleItemAdded(newItem) {
    onRoomChanged({ ...room, remodel_room_items: [...items, newItem] });
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
            Room name — type anything
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

      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <RoomItemRow
            key={item.id}
            item={item}
            onChanged={handleItemChanged}
            onDeleted={handleItemDeleted}
          />
        ))}
      </div>

      <AddItemForm roomId={room.id} catalog={catalog} onAdded={handleItemAdded} />

      <div className="mt-4 flex justify-end border-t border-navy-600/60 pt-3">
        <span className="font-bold text-white">
          Room subtotal: {formatCurrency(roomTotal({ remodel_room_items: items }))}
        </span>
      </div>
    </Card>
  );
}

function RoomItemRow({ item, onChanged, onDeleted }) {
  const [fields, setFields] = useState({
    description: item.description,
    unit: item.unit,
    quantity: item.quantity,
    unit_price: item.unit_price,
    note: item.note || "",
  });

  function set(field) {
    return (e) => setFields((f) => ({ ...f, [field]: e.target.value }));
  }

  async function save() {
    const updated = await updateRemodelRoomItem(item.id, {
      description: fields.description,
      unit: fields.unit,
      quantity: Number(fields.quantity) || 0,
      unit_price: Number(fields.unit_price) || 0,
      note: fields.note || null,
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
      <input
        value={fields.description}
        onChange={set("description")}
        onBlur={save}
        className="col-span-5 bg-transparent text-white focus:outline-none"
      />
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

function AddItemForm({ roomId, catalog, onAdded }) {
  const [mode, setMode] = useState("catalog"); // "catalog" | "custom"
  const [category, setCategory] = useState("general");
  const [catalogItemId, setCatalogItemId] = useState("");
  const [custom, setCustom] = useState({ description: "", unit: "EA", unitPrice: "" });
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const itemsInCategory = catalog.filter((it) => it.category === category);

  async function handleAdd() {
    setBusy(true);
    setError("");
    try {
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
        });
        onAdded(newItem);
        setCustom({ description: "", unit: "EA", unitPrice: "" });
      }
      setQuantity(1);
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
        {mode === "catalog" ? (
          <>
            <div className="sm:col-span-3">
              <Field label="Category">
                <Select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setCatalogItemId("");
                  }}
                >
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
                      {it.description} ({it.unit})
                    </option>
                  ))}
                </Select>
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
