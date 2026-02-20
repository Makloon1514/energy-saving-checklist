// ============================================================
// ⚠️ ใส่ URL ของ Google Apps Script Web App ที่นี่
// วิธีได้ URL: Deploy > New deployment > Web app > copy URL
// ============================================================
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwCBR4GAUHIiEMRR6OkEz2pSQGn25KYwHp7_EW2itQkpcwHW20k0_kMmDdOlPNY6sTV2A/exec';

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
  localStorage.removeItem(CACHE_KEY);
}

// ===== GET ALL DATA (combined, single API call) =====
export async function getAllData(date) {
  if (!SCRIPT_URL) {
    return { success: true, status: {}, records: [], scores: [] };
  }

  // Check cache first
  const cacheKey = `${CACHE_KEY}_${date}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const url = `${SCRIPT_URL}?action=getAllData&date=${encodeURIComponent(date)}`;
    const response = await fetch(url);
    const result = await response.json();
    if (result.success) {
      setCachedData(cacheKey, result);
    }
    return result;
  } catch (error) {
    console.error('getAllData error:', error);
    return { success: true, status: {}, records: [], scores: [] };
  }
}

// ===== SUBMIT CHECKLIST =====
export async function submitChecklist(data) {
  if (!SCRIPT_URL) {
    throw new Error('กรุณาตั้งค่า Google Apps Script URL ก่อนใช้งาน (ดูไฟล์ src/data/api.js)');
  }

  try {
    // Clear cache so Dashboard refreshes after submit
    clearCache();

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'submit',
        ...data,
      }),
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'เกิดข้อผิดพลาดในการบันทึก');
    }
    return result;
  } catch (error) {
    console.error('Submit error:', error);
    throw error;
  }
}

// ===== GET RECORDS =====
export async function getRecords(date = '') {
  if (!SCRIPT_URL) {
    return { success: true, records: [] };
  }

  try {
    const url = `${SCRIPT_URL}?action=getRecords&date=${encodeURIComponent(date)}`;
    const response = await fetch(url);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Get records error:', error);
    return { success: true, records: [] };
  }
}

// ===== GET SCORES =====
export async function getScores() {
  if (!SCRIPT_URL) {
    return { success: true, scores: [] };
  }

  try {
    const url = `${SCRIPT_URL}?action=getScores`;
    const response = await fetch(url);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Get scores error:', error);
    return { success: true, scores: [] };
  }
}

// ===== GET TODAY STATUS =====
export async function getTodayStatus(date) {
  if (!SCRIPT_URL) {
    return { success: true, status: {} };
  }

  try {
    const url = `${SCRIPT_URL}?action=getTodayStatus&date=${encodeURIComponent(date)}`;
    const response = await fetch(url);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Get today status error:', error);
    return { success: true, status: {} };
  }
}

// ===== CHECK IF CONFIGURED =====
export function isConfigured() {
  return SCRIPT_URL !== '';
}

