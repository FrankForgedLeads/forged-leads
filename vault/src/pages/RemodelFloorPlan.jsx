import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchRemodelEstimate,
  fetchRemodelRooms,
  fetchRemodelItems,
  fetchRemodelMacros,
  addRemodelRoom,
  updateRemodelRoom,
  deleteRemodelRoom,
  addRoomOpening,
  updateRoomOpening,
  deleteRoomOpening,
  addRemodelRoomItem,
  updateRemodelRoomItem,
  deleteRemodelRoomItem,
} from "../lib/api/remodelEstimates.js";
import {
  computeRoomGeometry,
  fitRectangleToAreaAndPerimeter,
  defaultOpeningFor,
  wallSideLengthFt,
  OPENING_TYPES,
} from "../lib/remodel/floorplanGeometry.js";
import {
  hasMeasurements,
  floorAreaSF,
  ceilingAreaSF,
  wallAreaSF,
  wallGrossAreaSF,
  perimeterLF,
  baseboardLF,
  roomVolumeCF,
} from "../lib/remodel/measurements.js";
import { roomTotal } from "../lib/remodel/totals.js";
import { formatCurrency, midpoint } from "../lib/format.js";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { Field, Input, Select } from "../components/ui/Field.jsx";
import CatalogItemProvenance from "../components/remodel/CatalogItemProvenance.jsx";

const PX_PER_FT = 24;
const VIEW_W = 2000;
const VIEW_H = 1220;
const WALL_HIT_THRESHOLD_FT = 1.5;

// Which edges each resize handle controls — the 4 corners move two edges
// at once (both dimensions); the 4 wall-midpoint handles move just the one
// edge they sit on, resizing a single dimension without touching the other.
const RESIZE_HANDLE_EDGES = {
  NW: { left: true, top: true },
  NE: { right: true, top: true },
  SW: { left: true, bottom: true },
  SE: { right: true, bottom: true },
  N: { top: true },
  S: { bottom: true },
  W: { left: true },
  E: { right: true },
};
const ROOM_DRAG_COOLDOWN_MS = 300;

const TOOLS = [
  { id: "select", key: "Esc", label: "Select", icon: "↖" },
  { id: "room", key: "R", label: "Room", icon: "▭" },
  { id: "door", key: "D", label: "Door", icon: "🚪" },
  { id: "window", key: "W", label: "Window", icon: "🪟" },
];

function snapFt(ft) {
  return Math.round(ft * 2) / 2; // nearest 0.5 ft
}

function clientToFeet(svgEl, clientX, clientY, zoom) {
  const rect = svgEl.getBoundingClientRect();
  const xPx = ((clientX - rect.left) / rect.width) * VIEW_W;
  const yPx = ((clientY - rect.top) / rect.height) * VIEW_H;
  return { xFt: xPx / zoom / PX_PER_FT, yFt: yPx / zoom / PX_PER_FT };
}

// Point-to-segment distance, for hit-testing which wall a click landed near.
function distToSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq > 0 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return { dist: Math.hypot(p.x - projX, p.y - projY), t };
}

function wallSegmentFt(room, side) {
  const x = Number(room.floorplan_x) || 0;
  const y = Number(room.floorplan_y) || 0;
  const w = Number(room.width_ft) || 0;
  const l = Number(room.length_ft) || 0;
  switch (side) {
    case "N":
      return { a: { x, y }, b: { x: x + w, y } };
    case "S":
      return { a: { x, y: y + l }, b: { x: x + w, y: y + l } };
    case "W":
      return { a: { x, y }, b: { x, y: y + l } };
    case "E":
    default:
      return { a: { x: x + w, y }, b: { x: x + w, y: y + l } };
  }
}

// Finds the wall a door/window click is for. Anywhere at or inside a
// room (plus a little padding past its edge) picks that room's own
// nearest wall outright — click anywhere "on the box," not just right on
// the wall line. The threshold only matters for telling rooms apart when
// a click is genuinely in open space between them.
function findNearestWall(pointFt, rooms) {
  let best = null;
  for (const room of rooms) {
    const x0 = Number(room.floorplan_x) || 0;
    const y0 = Number(room.floorplan_y) || 0;
    const w0 = Number(room.width_ft) || 0;
    const l0 = Number(room.length_ft) || 0;
    const nearThisRoom =
      pointFt.xFt >= x0 - WALL_HIT_THRESHOLD_FT &&
      pointFt.xFt <= x0 + w0 + WALL_HIT_THRESHOLD_FT &&
      pointFt.yFt >= y0 - WALL_HIT_THRESHOLD_FT &&
      pointFt.yFt <= y0 + l0 + WALL_HIT_THRESHOLD_FT;
    if (!nearThisRoom) continue;

    for (const side of ["N", "E", "S", "W"]) {
      const { a, b } = wallSegmentFt(room, side);
      const { dist, t } = distToSegment(pointFt, a, b);
      if (!best || dist < best.dist) {
        const wallLenFt = wallSideLengthFt(side, room.width_ft, room.length_ft);
        best = { dist, room, side, offsetFt: t * wallLenFt };
      }
    }
  }
  return best;
}

export default function RemodelFloorPlan() {
  const { estimateId } = useParams();
  const navigate = useNavigate();
  const svgRef = useRef(null);

  const [estimate, setEstimate] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [macros, setMacros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tool, setTool] = useState("select");
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [selectedOpeningId, setSelectedOpeningId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [hoverWall, setHoverWall] = useState(null);
  // Dragging an already-placed room by its center handle (the red dot) —
  // the offset keeps the grab point fixed under the cursor instead of the
  // room snapping its corner there; the ref mirrors the live position so
  // pointerup can persist the final spot without waiting on state timing.
  const [draggingRoomId, setDraggingRoomId] = useState(null);
  const dragOffsetRef = useRef({ dxFt: 0, dyFt: 0 });
  const dragPositionRef = useRef({ xFt: 0, yFt: 0 });
  const lastRoomDragEndAtRef = useRef(0);
  // Resizing from a corner or wall-midpoint handle (the yellow dots) — the
  // opposite side(s) are the fixed anchor for the whole drag, captured once
  // at pointerdown so every pointermove just recomputes the rectangle from
  // that anchor + cursor.
  const [resizingRoom, setResizingRoom] = useState(null); // { roomId, handle }
  const resizeAnchorRef = useRef({ left: 0, top: 0, right: 0, bottom: 0 });
  const resizeResultRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchRemodelEstimate(estimateId),
      fetchRemodelRooms(estimateId),
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
        setCatalog(items);
        setMacros(macroRows);

        // One-time, non-destructive migration for rooms that predate the
        // floor plan: fit the closest rectangle from an old freehand
        // sketch's own floor SF + perimeter (per Frank's "auto-convert"
        // choice), and auto-place any room with no canvas position yet.
        // Rooms that already have real dimensions/positions are untouched.
        let cursorX = 1;
        const updates = [];
        const placed = roomRows.map((r) => {
          let widthFt = r.width_ft ? Number(r.width_ft) : null;
          let lengthFt = r.length_ft ? Number(r.length_ft) : null;
          let changed = false;
          if ((!widthFt || !lengthFt) && Number(r.sketch_floor_area_sf) > 0) {
            const fit = fitRectangleToAreaAndPerimeter(r.sketch_floor_area_sf, r.sketch_perimeter_lf);
            if (fit) {
              widthFt = fit.widthFt;
              lengthFt = fit.lengthFt;
              changed = true;
            }
          }
          if (!widthFt) {
            widthFt = 10;
            changed = true;
          }
          if (!lengthFt) {
            lengthFt = 10;
            changed = true;
          }
          const ceilingHeightFt = Number(r.ceiling_height_ft) > 0 ? Number(r.ceiling_height_ft) : 8;

          let floorplanX = r.floorplan_x != null ? Number(r.floorplan_x) : null;
          let floorplanY = r.floorplan_y != null ? Number(r.floorplan_y) : null;
          if (floorplanX == null || floorplanY == null) {
            floorplanX = cursorX;
            floorplanY = 1;
            changed = true;
          }
          cursorX = Math.max(cursorX, floorplanX + widthFt + 2);

          const next = {
            ...r,
            width_ft: widthFt,
            length_ft: lengthFt,
            ceiling_height_ft: ceilingHeightFt,
            floorplan_x: floorplanX,
            floorplan_y: floorplanY,
          };
          if (changed) {
            updates.push({
              id: r.id,
              fields: {
                width_ft: widthFt,
                length_ft: lengthFt,
                ceiling_height_ft: ceilingHeightFt,
                floorplan_x: floorplanX,
                floorplan_y: floorplanY,
              },
            });
          }
          return next;
        });
        setRooms(placed);
        updates.forEach(({ id, fields }) => updateRemodelRoom(id, fields).catch(() => {}));
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [estimateId]);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || null;
  const selectedOpening =
    selectedRoom?.remodel_room_openings?.find((o) => o.id === selectedOpeningId) || null;

  function patchRoom(roomId, patch) {
    setRooms((rs) => rs.map((r) => (r.id === roomId ? { ...r, ...patch } : r)));
  }

  // --- Keyboard shortcuts -----------------------------------------------
  useEffect(() => {
    function handleKeyDown(e) {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Escape") {
        setTool("select");
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedOpeningId) {
          handleDeleteOpening(selectedOpeningId).catch((err) => setError(err.message));
        } else if (selectedRoomId) {
          handleDeleteRoom(selectedRoomId).catch((err) => setError(err.message));
        }
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "r") setTool("room");
      else if (key === "d") setTool("door");
      else if (key === "w") setTool("window");
      else if (key === "v" || key === "s") setTool("select");
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomId, selectedOpeningId, rooms]);

  // --- Placement ----------------------------------------------------------
  async function handleCreateRoomAt(pointFt) {
    const newRoom = await addRemodelRoom({
      estimateId,
      name: `Room ${rooms.length + 1}`,
      sortOrder: rooms.length,
      widthFt: 10,
      lengthFt: 10,
      ceilingHeightFt: 8,
      floorplanX: snapFt(pointFt.xFt),
      floorplanY: snapFt(pointFt.yFt),
    });
    setRooms((rs) => [...rs, newRoom]);
    setSelectedRoomId(newRoom.id);
    setSelectedOpeningId(null);
    setTool("select");
  }

  async function handleAttachOpening(hit, openingType) {
    const def = defaultOpeningFor(openingType);
    const wallLenFt = wallSideLengthFt(hit.side, hit.room.width_ft, hit.room.length_ft);
    const offsetFt = Math.max(0, Math.min(hit.offsetFt - def.width_ft / 2, Math.max(0, wallLenFt - def.width_ft)));
    const opening = await addRoomOpening({
      roomId: hit.room.id,
      wallSide: hit.side,
      offsetFt: Number(offsetFt.toFixed(2)),
      widthFt: def.width_ft,
      heightFt: def.height_ft,
      qty: 1,
      type: def.type,
      startsAtFloor: def.starts_at_floor,
    });
    patchRoom(hit.room.id, {
      remodel_room_openings: [...(hit.room.remodel_room_openings || []), opening],
    });
    setSelectedRoomId(hit.room.id);
    setSelectedOpeningId(opening.id);
    setTool("select");
  }

  function handleCanvasClick(e) {
    // A room drag ends with a pointerup wherever the cursor is, which this
    // same click would otherwise read as "place/select something there."
    if (Date.now() - lastRoomDragEndAtRef.current < ROOM_DRAG_COOLDOWN_MS) return;
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const pointFt = clientToFeet(svgEl, e.clientX, e.clientY, zoom);

    if (tool === "room") {
      handleCreateRoomAt(pointFt).catch((err) => setError(err.message));
      return;
    }
    if (tool === "door" || tool === "window") {
      const hit = findNearestWall(pointFt, rooms);
      if (hit) handleAttachOpening(hit, tool).catch((err) => setError(err.message));
      return;
    }
    setSelectedRoomId(null);
    setSelectedOpeningId(null);
  }

  function handleCanvasMouseMove(e) {
    if (tool !== "door" && tool !== "window") {
      if (hoverWall) setHoverWall(null);
      return;
    }
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const pointFt = clientToFeet(svgEl, e.clientX, e.clientY, zoom);
    setHoverWall(findNearestWall(pointFt, rooms));
  }

  function selectRoom(roomId, e) {
    e?.stopPropagation();
    if (tool !== "select") return;
    setSelectedRoomId(roomId);
    setSelectedOpeningId(null);
  }

  // Grabbing a room's center handle (the red dot) and dragging it — lets
  // rooms be arranged next to each other on the shared canvas.
  function handleRoomDragPointerDown(room, e) {
    if (tool !== "select") return;
    e.stopPropagation();
    e.preventDefault();
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const pointFt = clientToFeet(svgEl, e.clientX, e.clientY, zoom);
    dragOffsetRef.current = {
      dxFt: pointFt.xFt - (Number(room.floorplan_x) || 0),
      dyFt: pointFt.yFt - (Number(room.floorplan_y) || 0),
    };
    dragPositionRef.current = {
      xFt: Number(room.floorplan_x) || 0,
      yFt: Number(room.floorplan_y) || 0,
    };
    setSelectedRoomId(room.id);
    setSelectedOpeningId(null);
    setDraggingRoomId(room.id);
  }

  useEffect(() => {
    if (!draggingRoomId) return;
    function handleMove(e) {
      const svgEl = svgRef.current;
      if (!svgEl) return;
      const pointFt = clientToFeet(svgEl, e.clientX, e.clientY, zoom);
      const nextX = snapFt(pointFt.xFt - dragOffsetRef.current.dxFt);
      const nextY = snapFt(pointFt.yFt - dragOffsetRef.current.dyFt);
      dragPositionRef.current = { xFt: nextX, yFt: nextY };
      patchRoom(draggingRoomId, { floorplan_x: nextX, floorplan_y: nextY });
    }
    function handleUp() {
      lastRoomDragEndAtRef.current = Date.now();
      const { xFt, yFt } = dragPositionRef.current;
      updateRemodelRoom(draggingRoomId, { floorplan_x: xFt, floorplan_y: yFt }).catch((err) =>
        setError(err.message),
      );
      setDraggingRoomId(null);
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingRoomId, zoom]);

  // Grabbing a room's corner (a yellow dot) and dragging it to resize the
  // room — the opposite corner stays put; this one, and the two sides
  // touching it, move with the cursor.
  function handleResizePointerDown(room, handle, e) {
    if (tool !== "select") return;
    e.stopPropagation();
    e.preventDefault();
    const x0 = Number(room.floorplan_x) || 0;
    const y0 = Number(room.floorplan_y) || 0;
    const w0 = Number(room.width_ft) || 0;
    const l0 = Number(room.length_ft) || 0;
    resizeAnchorRef.current = { left: x0, top: y0, right: x0 + w0, bottom: y0 + l0 };
    resizeResultRef.current = { floorplan_x: x0, floorplan_y: y0, width_ft: w0, length_ft: l0 };
    setSelectedRoomId(room.id);
    setSelectedOpeningId(null);
    setResizingRoom({ roomId: room.id, handle });
  }

  useEffect(() => {
    if (!resizingRoom) return;
    const MIN_ROOM_FT = 2;
    const edges = RESIZE_HANDLE_EDGES[resizingRoom.handle];
    function handleMove(e) {
      const svgEl = svgRef.current;
      if (!svgEl) return;
      const pointFt = clientToFeet(svgEl, e.clientX, e.clientY, zoom);
      const anchor = resizeAnchorRef.current;
      let { left, top, right, bottom } = anchor;
      if (edges.left) left = pointFt.xFt;
      if (edges.right) right = pointFt.xFt;
      if (edges.top) top = pointFt.yFt;
      if (edges.bottom) bottom = pointFt.yFt;

      if (right - left < MIN_ROOM_FT) {
        if (edges.left) left = right - MIN_ROOM_FT;
        else right = left + MIN_ROOM_FT;
      }
      if (bottom - top < MIN_ROOM_FT) {
        if (edges.top) top = bottom - MIN_ROOM_FT;
        else bottom = top + MIN_ROOM_FT;
      }

      const result = {
        floorplan_x: snapFt(left),
        floorplan_y: snapFt(top),
        width_ft: snapFt(right - left),
        length_ft: snapFt(bottom - top),
      };
      resizeResultRef.current = result;
      patchRoom(resizingRoom.roomId, result);
    }
    function handleUp() {
      lastRoomDragEndAtRef.current = Date.now();
      updateRemodelRoom(resizingRoom.roomId, resizeResultRef.current).catch((err) =>
        setError(err.message),
      );
      setResizingRoom(null);
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resizingRoom, zoom]);

  function selectOpening(roomId, openingId, e) {
    e?.stopPropagation();
    if (tool !== "select") return;
    setSelectedRoomId(roomId);
    setSelectedOpeningId(openingId);
  }

  // --- Editing / deleting ---------------------------------------------------
  async function handleRoomFieldChange(roomId, fields) {
    const updated = await updateRemodelRoom(roomId, fields);
    patchRoom(roomId, updated);
  }

  async function handleDeleteRoom(roomId) {
    const room = rooms.find((r) => r.id === roomId);
    if (!window.confirm(`Delete "${room?.name || "this room"}" and all its line items?`)) return;
    await deleteRemodelRoom(roomId);
    setRooms((rs) => rs.filter((r) => r.id !== roomId));
    setSelectedRoomId(null);
    setSelectedOpeningId(null);
  }

  async function handleOpeningFieldChange(openingId, fields) {
    const updated = await updateRoomOpening(openingId, fields);
    setRooms((rs) =>
      rs.map((r) =>
        r.id !== selectedRoomId
          ? r
          : {
              ...r,
              remodel_room_openings: (r.remodel_room_openings || []).map((o) =>
                o.id === openingId ? updated : o,
              ),
            },
      ),
    );
  }

  async function handleDeleteOpening(openingId) {
    await deleteRoomOpening(openingId);
    setRooms((rs) =>
      rs.map((r) => ({
        ...r,
        remodel_room_openings: (r.remodel_room_openings || []).filter((o) => o.id !== openingId),
      })),
    );
    setSelectedOpeningId(null);
  }

  function handleRoomItemsChanged(roomId, remodel_room_items) {
    patchRoom(roomId, { remodel_room_items });
  }

  const totalValue = useMemo(() => rooms.reduce((sum, r) => sum + roomTotal(r), 0), [rooms]);

  if (loading) return <div className="container-vault py-10 text-white/60">Loading…</div>;
  if (error && !estimate)
    return <div className="container-vault py-10 font-semibold text-red-400">{error}</div>;

  return (
    <div className="w-full px-4 py-8" style={{ maxWidth: "100%" }}>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy-600/60 bg-navy-900/60 px-4 py-3">
        <div>
          <h1 className="text-xl font-extrabold text-white">
            {estimate.title || "Untitled estimate"}
          </h1>
          <p className="text-xs text-white/50">
            {[estimate.client_name, estimate.property_address].filter(Boolean).join(" · ") ||
              "No client/property set"}
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-white/60">
          <span>Total: <strong className="text-white">{formatCurrency(totalValue)}</strong></span>
          <Button variant="ghost" onClick={() => navigate(`/remodel/${estimateId}`)}>
            Classic view
          </Button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm font-semibold text-red-400">{error}</p>}

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[130px_1fr_240px]">
        {/* LEFT: tools + room list */}
        <Card className="!p-3">
          <div className="text-xs font-bold uppercase tracking-wide text-white/40">Tools</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTool(t.id)}
                className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs font-semibold ${
                  tool === t.id
                    ? "border-gold-500 bg-gold-500/15 text-gold-300"
                    : "border-navy-600 bg-navy-900/60 text-white/70 hover:bg-navy-800"
                }`}
                title={`Shortcut: ${t.key}`}
              >
                <span className="text-lg leading-none">{t.icon}</span>
                <span>{t.label}</span>
                <span className="rounded bg-navy-950 px-1 text-[10px] text-white/40">{t.key}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 text-xs font-bold uppercase tracking-wide text-white/40">Zoom</div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.4, Number((z / 1.2).toFixed(2))))}
              className="flex-1 rounded bg-navy-700 py-1.5 text-sm font-bold text-white/80 hover:bg-navy-600"
            >
              −
            </button>
            <span className="flex-1 text-center text-sm text-white/60">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, Number((z * 1.2).toFixed(2))))}
              className="flex-1 rounded bg-navy-700 py-1.5 text-sm font-bold text-white/80 hover:bg-navy-600"
            >
              +
            </button>
          </div>

          <div className="mt-4 text-xs font-bold uppercase tracking-wide text-white/40">Rooms</div>
          <div className="mt-2 space-y-1">
            {rooms.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setTool("select");
                  setSelectedRoomId(r.id);
                  setSelectedOpeningId(null);
                }}
                className={`block w-full truncate rounded px-2 py-1.5 text-left text-xs font-semibold ${
                  selectedRoomId === r.id
                    ? "bg-gold-500/15 text-gold-300"
                    : "text-white/70 hover:bg-navy-800"
                }`}
              >
                {r.name || "Untitled room"}
              </button>
            ))}
            {rooms.length === 0 && (
              <p className="text-xs text-white/30">Press R, then click the canvas to place one.</p>
            )}
          </div>
        </Card>

        {/* CENTER: canvas */}
        <Card className="!p-3">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            className={`w-full rounded-xl border border-slate-300 bg-white ${
              tool === "select" ? "cursor-default" : "cursor-crosshair"
            }`}
            style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
          >
            <defs>
              <pattern id="fpgrid" width={PX_PER_FT} height={PX_PER_FT} patternUnits="userSpaceOnUse">
                <path
                  d={`M ${PX_PER_FT} 0 L 0 0 0 ${PX_PER_FT}`}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width={VIEW_W} height={VIEW_H} fill="url(#fpgrid)" />

            <g transform={`scale(${zoom})`}>
              {rooms.map((room) => (
                <RoomShape
                  key={room.id}
                  room={room}
                  selected={selectedRoomId === room.id}
                  selectedOpeningId={selectedOpeningId}
                  draggable={tool === "select"}
                  dragging={draggingRoomId === room.id}
                  resizingHandle={resizingRoom?.roomId === room.id ? resizingRoom.handle : null}
                  onSelectRoom={(e) => selectRoom(room.id, e)}
                  onSelectOpening={(openingId, e) => selectOpening(room.id, openingId, e)}
                  onDragPointerDown={(e) => handleRoomDragPointerDown(room, e)}
                  onResizePointerDown={(corner, e) => handleResizePointerDown(room, corner, e)}
                />
              ))}
              {hoverWall && (
                <WallHighlight hit={hoverWall} color={tool === "door" ? "#eab308" : "#38bdf8"} />
              )}
            </g>
          </svg>
          <p className="mt-2 text-xs text-white/40">
            {tool === "room" && "Click the canvas to place a room, then set its size on the right."}
            {tool === "door" && "Move near a wall and click to attach a door."}
            {tool === "window" && "Move near a wall and click to attach a window."}
            {tool === "select" &&
              "Click a room or opening to select it. Drag the red dot to move a room, or any yellow dot (corner or wall-middle) to resize it. R = room, D = door, W = window, Esc = select, Delete = remove selection."}
          </p>
        </Card>

        {/* RIGHT: properties */}
        <Card className="!p-3">
          {selectedOpening ? (
            <OpeningProperties
              opening={selectedOpening}
              room={selectedRoom}
              onChange={(fields) =>
                handleOpeningFieldChange(selectedOpening.id, fields).catch((err) => setError(err.message))
              }
              onDelete={() =>
                handleDeleteOpening(selectedOpening.id).catch((err) => setError(err.message))
              }
            />
          ) : selectedRoom ? (
            <RoomProperties
              room={selectedRoom}
              onChange={(fields) =>
                handleRoomFieldChange(selectedRoom.id, fields).catch((err) => setError(err.message))
              }
              onDelete={() =>
                handleDeleteRoom(selectedRoom.id).catch((err) => setError(err.message))
              }
            />
          ) : (
            <p className="text-sm text-white/40">
              Select a room or an opening to see and edit its measurements, or press R / D / W to
              place a new one.
            </p>
          )}
        </Card>
      </div>

      <div className="mt-4">
        <LineItemsTable rooms={rooms} catalog={catalog} macros={macros} onRoomItemsChanged={handleRoomItemsChanged} />
      </div>
    </div>
  );
}

// Position (as a fraction of the room's box) and cursor for all 8 resize
// handles — the 4 corners (resize both dimensions) plus the 4 wall
// midpoints (resize just that one side, requested so a handle sits right
// on the middle of each wall line instead of only at the corners).
const RESIZE_HANDLES = [
  { id: "NW", fx: 0, fy: 0, cursor: "cursor-nwse-resize" },
  { id: "NE", fx: 1, fy: 0, cursor: "cursor-nesw-resize" },
  { id: "SW", fx: 0, fy: 1, cursor: "cursor-nesw-resize" },
  { id: "SE", fx: 1, fy: 1, cursor: "cursor-nwse-resize" },
  { id: "N", fx: 0.5, fy: 0, cursor: "cursor-ns-resize" },
  { id: "S", fx: 0.5, fy: 1, cursor: "cursor-ns-resize" },
  { id: "W", fx: 0, fy: 0.5, cursor: "cursor-ew-resize" },
  { id: "E", fx: 1, fy: 0.5, cursor: "cursor-ew-resize" },
];

function RoomShape({
  room,
  selected,
  selectedOpeningId,
  draggable,
  dragging,
  resizingHandle,
  onSelectRoom,
  onSelectOpening,
  onDragPointerDown,
  onResizePointerDown,
}) {
  const x = (Number(room.floorplan_x) || 0) * PX_PER_FT;
  const y = (Number(room.floorplan_y) || 0) * PX_PER_FT;
  const w = (Number(room.width_ft) || 0) * PX_PER_FT;
  const l = (Number(room.length_ft) || 0) * PX_PER_FT;
  const geometry = computeRoomGeometry({
    widthFt: room.width_ft,
    lengthFt: room.length_ft,
    ceilingHeightFt: room.ceiling_height_ft,
    openings: room.remodel_room_openings || [],
  });

  const wallColor = selected ? "#eab308" : "#334155";

  return (
    <g onClick={onSelectRoom} className="cursor-pointer">
      <rect x={x} y={y} width={w} height={l} fill={selected ? "rgba(234,179,8,0.08)" : "rgba(148,163,184,0.06)"} />
      {["N", "E", "S", "W"].map((side) => (
        <WallWithOpenings
          key={side}
          room={room}
          side={side}
          color={wallColor}
          selectedOpeningId={selectedOpeningId}
          onSelectOpening={onSelectOpening}
        />
      ))}
      {/* Dimension labels */}
      <text x={x + w / 2} y={y - 6} textAnchor="middle" fontSize="11" fill="#475569">
        {room.width_ft}'
      </text>
      <text
        x={x - 8}
        y={y + l / 2}
        textAnchor="middle"
        fontSize="11"
        fill="#475569"
        transform={`rotate(-90 ${x - 8} ${y + l / 2})`}
      >
        {room.length_ft}'
      </text>
      <text x={x + w / 2} y={y + l / 2 - 6} textAnchor="middle" fontSize="13" fontWeight="bold" fill="#1e293b">
        {(room.name || "Untitled room").toUpperCase()}
      </text>
      <text x={x + w / 2} y={y + l / 2 + 12} textAnchor="middle" fontSize="11" fill="#b45309">
        {geometry.floorAreaSF.toFixed(0)} SF
      </text>
      {/* Drag handle — grab and drag to move this room next to another one. */}
      {draggable && (
        <g
          className="cursor-move"
          style={{ touchAction: "none" }}
          onPointerDown={onDragPointerDown}
        >
          <circle
            cx={x + w / 2}
            cy={y + 26}
            r={dragging ? 20 : 16}
            fill="#ef4444"
            stroke="#fff"
            strokeWidth={dragging ? 3 : 2}
          />
          <text
            x={x + w / 2}
            y={y + 26}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="16"
            fill="#fff"
            style={{ pointerEvents: "none" }}
          >
            ✥
          </text>
        </g>
      )}
      {/* Resize handles — 4 corners (resize both dimensions) plus 4 wall
          midpoints (resize just that one side), so a yellow dot sits right
          on the middle of each wall line, not only at the corners. */}
      {draggable &&
        RESIZE_HANDLES.map(({ id, fx, fy, cursor }) => {
          const cx = x + fx * w;
          const cy = y + fy * l;
          const active = resizingHandle === id;
          return (
            <circle
              key={id}
              cx={cx}
              cy={cy}
              r={active ? 13 : 10}
              fill="#eab308"
              stroke="#fff"
              strokeWidth={active ? 3 : 2}
              className={cursor}
              style={{ touchAction: "none" }}
              onPointerDown={(e) => onResizePointerDown(id, e)}
            />
          );
        })}
    </g>
  );
}

function WallWithOpenings({ room, side, color, selectedOpeningId, onSelectOpening }) {
  const { a, b } = wallSegmentFt(room, side);
  const ax = a.x * PX_PER_FT;
  const ay = a.y * PX_PER_FT;
  const bx = b.x * PX_PER_FT;
  const by = b.y * PX_PER_FT;
  const openings = (room.remodel_room_openings || []).filter((o) => o.wall_side === side);
  const wallLenFt = wallSideLengthFt(side, room.width_ft, room.length_ft);
  const horizontal = side === "N" || side === "S";

  return (
    <g>
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke={color} strokeWidth="5" strokeLinecap="square" />
      {openings.map((o) => {
        const startFt = Math.max(0, Math.min(Number(o.offset_ft) || 0, wallLenFt));
        const endFt = Math.max(startFt, Math.min(startFt + (Number(o.width_ft) || 0), wallLenFt));
        const sx = horizontal ? ax + startFt * PX_PER_FT : ax;
        const sy = horizontal ? ay : ay + startFt * PX_PER_FT;
        const ex = horizontal ? ax + endFt * PX_PER_FT : ax;
        const ey = horizontal ? ay : ay + endFt * PX_PER_FT;
        const isWindow = o.type === "window";
        const openingColor =
          selectedOpeningId === o.id ? "#0f172a" : isWindow ? "#38bdf8" : "#eab308";
        return (
          <line
            key={o.id}
            x1={sx}
            y1={sy}
            x2={ex}
            y2={ey}
            stroke={openingColor}
            strokeWidth={isWindow ? 5 : 7}
            strokeLinecap="butt"
            className="cursor-pointer"
            onClick={(e) => onSelectOpening(o.id, e)}
          />
        );
      })}
    </g>
  );
}

function WallHighlight({ hit, color }) {
  const { a, b } = wallSegmentFt(hit.room, hit.side);
  return (
    <line
      x1={a.x * PX_PER_FT}
      y1={a.y * PX_PER_FT}
      x2={b.x * PX_PER_FT}
      y2={b.y * PX_PER_FT}
      stroke={color}
      strokeOpacity="0.5"
      strokeWidth="9"
      strokeLinecap="square"
    />
  );
}

function RoomProperties({ room, onChange, onDelete }) {
  const [form, setForm] = useState({
    name: room.name || "",
    width_ft: room.width_ft ?? "",
    length_ft: room.length_ft ?? "",
    ceiling_height_ft: room.ceiling_height_ft ?? "",
  });

  useEffect(() => {
    setForm({
      name: room.name || "",
      width_ft: room.width_ft ?? "",
      length_ft: room.length_ft ?? "",
      ceiling_height_ft: room.ceiling_height_ft ?? "",
    });
  }, [room.id, room.name, room.width_ft, room.length_ft, room.ceiling_height_ft]);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function commit() {
    onChange({
      name: form.name.trim() || "Untitled room",
      width_ft: Number(form.width_ft) || 1,
      length_ft: Number(form.length_ft) || 1,
      ceiling_height_ft: Number(form.ceiling_height_ft) || 8,
    });
  }

  const geometry = computeRoomGeometry({
    widthFt: room.width_ft,
    lengthFt: room.length_ft,
    ceilingHeightFt: room.ceiling_height_ft,
    openings: room.remodel_room_openings || [],
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-white/60">Room</h2>
        <button type="button" onClick={onDelete} className="text-xs font-semibold text-red-400 hover:underline">
          Delete
        </button>
      </div>
      <div className="mt-3 space-y-3">
        <Field label="Room name">
          <Input value={form.name} onChange={set("name")} onBlur={commit} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Width (ft)">
            <Input type="number" step="0.5" value={form.width_ft} onChange={set("width_ft")} onBlur={commit} />
          </Field>
          <Field label="Length (ft)">
            <Input type="number" step="0.5" value={form.length_ft} onChange={set("length_ft")} onBlur={commit} />
          </Field>
        </div>
        <Field label="Wall height (ft)">
          <Input
            type="number"
            step="0.5"
            value={form.ceiling_height_ft}
            onChange={set("ceiling_height_ft")}
            onBlur={commit}
          />
        </Field>
      </div>

      <div className="mt-4 space-y-1.5 rounded-lg border border-navy-600 bg-navy-950/40 p-3 text-sm">
        <Row label="Floor Area" value={`${geometry.floorAreaSF.toFixed(2)} SF`} />
        <Row label="Ceiling Area" value={`${geometry.ceilingAreaSF.toFixed(2)} SF`} />
        <Row label="Wall Area (Gross)" value={`${geometry.wallGrossAreaSF.toFixed(2)} SF`} />
        <Row label="Wall Area (Net)" value={`${geometry.wallNetAreaSF.toFixed(2)} SF`} bold />
        <Row label="Perimeter" value={`${geometry.perimeterLF.toFixed(2)} LF`} />
        <Row label="Baseboard" value={`${geometry.baseboardLF.toFixed(2)} LF`} />
        <Row label="Cornice" value={`${geometry.crownMoldingLF.toFixed(2)} LF`} />
        <Row label="Volume" value={`${geometry.roomVolumeCF.toFixed(2)} CF`} />
      </div>

      {room.remodel_room_openings?.length > 0 && (
        <div className="mt-3 space-y-1.5 rounded-lg border border-navy-600 bg-navy-950/40 p-3 text-sm">
          <h3 className="text-xs font-bold uppercase tracking-wide text-white/40">Openings</h3>
          {room.remodel_room_openings.map((o) => (
            <Row
              key={o.id}
              label={`${OPENING_TYPES[o.type]?.label || o.type} (${o.wall_side})`}
              value={`${(Number(o.width_ft) * Number(o.height_ft) * Number(o.qty)).toFixed(1)} SF`}
            />
          ))}
          <Row label="Total Openings" value={`${geometry.openingsSF.toFixed(2)} SF`} bold />
        </div>
      )}
    </div>
  );
}

function OpeningProperties({ opening, room, onChange, onDelete }) {
  const [form, setForm] = useState({
    type: opening.type,
    width_ft: opening.width_ft,
    height_ft: opening.height_ft,
    qty: opening.qty,
    offset_ft: opening.offset_ft,
    description: opening.description || "",
  });

  useEffect(() => {
    setForm({
      type: opening.type,
      width_ft: opening.width_ft,
      height_ft: opening.height_ft,
      qty: opening.qty,
      offset_ft: opening.offset_ft,
      description: opening.description || "",
    });
  }, [opening.id, opening.type, opening.width_ft, opening.height_ft, opening.qty, opening.offset_ft, opening.description]);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function commit(extra = {}) {
    onChange({
      type: form.type,
      width_ft: Number(form.width_ft) || 1,
      height_ft: Number(form.height_ft) || 1,
      qty: Number(form.qty) || 1,
      offset_ft: Number(form.offset_ft) || 0,
      description: form.description || null,
      ...extra,
    });
  }

  const areaSF = (Number(form.width_ft) || 0) * (Number(form.height_ft) || 0) * (Number(form.qty) || 1);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-white/60">
          Opening — Wall {opening.wall_side}
        </h2>
        <button type="button" onClick={onDelete} className="text-xs font-semibold text-red-400 hover:underline">
          Delete
        </button>
      </div>
      <p className="mt-1 text-xs text-white/40">On {room?.name || "room"}</p>

      <div className="mt-3 space-y-3">
        <Field label="Type">
          <Select
            value={form.type}
            onChange={(e) => {
              const next = defaultOpeningFor(e.target.value);
              setForm((f) => ({ ...f, type: next.type, width_ft: next.width_ft, height_ft: next.height_ft }));
              commit({ type: next.type, width_ft: next.width_ft, height_ft: next.height_ft });
            }}
          >
            {Object.entries(OPENING_TYPES).map(([value, def]) => (
              <option key={value} value={value}>
                {def.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Width (ft)">
            <Input type="number" step="0.1" value={form.width_ft} onChange={set("width_ft")} onBlur={() => commit()} />
          </Field>
          <Field label="Height (ft)">
            <Input type="number" step="0.1" value={form.height_ft} onChange={set("height_ft")} onBlur={() => commit()} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Qty">
            <Input type="number" step="1" value={form.qty} onChange={set("qty")} onBlur={() => commit()} />
          </Field>
          <Field label="Position along wall (ft)">
            <Input type="number" step="0.1" value={form.offset_ft} onChange={set("offset_ft")} onBlur={() => commit()} />
          </Field>
        </div>
        <Field label="Description (optional)">
          <Input value={form.description} onChange={set("description")} onBlur={() => commit()} />
        </Field>
      </div>

      <div className="mt-4 rounded-lg border border-navy-600 bg-navy-950/40 p-3 text-sm">
        <Row label="Opening area" value={`${areaSF.toFixed(2)} SF`} bold />
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/60">{label}</span>
      <span className={bold ? "font-bold text-white" : "text-white/80"}>{value}</span>
    </div>
  );
}

// --- Line items table (all rooms) -------------------------------------
function LineItemsTable({ rooms, catalog, macros, onRoomItemsChanged }) {
  const [groupBy, setGroupBy] = useState("room"); // room | category | none
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const flat = [];
    rooms.forEach((room) => {
      (room.remodel_room_items || []).forEach((item) => {
        const catalogItem = catalog.find((c) => c.id === item.remodel_item_id);
        flat.push({ ...item, roomId: room.id, roomName: room.name, category: catalogItem?.category || "custom" });
      });
    });
    return flat;
  }, [rooms, catalog]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) => r.description.toLowerCase().includes(q) || (r.code || "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const groups = useMemo(() => {
    if (groupBy === "none") return [{ label: null, rows: filteredRows }];
    const key = groupBy === "room" ? "roomName" : "category";
    const map = new Map();
    filteredRows.forEach((r) => {
      const k = r[key] || "—";
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    });
    return [...map.entries()].map(([label, rowsForGroup]) => ({ label, rows: rowsForGroup }));
  }, [filteredRows, groupBy]);

  const grandTotal = filteredRows.reduce((sum, r) => sum + Number(r.quantity) * Number(r.unit_price), 0);

  async function handleQtyOrPriceChange(row, fields) {
    const updated = await updateRemodelRoomItem(row.id, fields);
    const room = rooms.find((r) => r.id === row.roomId);
    onRoomItemsChanged(
      row.roomId,
      (room.remodel_room_items || []).map((i) => (i.id === row.id ? updated : i)),
    );
  }

  async function handleDeleteRow(row) {
    await deleteRemodelRoomItem(row.id);
    const room = rooms.find((r) => r.id === row.roomId);
    onRoomItemsChanged(row.roomId, (room.remodel_room_items || []).filter((i) => i.id !== row.id));
  }

  return (
    <Card className="!p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gold-400">Estimate Line Items</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code or description…"
            className="!w-56 !py-2 text-sm"
          />
          <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="!w-40 !py-2 text-sm">
            <option value="room">Group: Room</option>
            <option value="category">Group: Category</option>
            <option value="none">Group: None</option>
          </Select>
        </div>
      </div>

      <AddLineItem rooms={rooms} catalog={catalog} macros={macros} onRoomItemsChanged={onRoomItemsChanged} />

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-navy-600 text-xs uppercase tracking-wide text-white/40">
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-2">Description</th>
              <th className="py-2 pr-2">Room</th>
              <th className="py-2 pr-2 text-right">Qty</th>
              <th className="py-2 pr-2">Unit</th>
              <th className="py-2 pr-2 text-right">Unit Price</th>
              <th className="py-2 pr-2 text-right">Total</th>
              <th className="py-2 pr-2" />
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <GroupRows
                key={group.label ?? "all"}
                group={group}
                onQtyOrPriceChange={handleQtyOrPriceChange}
                onDelete={handleDeleteRow}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-navy-600 font-bold text-white">
              <td colSpan={6} className="py-2 pr-2 text-right">
                Grand total
              </td>
              <td className="py-2 pr-2 text-right">{formatCurrency(grandTotal)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
        {filteredRows.length === 0 && (
          <p className="py-6 text-center text-sm text-white/30">No line items yet — add one above.</p>
        )}
      </div>
    </Card>
  );
}

function GroupRows({ group, onQtyOrPriceChange, onDelete }) {
  return (
    <>
      {group.label && (
        <tr>
          <td colSpan={8} className="bg-navy-900/60 px-2 py-1 text-xs font-bold uppercase tracking-wide text-white/50">
            {group.label}
          </td>
        </tr>
      )}
      {group.rows.map((row, i) => (
        <LineItemRow key={row.id} n={i + 1} row={row} onQtyOrPriceChange={onQtyOrPriceChange} onDelete={onDelete} />
      ))}
    </>
  );
}

function LineItemRow({ n, row, onQtyOrPriceChange, onDelete }) {
  const [qty, setQty] = useState(row.quantity);
  const [price, setPrice] = useState(row.unit_price);

  useEffect(() => {
    setQty(row.quantity);
    setPrice(row.unit_price);
  }, [row.id, row.quantity, row.unit_price]);

  function commit() {
    const newQty = Number(qty) || 0;
    const newPrice = Number(price) || 0;
    if (newQty === Number(row.quantity) && newPrice === Number(row.unit_price)) return;
    onQtyOrPriceChange(row, { quantity: newQty, unit_price: newPrice });
  }

  return (
    <tr className="border-b border-navy-800/60">
      <td className="py-1.5 pr-2 text-white/40">{n}</td>
      <td className="py-1.5 pr-2 text-white">
        {row.description}
        {row.measurement_source && (
          <span className="ml-2 text-[11px] text-white/30">via {row.measurement_source}</span>
        )}
      </td>
      <td className="py-1.5 pr-2 text-white/60">{row.roomName}</td>
      <td className="py-1.5 pr-2 text-right">
        <input
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onBlur={commit}
          type="number"
          step="0.01"
          className="w-20 bg-transparent text-right text-white focus:outline-none"
        />
      </td>
      <td className="py-1.5 pr-2 text-white/60">{row.unit}</td>
      <td className="py-1.5 pr-2 text-right">
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={commit}
          type="number"
          step="0.01"
          className="w-24 bg-transparent text-right text-white focus:outline-none"
        />
      </td>
      <td className="py-1.5 pr-2 text-right font-semibold text-white">
        {formatCurrency(Number(qty) * Number(price))}
      </td>
      <td className="py-1.5 pr-2 text-right">
        <button type="button" onClick={() => onDelete(row)} className="text-xs font-semibold text-red-400 hover:underline">
          Remove
        </button>
      </td>
    </tr>
  );
}

function AddLineItem({ rooms, catalog, macros, onRoomItemsChanged }) {
  const [roomId, setRoomId] = useState("");
  const [category, setCategory] = useState("");
  const [itemId, setItemId] = useState("");
  const [source, setSource] = useState("");
  const [qty, setQty] = useState(1);
  const [macroId, setMacroId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const room = rooms.find((r) => r.id === roomId) || null;
  const categories = useMemo(() => [...new Set(catalog.map((c) => c.category))].sort(), [catalog]);
  const itemsInCategory = (category ? catalog.filter((c) => c.category === category) : catalog)
    .slice()
    .sort((a, b) => a.description.localeCompare(b.description));

  const sourceOptions = useMemo(() => {
    if (!room || !hasMeasurements(room)) return [];
    const whole = [
      ["floor_sf", "Floor SF", floorAreaSF(room)],
      ["ceiling_sf", "Ceiling SF", ceilingAreaSF(room)],
      ["wall_net_sf", "Wall SF (net)", wallAreaSF(room)],
      ["wall_gross_sf", "Wall SF (gross)", wallGrossAreaSF(room)],
      ["perimeter_lf", "Perimeter LF", perimeterLF(room)],
      ["baseboard_lf", "Baseboard LF", baseboardLF(room)],
      ["room_volume_cf", "Room volume CF", roomVolumeCF(room)],
    ].map(([value, label, q]) => ({
      value,
      qty: q,
      label: `${label} (${q.toFixed(value === "room_volume_cf" ? 0 : 1)})`,
    }));
    const geometry = computeRoomGeometry({
      widthFt: room.width_ft,
      lengthFt: room.length_ft,
      ceilingHeightFt: room.ceiling_height_ft,
      openings: room.remodel_room_openings || [],
    });
    const perWall = geometry.walls.flatMap((w) => [
      { value: `wall_${w.side}_net_sf`, qty: w.netSF, label: `Wall ${w.side} — net SF (${w.netSF.toFixed(1)})` },
      { value: `wall_${w.side}_gross_sf`, qty: w.grossSF, label: `Wall ${w.side} — gross SF (${w.grossSF.toFixed(1)})` },
    ]);
    return [...whole, ...perWall];
  }, [room]);

  function handleSourceChange(e) {
    const value = e.target.value;
    setSource(value);
    const match = sourceOptions.find((o) => o.value === value);
    if (match) setQty(Number(match.qty.toFixed(2)));
  }

  async function handleAdd() {
    if (!roomId) {
      setError("Pick a room first.");
      return;
    }
    const picked = catalog.find((c) => c.id === itemId);
    if (!picked) {
      setError("Pick an item from the list.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const newItem = await addRemodelRoomItem({
        roomId,
        remodelItemId: picked.id,
        description: picked.description,
        unit: picked.unit,
        quantity: Number(qty) || 1,
        unitPrice: midpoint(picked.price_low, picked.price_high),
        measurementSource: source || null,
      });
      onRoomItemsChanged(roomId, [...(room.remodel_room_items || []), newItem]);
      setItemId("");
      setSource("");
      setQty(1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleApplyMacro() {
    const macro = macros.find((m) => m.id === macroId);
    if (!macro || !room) return;
    setBusy(true);
    setError("");
    try {
      const macroItems = [...(macro.remodel_macro_items || [])].sort((a, b) => a.sort_order - b.sort_order);
      const newItems = [];
      for (const mi of macroItems) {
        const catalogItem = mi.remodel_items;
        if (!catalogItem) continue;
        let quantity = Number(mi.fixed_quantity) || 1;
        if (hasMeasurements(room)) {
          if (mi.quantity_mode === "floor_sf") quantity = floorAreaSF(room);
          else if (mi.quantity_mode === "wall_sf") quantity = wallAreaSF(room);
          else if (mi.quantity_mode === "ceiling_sf") quantity = ceilingAreaSF(room);
          else if (mi.quantity_mode === "perimeter_lf") quantity = perimeterLF(room);
        }
        const newItem = await addRemodelRoomItem({
          roomId,
          remodelItemId: catalogItem.id,
          description: catalogItem.description,
          unit: catalogItem.unit,
          quantity: Number(quantity.toFixed(2)),
          unitPrice: midpoint(catalogItem.price_low, catalogItem.price_high),
          measurementSource: hasMeasurements(room) ? mi.quantity_mode : null,
        });
        newItems.push(newItem);
      }
      onRoomItemsChanged(roomId, [...(room.remodel_room_items || []), ...newItems]);
      setMacroId("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-dashed border-navy-500 p-3">
      <div className="grid gap-2 sm:grid-cols-12 sm:items-end">
        <div className="sm:col-span-2">
          <Field label="Room">
            <Select value={roomId} onChange={(e) => setRoomId(e.target.value)} className="text-sm">
              <option value="">Select…</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)} className="text-sm">
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="sm:col-span-3">
          <Field label="Item">
            <Select value={itemId} onChange={(e) => setItemId(e.target.value)} className="text-sm">
              <option value="">Select…</option>
              {itemsInCategory.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.code ? `${it.code} — ` : ""}
                  {it.description} ({it.unit})
                </option>
              ))}
            </Select>
          </Field>
          <CatalogItemProvenance item={catalog.find((it) => it.id === itemId)} />
        </div>
        <div className="sm:col-span-2">
          <Field label="Quantity source">
            <Select value={source} onChange={handleSourceChange} className="text-sm" disabled={!room}>
              <option value="">Manual</option>
              {sourceOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="sm:col-span-1">
          <Field label="Qty">
            <Input type="number" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} className="text-sm" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Button as="button" type="button" onClick={handleAdd} disabled={busy} className="w-full py-3">
            {busy ? "Adding…" : "Add Item"}
          </Button>
        </div>
      </div>

      {macros.length > 0 && (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div className="min-w-[200px]">
            <Field label="Macros">
              <Select value={macroId} onChange={(e) => setMacroId(e.target.value)} className="text-sm" disabled={!room}>
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
            variant="secondary"
            onClick={handleApplyMacro}
            disabled={!macroId || !room || busy}
            className="px-4 py-3 text-sm"
          >
            Apply macro
          </Button>
        </div>
      )}

      {error && <p className="mt-2 text-xs font-semibold text-red-400">{error}</p>}
    </div>
  );
}
