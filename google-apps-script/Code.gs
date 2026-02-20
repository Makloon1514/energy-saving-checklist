/**
 * Google Apps Script — Energy Saving Checklist API
 * 
 * วิธีติดตั้ง:
 * 1. สร้าง Google Sheet ใหม่
 * 2. ตั้งชื่อ Sheet แรกว่า "Records" และ Sheet ที่ 2 ว่า "Scores"
 * 3. ไปที่ Extensions > Apps Script
 * 4. วาง code นี้ทั้งหมดลงไป
 * 5. Deploy > New deployment > Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy URL ไปใส่ในไฟล์ src/data/api.js (ตัวแปร SCRIPT_URL)
 * 
 * Sheet "Records" หัวตาราง (row 1):
 * วันที่ | วัน | ผู้ตรวจ | อาคาร | ห้อง | ปิดไฟ | ปิดคอม | ปิดแอร์ | ปิดพัดลม | สถานะ | คะแนน | Timestamp
 * 
 * Sheet "Scores" หัวตาราง (row 1):
 * อาคาร | ห้อง | คะแนนรวม | จำนวนวันตรวจ | จำนวนวันผ่านครบ
 * 
 * === คะแนน: แต่ละรายการ = 1 คะแนน (สูงสุด 4 คะแนน/ห้อง/วัน) ===
 * ปิดไฟ = 1, ปิดคอม = 1, ปิดแอร์ = 1, ปิดพัดลม = 1
 */

// ===== SETUP: Run this function ONCE to create headers =====
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Records sheet
  var records = ss.getSheetByName("Records");
  if (!records) {
    records = ss.insertSheet("Records");
  }
  records.getRange(1, 1, 1, 12).setValues([[
    "วันที่", "วัน", "ผู้ตรวจ", "อาคาร", "ห้อง",
    "ปิดไฟ", "ปิดคอม", "ปิดแอร์", "ปิดพัดลม",
    "สถานะ", "คะแนน", "Timestamp"
  ]]);
  records.getRange(1, 1, 1, 12).setFontWeight("bold");
  records.setFrozenRows(1);
  
  // Scores sheet
  var scores = ss.getSheetByName("Scores");
  if (!scores) {
    scores = ss.insertSheet("Scores");
  }
  scores.getRange(1, 1, 1, 5).setValues([[
    "อาคาร", "ห้อง", "คะแนนรวม", "จำนวนวันตรวจ", "จำนวนวันผ่านครบ"
  ]]);
  scores.getRange(1, 1, 1, 5).setFontWeight("bold");
  scores.setFrozenRows(1);
}

// ===== WEB APP ENDPOINTS =====

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    
    if (action === "submit") {
      return submitChecklist(data);
    }
    
    return jsonResponse({ success: false, error: "Unknown action" });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doGet(e) {
  try {
    var action = e.parameter.action;
    
    if (action === "getRecords") {
      return getRecords(e.parameter.date || "");
    } else if (action === "getScores") {
      return getScores();
    } else if (action === "getTodayStatus") {
      return getTodayStatus(e.parameter.date || "");
    }
    
    return jsonResponse({ success: false, error: "Unknown action" });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ===== SUBMIT CHECKLIST =====
// คะแนน: ปิดไฟ=1, ปิดคอม=1, ปิดแอร์=1, ปิดพัดลม=1 (สูงสุด 4/ห้อง/วัน)
function submitChecklist(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Records");
  
  var items = data.items;
  var results = [];
  
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    
    // นับคะแนนทีละรายการ
    var score = 0;
    if (item.lights) score++;
    if (item.computer) score++;
    if (item.aircon) score++;
    if (item.fan) score++;
    
    var allChecked = (score === 4);
    var status = allChecked ? "ผ่านครบ" : score > 0 ? "ผ่าน " + score + "/4" : "ไม่ผ่าน";
    
    // Check if already submitted today for this room
    var existingRow = findExistingRecord(sheet, data.date, data.buildingName, item.roomName);
    
    var rowData = [
      data.date,
      data.dayName,
      data.inspector,
      data.buildingName,
      item.roomName,
      item.lights ? "✓" : "✗",
      item.computer ? "✓" : "✗",
      item.aircon ? "✓" : "✗",
      item.fan ? "✓" : "✗",
      status,
      score,
      new Date().toISOString()
    ];
    
    // หาคะแนนเดิม (ถ้ามี) เพื่อลบก่อนเพิ่มใหม่
    var oldScore = 0;
    var oldAllChecked = false;
    if (existingRow > 0) {
      oldScore = Number(sheet.getRange(existingRow, 11).getValue()) || 0;
      oldAllChecked = sheet.getRange(existingRow, 10).getValue() === "ผ่านครบ";
      sheet.getRange(existingRow, 1, 1, 12).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
    
    // Update scores (ปรับจากคะแนนเดิมเป็นคะแนนใหม่)
    updateScore(data.buildingName, item.roomName, score, allChecked, existingRow > 0, oldScore, oldAllChecked);
    
    results.push({ room: item.roomName, score: score, status: status });
  }
  
  return jsonResponse({ success: true, results: results });
}

// Find existing record for today
function findExistingRecord(sheet, date, building, room) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === date && data[i][3] === building && data[i][4] === room) {
      return i + 1;
    }
  }
  return -1;
}

// ===== UPDATE SCORES =====
function updateScore(buildingName, roomName, newScore, newAllChecked, isUpdate, oldScore, oldAllChecked) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Scores");
  var data = sheet.getDataRange().getValues();
  
  var foundRow = -1;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === buildingName && data[i][1] === roomName) {
      foundRow = i + 1;
      break;
    }
  }
  
  if (foundRow > 0) {
    var currentTotalScore = Number(data[foundRow - 1][2]) || 0;
    var totalChecks = Number(data[foundRow - 1][3]) || 0;
    var totalPassed = Number(data[foundRow - 1][4]) || 0;
    
    if (isUpdate) {
      // ลบคะแนนเดิม แล้วเพิ่มคะแนนใหม่
      currentTotalScore = currentTotalScore - oldScore + newScore;
      if (oldAllChecked) totalPassed--;
      if (newAllChecked) totalPassed++;
    } else {
      currentTotalScore += newScore;
      totalChecks++;
      if (newAllChecked) totalPassed++;
    }
    
    sheet.getRange(foundRow, 3, 1, 3).setValues([[
      currentTotalScore,
      totalChecks,
      totalPassed
    ]]);
  } else {
    sheet.appendRow([
      buildingName,
      roomName,
      newScore,
      1,
      newAllChecked ? 1 : 0
    ]);
  }
}

// ===== GET RECORDS =====
function getRecords(dateFilter) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Records");
  var data = sheet.getDataRange().getValues();
  
  var records = [];
  for (var i = 1; i < data.length; i++) {
    if (dateFilter && data[i][0] !== dateFilter) continue;
    records.push({
      date: data[i][0],
      day: data[i][1],
      inspector: data[i][2],
      building: data[i][3],
      room: data[i][4],
      lights: data[i][5] === "✓",
      computer: data[i][6] === "✓",
      aircon: data[i][7] === "✓",
      fan: data[i][8] === "✓",
      status: data[i][9],
      score: data[i][10],
      timestamp: data[i][11]
    });
  }
  
  return jsonResponse({ success: true, records: records });
}

// ===== GET SCORES =====
function getScores() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Scores");
  var data = sheet.getDataRange().getValues();
  
  var scores = [];
  for (var i = 1; i < data.length; i++) {
    scores.push({
      building: data[i][0],
      room: data[i][1],
      totalScore: data[i][2],
      totalChecks: data[i][3],
      totalPassed: data[i][4]
    });
  }
  
  scores.sort(function(a, b) { return b.totalScore - a.totalScore; });
  
  return jsonResponse({ success: true, scores: scores });
}

// ===== GET TODAY STATUS =====
function getTodayStatus(date) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Records");
  var data = sheet.getDataRange().getValues();
  
  var status = {};
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] !== date) continue;
    var key = data[i][3] + "|" + data[i][4];
    status[key] = {
      inspector: data[i][2],
      lights: data[i][5] === "✓",
      computer: data[i][6] === "✓",
      aircon: data[i][7] === "✓",
      fan: data[i][8] === "✓",
      allPassed: data[i][9] === "ผ่านครบ",
      score: data[i][10]
    };
  }
  
  return jsonResponse({ success: true, status: status });
}

// ===== HELPER =====
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
