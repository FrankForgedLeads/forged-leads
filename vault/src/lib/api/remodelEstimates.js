import { supabase } from "../supabaseClient.js";

// Browse-only catalog, same pattern as fetchPriceReferences().
export async function fetchRemodelItems() {
  const { data, error } = await supabase
    .from("remodel_items")
    .select("*")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("description", { ascending: true });

  if (error) throw error;
  return data;
}

export async function fetchRemodelEstimates() {
  const { data, error } = await supabase
    .from("remodel_estimates")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchRemodelEstimate(id) {
  const { data, error } = await supabase
    .from("remodel_estimates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createRemodelEstimate(fields, userId) {
  const { data, error } = await supabase
    .from("remodel_estimates")
    .insert({ ...fields, user_id: userId })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateRemodelEstimate(id, fields) {
  const { data, error } = await supabase
    .from("remodel_estimates")
    .update(fields)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRemodelEstimate(id) {
  const { error } = await supabase.from("remodel_estimates").delete().eq("id", id);
  if (error) throw error;
}

// Macros + their line items, each joined to its full catalog row (so the
// macro picker has code/description/unit/price without a second round trip).
export async function fetchRemodelMacros() {
  const { data, error } = await supabase
    .from("remodel_macros")
    .select("*, remodel_macro_items(*, remodel_items(*))")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data;
}

// Rooms + their line items + their floor-plan openings in one round trip
// (nested select), since the estimate detail and floor plan pages always
// need the full tree at once.
export async function fetchRemodelRooms(estimateId) {
  const { data, error } = await supabase
    .from("remodel_rooms")
    .select("*, remodel_room_items(*), remodel_room_openings(*)")
    .eq("estimate_id", estimateId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data;
}

export async function fetchRemodelRoom(id) {
  const { data, error } = await supabase
    .from("remodel_rooms")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function addRemodelRoom({
  estimateId,
  name,
  sortOrder = 0,
  widthFt = null,
  lengthFt = null,
  ceilingHeightFt = null,
  floorplanX = null,
  floorplanY = null,
}) {
  const { data, error } = await supabase
    .from("remodel_rooms")
    .insert({
      estimate_id: estimateId,
      name,
      sort_order: sortOrder,
      width_ft: widthFt,
      length_ft: lengthFt,
      ceiling_height_ft: ceilingHeightFt,
      floorplan_x: floorplanX,
      floorplan_y: floorplanY,
    })
    .select("*, remodel_room_items(*), remodel_room_openings(*)")
    .single();

  if (error) throw error;
  return data;
}

export async function updateRemodelRoom(id, fields) {
  const { data, error } = await supabase
    .from("remodel_rooms")
    .update(fields)
    .eq("id", id)
    .select("*, remodel_room_items(*), remodel_room_openings(*)")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRemodelRoom(id) {
  const { error } = await supabase.from("remodel_rooms").delete().eq("id", id);
  if (error) throw error;
}

// remodelItemId stays null for a fully custom line (typed in by hand, not
// picked from the catalog) — description/unit/unitPrice are always required
// here either way since a room item snapshots its own price regardless of
// where it came from.
export async function addRemodelRoomItem({
  roomId,
  remodelItemId = null,
  description,
  unit,
  quantity = 1,
  unitPrice,
  note = "",
  measurementSource = null,
  quantityOverridden = false,
}) {
  const { data, error } = await supabase
    .from("remodel_room_items")
    .insert({
      room_id: roomId,
      remodel_item_id: remodelItemId,
      description,
      unit,
      quantity,
      unit_price: unitPrice,
      note: note || null,
      measurement_source: measurementSource,
      quantity_overridden: quantityOverridden,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateRemodelRoomItem(id, fields) {
  const { data, error } = await supabase
    .from("remodel_room_items")
    .update(fields)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRemodelRoomItem(id) {
  const { error } = await supabase.from("remodel_room_items").delete().eq("id", id);
  if (error) throw error;
}

// A door/window on the floor plan — attached to one wall side of one room
// (not raw canvas coordinates), per lib/remodel/floorplanGeometry.js.
export async function addRoomOpening({
  roomId,
  wallSide,
  offsetFt = 0,
  widthFt,
  heightFt,
  qty = 1,
  type = "door",
  description = "",
  startsAtFloor = true,
}) {
  const { data, error } = await supabase
    .from("remodel_room_openings")
    .insert({
      room_id: roomId,
      wall_side: wallSide,
      offset_ft: offsetFt,
      width_ft: widthFt,
      height_ft: heightFt,
      qty,
      type,
      description: description || null,
      starts_at_floor: startsAtFloor,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateRoomOpening(id, fields) {
  const { data, error } = await supabase
    .from("remodel_room_openings")
    .update(fields)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRoomOpening(id) {
  const { error } = await supabase.from("remodel_room_openings").delete().eq("id", id);
  if (error) throw error;
}
