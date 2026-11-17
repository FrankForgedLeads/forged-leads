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

// Rooms + their line items in one round trip (nested select), since the
// estimate detail page always needs the full tree at once.
export async function fetchRemodelRooms(estimateId) {
  const { data, error } = await supabase
    .from("remodel_rooms")
    .select("*, remodel_room_items(*)")
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

export async function addRemodelRoom({ estimateId, name, sortOrder = 0 }) {
  const { data, error } = await supabase
    .from("remodel_rooms")
    .insert({ estimate_id: estimateId, name, sort_order: sortOrder })
    .select("*, remodel_room_items(*)")
    .single();

  if (error) throw error;
  return data;
}

export async function updateRemodelRoom(id, fields) {
  const { data, error } = await supabase
    .from("remodel_rooms")
    .update(fields)
    .eq("id", id)
    .select("*, remodel_room_items(*)")
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
