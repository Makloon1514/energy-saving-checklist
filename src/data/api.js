import { supabase } from '../lib/supabaseClient';

const CACHE_KEY = 'energy_checklist_cache';
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// ===== CACHE HELPERS =====
function getCachedData(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

function setCachedData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // ignore quota errors
  }
}

export function clearCache() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_KEY)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

// ===== GET ALL DATA (combined view) =====
export async function getAllData(date) {
  if (!isConfigured()) {
    return { success: true, status: {}, records: [], scores: [] };
  }

  const cacheKey = `${CACHE_KEY}_${date}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    // 1. Fetch all records from Supabase
    const { data: dbRecords, error } = await supabase
      .from('records')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    // 2. Process records
    const status = {};
    const records = [];
    const scoreMap = {}; // { "buildingName": { b, totalScore, totalChecks, totalPassed } }

    for (const row of dbRecords || []) {
      const rowDate = row.date;

      // Map Supabase column names to React UI expectation
      const mappedRecord = {
        date: row.date,
        day: row.day_name,
        inspector: row.inspector,
        buildingId: row.building_id,
        buildingName: row.building_name,
        building: row.building_name, 
        roomId: row.room_id,
        roomName: row.room_name,
        room: row.room_name,
        lights: row.lights,
        computer: row.computer,
        aircon: row.aircon,
        fan: row.fan,
        status: row.status,
        score: row.score,
        timestamp: row.created_at,
      };
      records.push(mappedRecord);

      // Status for today (must match requested 'date')
      if (rowDate === date) {
        // Dashboard.jsx expects the key to be buildingName|roomName
        const key = `${row.building_name}|${row.room_name}`;
        status[key] = {
          inspector: row.inspector,
          lights: row.lights,
          computer: row.computer,
          aircon: row.aircon,
          fan: row.fan,
          allPassed: row.status === 'ผ่านครบ',
          score: row.score,
        };
      }

      // Aggregate Scores by Building and Room
      const skey = `${row.building_name}|${row.room_name}`;
      if (!scoreMap[skey]) {
        scoreMap[skey] = {
          building: row.building_name,
          room: row.room_name,
          totalScore: 0,
          totalChecks: 0,
          totalPassed: 0,
        };
      }
      scoreMap[skey].totalScore += row.score;
      scoreMap[skey].totalChecks += 1;
      if (row.status === 'ผ่านครบ') scoreMap[skey].totalPassed += 1;
    }

    const scores = Object.values(scoreMap).sort((a, b) => b.totalScore - a.totalScore);

    const result = {
      success: true,
      status,
      records: records.reverse(), // latest first for table
      scores,
    };

    setCachedData(cacheKey, result);
    return result;
  } catch (error) {
    console.error('getAllData error:', error);
    return { success: true, status: {}, records: [], scores: [] };
  }
}

// ===== SUBMIT CHECKLIST =====
export async function submitChecklist(data) {
  if (!isConfigured()) {
    throw new Error('Supabase Configuration is missing in .env');
  }

  try {
    clearCache();

    const roomData = data.items[0];

    // Calculate score and status manually (formerly done by GAS backend)
    let score = 0;
    if (roomData.lights) score++;
    if (roomData.computer) score++;
    if (roomData.aircon) score++;
    if (roomData.fan) score++;
    const status = score === 4 ? 'ผ่านครบ' : 'เปิดทิ้งไว้';

    const newRecord = {
      date: data.date,
      day_name: data.dayName,
      inspector: data.inspector,
      building_id: data.buildingId,
      building_name: data.buildingName,
      room_id: roomData.roomId,
      room_name: roomData.roomName,
      lights: roomData.lights,
      computer: roomData.computer,
      aircon: roomData.aircon,
      fan: roomData.fan,
      score: score,
      status: status,
    };

    // Upsert or Insert. We use upsert on (date, building_id, room_id)
    const { data: resultData, error } = await supabase
      .from('records')
      .upsert(newRecord, {
        onConflict: 'date,building_id,room_id'
      })
      .select();

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error) {
    console.error('Submit error:', error);
    throw error;
  }
}

// ===== GET RECORDS =====
// Used by ChecklistForm to pre-fill buttons for already submitted rooms
export async function getRecords(date) {
  const allData = await getAllData(date);
  return {
    success: allData.success,
    records: allData.records || []
  };
}

// ===== CHECK IF CONFIGURED =====
export function isConfigured() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return url && url.length > 5 && key && key.length > 5;
}

