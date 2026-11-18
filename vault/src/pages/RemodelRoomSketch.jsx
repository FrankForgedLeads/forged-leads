import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchRemodelRoom, updateRemodelRoom } from "../lib/api/remodelEstimates.js";
import {
  parseFeetInches,
  computeSketchMeasurements,
  upgradeLegacySketchData,
  newOpening,
  openingAreaSF,
  wallMeasurements,
  OPENING_TYPES,
} from "../lib/remodel/sketch.js";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { Field, Input, Select } from "../components/ui/Field.jsx";

const VIEW_W = 600;
const VIEW_H = 420;
const CLOSE_THRESHOLD = 22;
const SNAP_DEGREES = 15;
const FLOOD_CUT_PRESETS = [2, 12, 24, 48]; // inches

function clientToSvgPoint(svgEl, clientX, clientY) {
  const rect = svgEl.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * VIEW_W;
  const y = ((clientY - rect.top) / rect.height) * VIEW_H;
  return { x, y };
}

function snapPoint(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return to;
  const angle = Math.atan2(dy, dx);
  const snapRad = (SNAP_DEGREES * Math.PI) / 180;
  const snapped = Math.round(angle / snapRad) * snapRad;
  return { x: from.x + dist * Math.cos(snapped), y: from.y + dist * Math.sin(snapped) };
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function blankWall() {
  return {
    lengthInput: "",
    heightInput: "",
    openings: [],
    demo: false,
    replace: false,
    floodCut: null,
    notes: "",
  };
}

// Bridges a wall's typed strings to the plain-number shape sketch.js expects.
function wallForCalc(w) {
  return {
    lengthFt: parseFeetInches(w.lengthInput) || 0,
    heightFt: w.heightInput ? parseFeetInches(w.heightInput) : null,
    openings: w.openings || [],
    floodCut: w.floodCut?.enabled
      ? { enabled: true, heightFt: parseFeetInches(w.floodCut.heightInput) || 0 }
      : null,
  };
}

export default function RemodelRoomSketch() {
  const { estimateId, roomId } = useParams();
  const navigate = useNavigate();
  const svgRef = useRef(null);
  // A corner drag ends with a pointerup wherever the cursor happens to be —
  // almost never still over that corner — so the SVG's own onClick (whose
  // job is "place the next point") fires right after and plants a stray
  // extra point at the release spot. Ignoring any click in the brief window
  // right after a drag ends swallows that one spurious click without
  // needing to know whether it actually reached this handler or was
  // stopped earlier (e.g. by landing back on the corner itself).
  const lastDragEndAtRef = useRef(0);

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [roomName, setRoomName] = useState("");
  const [points, setPoints] = useState([]);
  const [closed, setClosed] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [walls, setWalls] = useState([]);
  const [ceilingHeight, setCeilingHeight] = useState("8");
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [expandedWalls, setExpandedWalls] = useState(new Set());

  useEffect(() => {
    let cancelled = false;
    fetchRemodelRoom(roomId)
      .then((r) => {
        if (cancelled) return;
        if (!r) {
          setError("Room not found.");
          return;
        }
        setRoom(r);
        setRoomName(r.name || "");
        setCeilingHeight(r.ceiling_height_ft ? String(r.ceiling_height_ft) : "8");
        const sd = upgradeLegacySketchData(r.sketch_data);
        if (sd && Array.isArray(sd.points) && sd.points.length >= 3) {
          setPoints(sd.points);
          setClosed(true);
          setWalls(
            (sd.walls || []).map((w) => ({
              lengthInput: w.lengthInput ?? (w.lengthFt ? String(w.lengthFt) : ""),
              heightInput: w.heightInput ?? (w.heightFt ? String(w.heightFt) : ""),
              openings: w.openings || [],
              demo: !!w.demo,
              replace: !!w.replace,
              floodCut: w.floodCut
                ? {
                    enabled: true,
                    heightInput: w.floodCut.heightInput ?? (w.floodCut.heightFt ? String(w.floodCut.heightFt) : ""),
                  }
                : null,
              notes: w.notes || "",
            })),
          );
        }
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  const wallSegmentMidpoints = useMemo(() => {
    if (points.length < 2) return [];
    return walls
      .map((_, i) => {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        if (!a || !b) return null;
        return { index: i, mid: midpoint(a, b) };
      })
      .filter(Boolean);
  }, [points, walls]);

  const measurements = useMemo(() => {
    if (!closed || points.length < 3) return null;
    return computeSketchMeasurements({
      points,
      walls: walls.map(wallForCalc),
      ceilingHeightFt: parseFeetInches(ceilingHeight) || 8,
    });
  }, [closed, points, walls, ceilingHeight]);

  function handleSvgClick(e) {
    if (Date.now() - lastDragEndAtRef.current < 300) return;
    if (closed) return;
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const raw = clientToSvgPoint(svgEl, e.clientX, e.clientY);

    if (points.length >= 3) {
      const distToStart = Math.hypot(raw.x - points[0].x, raw.y - points[0].y);
      if (distToStart < CLOSE_THRESHOLD) {
        // Closing the shape adds the final wall (last point back to the first).
        setWalls((w) => [...w, blankWall()]);
        setClosed(true);
        setCursor(null);
        return;
      }
    }

    const last = points[points.length - 1];
    const next = last ? snapPoint(last, raw) : raw;
    setPoints((p) => [...p, next]);
    // Every point after the first completes a new wall segment — add its
    // editor slot right away so it can be typed in live, on the canvas.
    if (points.length > 0) {
      setWalls((w) => [...w, blankWall()]);
    }
  }

  function handleSvgMove(e) {
    if (closed || points.length === 0) return;
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const raw = clientToSvgPoint(svgEl, e.clientX, e.clientY);
    const last = points[points.length - 1];
    setCursor(snapPoint(last, raw));
  }

  // Lets a corner be dragged to fix an imprecise shape, before or after
  // closing it — no snapping here, since the whole point is a free nudge.
  function handleCornerPointerDown(index, e) {
    e.stopPropagation();
    e.preventDefault();
    setDraggingIndex(index);
  }

  useEffect(() => {
    if (draggingIndex === null) return;
    function handleMove(e) {
      const svgEl = svgRef.current;
      if (!svgEl) return;
      const raw = clientToSvgPoint(svgEl, e.clientX, e.clientY);
      setPoints((p) => {
        const next = [...p];
        next[draggingIndex] = raw;
        return next;
      });
    }
    function handleUp() {
      lastDragEndAtRef.current = Date.now();
      setDraggingIndex(null);
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [draggingIndex]);

  function handleUndo() {
    if (closed) return;
    setPoints((p) => p.slice(0, -1));
    setWalls((w) => w.slice(0, -1));
  }

  function handleStartOver() {
    setPoints([]);
    setClosed(false);
    setCursor(null);
    setWalls([]);
    setExpandedWalls(new Set());
  }

  function setWallField(index, field, value) {
    setWalls((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function toggleExpanded(index) {
    setExpandedWalls((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function addOpening(wallIndex, type) {
    setWalls((prev) => {
      const next = [...prev];
      const wall = next[wallIndex];
      next[wallIndex] = { ...wall, openings: [...wall.openings, newOpening(type)] };
      return next;
    });
    setExpandedWalls((prev) => new Set(prev).add(wallIndex));
  }

  function updateOpening(wallIndex, openingIndex, field, value) {
    setWalls((prev) => {
      const next = [...prev];
      const openings = [...next[wallIndex].openings];
      openings[openingIndex] = { ...openings[openingIndex], [field]: value };
      next[wallIndex] = { ...next[wallIndex], openings };
      return next;
    });
  }

  function removeOpening(wallIndex, openingIndex) {
    setWalls((prev) => {
      const next = [...prev];
      next[wallIndex] = {
        ...next[wallIndex],
        openings: next[wallIndex].openings.filter((_, i) => i !== openingIndex),
      };
      return next;
    });
  }

  function setFloodCutEnabled(wallIndex, enabled) {
    setWallField(wallIndex, "floodCut", enabled ? { enabled: true, heightInput: "24\"" } : null);
  }

  async function handleSave() {
    if (!measurements) return;
    setSaving(true);
    setError("");
    try {
      const heightFt = parseFeetInches(ceilingHeight) || 8;
      const wallsForSave = walls.map((w) => ({
        lengthFt: parseFeetInches(w.lengthInput) || 0,
        lengthInput: w.lengthInput,
        heightFt: w.heightInput ? parseFeetInches(w.heightInput) : null,
        heightInput: w.heightInput,
        openings: w.openings,
        demo: w.demo,
        replace: w.replace,
        floodCut: w.floodCut?.enabled
          ? {
              enabled: true,
              heightFt: parseFeetInches(w.floodCut.heightInput) || 0,
              heightInput: w.floodCut.heightInput,
            }
          : null,
        notes: w.notes,
      }));
      const updated = await updateRemodelRoom(roomId, {
        name: roomName.trim() || room?.name || "Untitled room",
        ceiling_height_ft: heightFt,
        sketch_data: { points, walls: wallsForSave },
        sketch_floor_area_sf: measurements.floorAreaSF,
        sketch_ceiling_area_sf: measurements.ceilingAreaSF,
        sketch_wall_area_sf: measurements.wallAreaSF,
        sketch_wall_gross_area_sf: measurements.wallGrossAreaSF,
        sketch_baseboard_lf: measurements.baseboardLF,
        sketch_room_volume_cf: measurements.roomVolumeCF,
        sketch_perimeter_lf: measurements.perimeterLF,
      });
      setRoom(updated);
      navigate(`/remodel/${estimateId}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleClearSketch() {
    if (!window.confirm("Clear this sketch and go back to simple length/width entry?")) return;
    setSaving(true);
    try {
      await updateRemodelRoom(roomId, {
        sketch_data: null,
        sketch_floor_area_sf: null,
        sketch_ceiling_area_sf: null,
        sketch_wall_area_sf: null,
        sketch_wall_gross_area_sf: null,
        sketch_baseboard_lf: null,
        sketch_room_volume_cf: null,
        sketch_perimeter_lf: null,
      });
      navigate(`/remodel/${estimateId}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="container-vault py-10 text-white/60">Loading…</div>;
  if (error && !room)
    return <div className="container-vault py-10 font-semibold text-red-400">{error}</div>;

  const previewLine = !closed && points.length > 0 && cursor;
  const allWallsHaveLengths =
    closed && walls.length > 0 && walls.every((w) => (parseFeetInches(w.lengthInput) || 0) > 0);

  return (
    <div className="container-vault max-w-3xl py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">
            Sketch — {roomName || "Untitled room"}
          </h1>
          <p className="text-sm text-white/50">
            {!closed
              ? "Click to place each corner — type each wall's real length right on the drawing as you go. Click back near the first point to close the shape. Drag any corner any time to fix it."
              : "Drag any corner to fix the shape. Open a wall's details to add real doors/windows, a flood cut, or mark it for demo."}
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate(`/remodel/${estimateId}`)}>
          ← Back to estimate
        </Button>
      </div>

      {error && <p className="mt-3 text-sm font-semibold text-red-400">{error}</p>}

      <Card className="mt-6">
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <Field label="Room name (saves to this room everywhere — the estimate, the macro picker, the PDF)">
            <Input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g. Kitchen, Master Bathroom…"
            />
          </Field>
          <Field label="Ceiling height (ft) — default for walls with no override">
            <Input
              value={ceilingHeight}
              onChange={(e) => setCeilingHeight(e.target.value)}
              placeholder="default 8"
            />
          </Field>
        </div>
      </Card>

      <Card className="mt-4">
        <div className="relative">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            onClick={handleSvgClick}
            onMouseMove={handleSvgMove}
            className="w-full cursor-crosshair rounded-xl border border-navy-500 bg-navy-950"
            style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
          >
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e2a44" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width={VIEW_W} height={VIEW_H} fill="url(#grid)" />

            {points.length >= 2 && (
              <polyline
                points={points.map((p) => `${p.x},${p.y}`).join(" ") + (closed ? ` ${points[0].x},${points[0].y}` : "")}
                fill={closed ? "rgba(234,179,8,0.08)" : "none"}
                stroke="#eab308"
                strokeWidth="3"
                strokeLinejoin="round"
              />
            )}

            {previewLine && (
              <line
                x1={points[points.length - 1].x}
                y1={points[points.length - 1].y}
                x2={cursor.x}
                y2={cursor.y}
                stroke="#eab308"
                strokeOpacity="0.4"
                strokeWidth="2"
                strokeDasharray="6 4"
              />
            )}

            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={draggingIndex === i ? 10 : i === 0 && !closed && points.length >= 3 ? 9 : 7}
                fill={i === 0 && !closed && points.length >= 3 ? "#eab30855" : "#eab308"}
                stroke={draggingIndex === i ? "#fff" : "#0a1225"}
                strokeWidth={draggingIndex === i ? 2.5 : 1.5}
                className="cursor-grab active:cursor-grabbing"
                style={{ touchAction: "none" }}
                onPointerDown={(e) => handleCornerPointerDown(i, e)}
                onClick={(e) => e.stopPropagation()}
              />
            ))}
          </svg>

          {wallSegmentMidpoints.map(({ index, mid }) => {
            const hasLen = (parseFeetInches(walls[index]?.lengthInput) || 0) > 0;
            return (
              <input
                key={index}
                value={walls[index]?.lengthInput ?? ""}
                onChange={(e) => setWallField(index, "lengthInput", e.target.value)}
                onFocus={() => setExpandedWalls((prev) => new Set(prev).add(index))}
                placeholder="ft"
                title={`Wall ${index + 1} length`}
                className={`absolute w-14 -translate-x-1/2 -translate-y-1/2 rounded border bg-navy-950/95 px-1 py-0.5 text-center text-xs font-bold focus:outline-none ${
                  hasLen ? "border-green-500 text-green-300" : "border-red-400 text-red-300"
                }`}
                style={{ left: `${(mid.x / VIEW_W) * 100}%`, top: `${(mid.y / VIEW_H) * 100}%` }}
              />
            );
          })}
        </div>

        {!closed && (
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" onClick={handleUndo} disabled={points.length === 0}>
              Undo last point
            </Button>
            <Button variant="ghost" onClick={handleStartOver} disabled={points.length === 0}>
              Start over
            </Button>
          </div>
        )}
      </Card>

      {closed && (
        <Card className="mt-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white/60">Walls</h2>
          <div className="mt-3 space-y-2">
            {walls.map((wall, i) => {
              const calc = wallMeasurements(wallForCalc(wall), parseFeetInches(ceilingHeight) || 8);
              const expanded = expandedWalls.has(i);
              return (
                <div key={i} className="rounded-lg bg-navy-900/60 p-2">
                  <div className="grid grid-cols-12 items-center gap-2">
                    <span className="col-span-2 text-sm font-semibold text-white/70">Wall {i + 1}</span>
                    <div className="col-span-3">
                      <Input
                        value={wall.lengthInput ?? ""}
                        onChange={(e) => setWallField(i, "lengthInput", e.target.value)}
                        placeholder={`e.g. 7'9" or 7.75`}
                        className="!py-2 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => addOpening(i, "door")}
                      className="col-span-2 rounded bg-navy-700 px-2 py-1.5 text-xs font-semibold text-white/70 hover:bg-navy-600"
                    >
                      🚪 + Door
                    </button>
                    <button
                      type="button"
                      onClick={() => addOpening(i, "window")}
                      className="col-span-2 rounded bg-navy-700 px-2 py-1.5 text-xs font-semibold text-white/70 hover:bg-navy-600"
                    >
                      🪟 + Window
                    </button>
                    <span className="col-span-2 text-right text-xs text-white/50">
                      {wall.openings.length > 0
                        ? `${wall.openings.length} opening${wall.openings.length > 1 ? "s" : ""}`
                        : ""}
                      {wall.demo ? " · demo" : ""}
                      {wall.replace ? " · replace" : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleExpanded(i)}
                      className="col-span-1 text-right text-xs font-semibold text-gold-400 hover:underline"
                    >
                      {expanded ? "Hide ▴" : "Details ▾"}
                    </button>
                  </div>

                  {expanded && (
                    <div className="mt-3 space-y-3 border-t border-navy-700 pt-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Height override (blank = room default)">
                          <Input
                            value={wall.heightInput ?? ""}
                            onChange={(e) => setWallField(i, "heightInput", e.target.value)}
                            placeholder={`default ${ceilingHeight || 8}'`}
                          />
                        </Field>
                        <Field label="Notes">
                          <Input
                            value={wall.notes ?? ""}
                            onChange={(e) => setWallField(i, "notes", e.target.value)}
                            placeholder="e.g. water line 18in up"
                          />
                        </Field>
                      </div>

                      {wall.openings.length > 0 && (
                        <div className="space-y-2">
                          {wall.openings.map((opening, oi) => (
                            <div
                              key={oi}
                              className="grid grid-cols-12 items-end gap-2 rounded bg-navy-950/60 p-2"
                            >
                              <div className="col-span-3">
                                <Field label="Type">
                                  <Select
                                    value={opening.type}
                                    onChange={(e) => {
                                      const next = newOpening(e.target.value);
                                      updateOpening(i, oi, "type", next.type);
                                      updateOpening(i, oi, "widthFt", next.widthFt);
                                      updateOpening(i, oi, "heightFt", next.heightFt);
                                      updateOpening(i, oi, "startsAtFloor", next.startsAtFloor);
                                    }}
                                    className="!py-1.5 text-xs"
                                  >
                                    {Object.entries(OPENING_TYPES).map(([value, def]) => (
                                      <option key={value} value={value}>
                                        {def.label}
                                      </option>
                                    ))}
                                  </Select>
                                </Field>
                              </div>
                              <div className="col-span-2">
                                <Field label="Width (ft)">
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={opening.widthFt}
                                    onChange={(e) => updateOpening(i, oi, "widthFt", Number(e.target.value))}
                                    className="!py-1.5 text-xs"
                                  />
                                </Field>
                              </div>
                              <div className="col-span-2">
                                <Field label="Height (ft)">
                                  <Input
                                    type="number"
                                    step="0.1"
                                    value={opening.heightFt}
                                    onChange={(e) => updateOpening(i, oi, "heightFt", Number(e.target.value))}
                                    className="!py-1.5 text-xs"
                                  />
                                </Field>
                              </div>
                              <div className="col-span-1">
                                <Field label="Qty">
                                  <Input
                                    type="number"
                                    step="1"
                                    value={opening.qty}
                                    onChange={(e) => updateOpening(i, oi, "qty", Number(e.target.value))}
                                    className="!py-1.5 text-xs"
                                  />
                                </Field>
                              </div>
                              <div className="col-span-3">
                                <Field label="Description (optional)">
                                  <Input
                                    value={opening.description || ""}
                                    onChange={(e) => updateOpening(i, oi, "description", e.target.value)}
                                    className="!py-1.5 text-xs"
                                  />
                                </Field>
                              </div>
                              <div className="col-span-1 flex justify-end pb-1">
                                <button
                                  type="button"
                                  onClick={() => removeOpening(i, oi)}
                                  className="text-xs text-red-400 hover:underline"
                                >
                                  Remove
                                </button>
                              </div>
                              <span className="col-span-12 text-right text-xs text-white/40">
                                {openingAreaSF(opening).toFixed(1)} SF
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-xs">
                        <label className="flex items-center gap-1.5 text-white/70">
                          <input
                            type="checkbox"
                            checked={wall.demo}
                            onChange={(e) => setWallField(i, "demo", e.target.checked)}
                          />
                          Mark for demo
                        </label>
                        <label className="flex items-center gap-1.5 text-white/70">
                          <input
                            type="checkbox"
                            checked={wall.replace}
                            onChange={(e) => setWallField(i, "replace", e.target.checked)}
                          />
                          Mark for replacement
                        </label>
                        <label className="flex items-center gap-1.5 text-white/70">
                          <input
                            type="checkbox"
                            checked={!!wall.floodCut?.enabled}
                            onChange={(e) => setFloodCutEnabled(i, e.target.checked)}
                          />
                          Flood cut
                        </label>
                        {wall.floodCut?.enabled && (
                          <>
                            <div className="flex items-center gap-1">
                              {FLOOD_CUT_PRESETS.map((inches) => (
                                <button
                                  key={inches}
                                  type="button"
                                  onClick={() => setWallField(i, "floodCut", { enabled: true, heightInput: `${inches}"` })}
                                  className={`rounded px-2 py-1 font-semibold ${
                                    wall.floodCut.heightInput === `${inches}"`
                                      ? "bg-gold-500 text-navy-950"
                                      : "bg-navy-700 text-white/60"
                                  }`}
                                >
                                  {inches}"
                                </button>
                              ))}
                            </div>
                            <Input
                              value={wall.floodCut.heightInput ?? ""}
                              onChange={(e) => setWallField(i, "floodCut", { enabled: true, heightInput: e.target.value })}
                              placeholder={`custom, e.g. 24"`}
                              className="!w-28 !py-1.5"
                            />
                          </>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 rounded border border-navy-700 bg-navy-950/40 p-2 text-xs text-white/70">
                        <span>Gross: <strong>{calc.grossSF.toFixed(1)} SF</strong></span>
                        <span>Openings: <strong>{calc.openingsSF.toFixed(1)} SF</strong></span>
                        <span>Net: <strong>{calc.netSF.toFixed(1)} SF</strong></span>
                        <span>Baseboard: <strong>{calc.baseboardLF.toFixed(1)} LF</strong></span>
                        {wall.floodCut?.enabled && (
                          <span>Flood cut: <strong>{calc.floodCutSF.toFixed(1)} SF</strong></span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {measurements && (
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 rounded-lg border border-navy-500 bg-navy-900/60 p-3 text-sm text-white/80">
              <span>
                Floor: <strong>{measurements.floorAreaSF.toFixed(1)} SF</strong>
              </span>
              <span>
                Ceiling: <strong>{measurements.ceilingAreaSF.toFixed(1)} SF</strong>
              </span>
              <span>
                Wall (gross): <strong>{measurements.wallGrossAreaSF.toFixed(1)} SF</strong>
              </span>
              <span>
                Wall (net): <strong>{measurements.wallNetAreaSF.toFixed(1)} SF</strong>
              </span>
              <span>
                Perimeter: <strong>{measurements.perimeterLF.toFixed(1)} LF</strong>
              </span>
              <span>
                Baseboard: <strong>{measurements.baseboardLF.toFixed(1)} LF</strong>
              </span>
              <span>
                Volume: <strong>{measurements.roomVolumeCF.toFixed(0)} CF</strong>
              </span>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={handleSave} disabled={!allWallsHaveLengths || saving}>
              {saving ? "Saving…" : "Save measurements"}
            </Button>
            <Button variant="ghost" onClick={handleStartOver} disabled={saving}>
              Redraw shape
            </Button>
            {room?.sketch_data && (
              <Button variant="danger" onClick={handleClearSketch} disabled={saving}>
                Clear sketch
              </Button>
            )}
          </div>
          {!allWallsHaveLengths && (
            <p className="mt-2 text-xs text-white/40">
              Type a length for every wall — on the drawing above or in the list here (the
              red-bordered boxes on the drawing mark the ones still missing) — before saving.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
