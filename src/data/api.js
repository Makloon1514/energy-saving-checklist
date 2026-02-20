// ============================================================
// ⚠️ ใส่ URL ของ Google Apps Script Web App ที่นี่
// วิธีได้ URL: Deploy > New deployment > Web app > copy URL
// ============================================================
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwCBR4GAUHIiEMRR6OkEz2pSQGn25KYwHp7_EW2itQkpcwHW20k0_kMmDdOlPNY6sTV2A/exec';

// ===== SUBMIT CHECKLIST =====
export async function submitChecklist(data) {
  if (!SCRIPT_URL) {
    throw new Error('กรุณาตั้งค่า Google Apps Script URL ก่อนใช้งาน (ดูไฟล์ src/data/api.js)');
  }

  try {
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
