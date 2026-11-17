import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchRemodelRoom, updateRemodelRoom } from "../lib/api/remodelEstimates.js";
import {
  parseFeetInches,
  formatFeetInches,
  computeSketchMeasurements,
} from "../lib/remodel/sketch.js";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import { Field, Input } from "../components/ui/Field.jsx";

const VIEW_W = 600;
const VIEW_H = 420;
const CLOSE_THRESHOLD = 22;
const SNAP_DEGREES = 15;

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

export default function RemodelRoomSketch() {
  const { estimateId, roomId } = useParams();
  const navigate = useNavigate();
  const svgRef = useRef(null);

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [roomName, setRoomName] = useState("");
  const [points, setPoints] = useState([]);
  const [closed, setClosed] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [wallLengths, setWallLengths] = useState([]); // raw typed strings, one per wall
  const [doorWalls, setDoorWalls] = useState(new Set());
  const [windowWalls, setWindowWalls] = useState(new Set());
  const [ceilingHeight, setCeilingHeight] = useState("8");

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
        const sd = r.sketch_data;
        if (sd && Array.isArray(sd.points) && sd.points.length >= 3) {
          setPoints(sd.points);
          setClosed(true);
          setWallLengths(sd.wallLengths || sd.points.map(() => ""));
          setDoorWalls(new Set(sd.doorWalls || []));
          setWindowWalls(new Set(sd.windowWalls || []));
        }
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  const wallSegments = useMemo(() => {
    if (points.length < 2) return [];
    return wallLengths
      .map((_, i) => {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        if (!a || !b) return null;
        return { index: i, mid: midpoint(a, b) };
      })
      .filter(Boolean);
  }, [points, wallLengths]);

  const measurements = useMemo(() => {
    if (!closed || points.length < 3) return null;
    return computeSketchMeasurements({
      points,
      wallLengths: wallLengths.map((s) => parseFeetInches(s) || 0),
      doorWalls: [...doorWalls],
      windowWalls: [...windowWalls],
      ceilingHeightFt: parseFeetInches(ceilingHeight) || 8,
    });
  }, [closed, points, wallLengths, doorWalls, windowWalls, ceilingHeight]);

  function handleSvgClick(e) {
    if (closed) return;
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const raw = clientToSvgPoint(svgEl, e.clientX, e.clientY);

    if (points.length >= 3) {
      const distToStart = Math.hypot(raw.x - points[0].x, raw.y - points[0].y);
      if (distToStart < CLOSE_THRESHOLD) {
        // Closing the shape adds the final wall (last point back to the first).
        setWallLengths((wl) => [...wl, ""]);
        setClosed(true);
        setCursor(null);
        return;
      }
    }

    const last = points[points.length - 1];
    const next = last ? snapPoint(last, raw) : raw;
    setPoints((p) => [...p, next]);
    // Every point after the first completes a new wall segment — add its
    // length slot right away so it can be typed in live, on the canvas.
    if (points.length > 0) {
      setWallLengths((wl) => [...wl, ""]);
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

  function handleUndo() {
    if (closed) return;
    setPoints((p) => p.slice(0, -1));
    setWallLengths((wl) => wl.slice(0, -1));
  }

  function handleStartOver() {
    setPoints([]);
    setClosed(false);
    setCursor(null);
    setWallLengths([]);
    setDoorWalls(new Set());
    setWindowWalls(new Set());
  }

  function toggleWallFlag(setFn, index) {
    setFn((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function setWallLength(index, value) {
    setWallLengths((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  async function handleSave() {
    if (!measurements) return;
    setSaving(true);
    setError("");
    try {
      const heightFt = parseFeetInches(ceilingHeight) || 8;
      const updated = await updateRemodelRoom(roomId, {
        name: roomName.trim() || room?.name || "Untitled room",
        ceiling_height_ft: heightFt,
        sketch_data: {
          points,
          wallLengths,
          doorWalls: [...doorWalls],
          windowWalls: [...windowWalls],
        },
        sketch_floor_area_sf: measurements.floorAreaSF,
        sketch_ceiling_area_sf: measurements.ceilingAreaSF,
        sketch_wall_area_sf: measurements.wallAreaSF,
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
    closed && wallLengths.length > 0 && wallLengths.every((s) => parseFeetInches(s) !== null && parseFeetInches(s) > 0);

  return (
    <div className="container-vault max-w-3xl py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">
            Sketch — {roomName || "Untitled room"}
          </h1>
          <p className="text-sm text-white/50">
            {!closed
              ? "Click to place each corner — type each wall's real length right on the drawing as you go. Click back near the first point to close the shape."
              : "Tag which walls have a door or window, double-check the lengths, then save."}
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
          <Field label="Ceiling height (ft)">
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
                r={i === 0 && !closed && points.length >= 3 ? 9 : 5}
                fill={i === 0 && !closed && points.length >= 3 ? "#eab30855" : "#eab308"}
                stroke="#0a1225"
                strokeWidth="1.5"
              />
            ))}
          </svg>

          {wallSegments.map(({ index, mid }) => {
            const hasLen = parseFeetInches(wallLengths[index]) > 0;
            return (
              <input
                key={index}
                value={wallLengths[index] ?? ""}
                onChange={(e) => setWallLength(index, e.target.value)}
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
          <h2 className="text-sm font-bold uppercase tracking-wide text-white/60">
            Wall lengths
          </h2>
          <div className="mt-3 space-y-2">
            {points.map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-12 items-center gap-2 rounded-lg bg-navy-900/60 p-2"
              >
                <span className="col-span-2 text-sm font-semibold text-white/70">Wall {i + 1}</span>
                <div className="col-span-5">
                  <Input
                    value={wallLengths[i] ?? ""}
                    onChange={(e) => setWallLength(i, e.target.value)}
                    placeholder={`e.g. 7'9" or 7.75`}
                    className="!py-2 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => toggleWallFlag(setDoorWalls, i)}
                  className={`col-span-2 rounded px-2 py-1.5 text-xs font-semibold ${
                    doorWalls.has(i) ? "bg-gold-500 text-navy-950" : "bg-navy-700 text-white/60"
                  }`}
                >
                  🚪 Door
                </button>
                <button
                  type="button"
                  onClick={() => toggleWallFlag(setWindowWalls, i)}
                  className={`col-span-2 rounded px-2 py-1.5 text-xs font-semibold ${
                    windowWalls.has(i) ? "bg-gold-500 text-navy-950" : "bg-navy-700 text-white/60"
                  }`}
                >
                  🪟 Window
                </button>
                <span className="col-span-1 text-right text-xs text-white/40">
                  {parseFeetInches(wallLengths[i]) > 0
                    ? formatFeetInches(parseFeetInches(wallLengths[i]))
                    : ""}
                </span>
              </div>
            ))}
          </div>

          {measurements && (
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 rounded-lg border border-navy-500 bg-navy-900/60 p-3 text-sm text-white/80">
              <span>
                Floor: <strong>{measurements.floorAreaSF.toFixed(1)} SF</strong>{" "}
                <span className="text-white/40">(approx)</span>
              </span>
              <span>
                Walls: <strong>{measurements.wallAreaSF.toFixed(1)} SF</strong>
              </span>
              <span>
                Ceiling: <strong>{measurements.ceilingAreaSF.toFixed(1)} SF</strong>{" "}
                <span className="text-white/40">(approx)</span>
              </span>
              <span>
                Perimeter: <strong>{measurements.perimeterLF.toFixed(1)} LF</strong>
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
