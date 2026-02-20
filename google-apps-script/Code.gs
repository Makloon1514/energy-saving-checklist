/**
 * Google Apps Script — Energy Saving Checklist API
 *
 * วิธีติดตั้ง:
 * 1. สร้าง Google Sheet ใหม่
 * 2. ไปที่ Extensions > Apps Script
 * 3. วาง code นี้ทั้งหมดลงไป
 * 4. Deploy > New deployment > Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy URL ไปใส่ในไฟล์ src/data/api.js
 *
 * คะแนน: แต่ละรายการ = 1 คะแนน (สูงสุด 4/ห้อง/วัน)
 * ปิดไฟ=1, ปิดคอม=1, ปิดแอร์=1, ปิดพัดลม=1
 */

var RECORD_HEADERS = [
  "วันที่",
  "วัน",
  "ผู้ตรวจ",
  "อาคาร",
  "ห้อง",
  "ปิดไฟ",
  "ปิดคอม",
  "ปิดแอร์",
  "ปิดพัดลม",
  "สถานะ",
  "คะแนน",
  "Timestamp",
];
var SCORE_HEADERS = [
  "อาคาร",
  "ห้อง",
  "คะแนนรวม",
  "จำนวนวันตรวจ",
  "จำนวนวันผ่านครบ",
];

// ===== AUTO-ENSURE HEADERS =====
function ensureHeaders() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var records = ss.getSheetByName("Records");
  if (!records) {
    records = ss.insertSheet("Records");
  }
  // Check if row 1 has headers
  var firstCell = records.getRange(1, 1).getValue();
  if (firstCell !== "วันที่") {
    // If data exists in row 1, insert a row above
    if (firstCell !== "") {
      records.insertRowBefore(1);
    }
    records
      .getRange(1, 1, 1, RECORD_HEADERS.length)
      .setValues([RECORD_HEADERS]);
    records.getRange(1, 1, 1, RECORD_HEADERS.length).setFontWeight("bold");
    records.setFrozenRows(1);
  }

  var scores = ss.getSheetByName("Scores");
  if (!scores) {
    scores = ss.insertSheet("Scores");
  }
  var firstScoreCell = scores.getRange(1, 1).getValue();
  if (firstScoreCell !== "อาคาร") {
    if (firstScoreCell !== "") {
      scores.insertRowBefore(1);
    }
    scores.getRange(1, 1, 1, SCORE_HEADERS.length).setValues([SCORE_HEADERS]);
    scores.getRange(1, 1, 1, SCORE_HEADERS.length).setFontWeight("bold");
    scores.setFrozenRows(1);
  }
}

// ===== SETUP: Run manually to reset headers =====
function setupSheets() {
  ensureHeaders();
  SpreadsheetApp.getUi().alert("✅ สร้างหัวตารางเรียบร้อย!");
}

// Date normalization to handle Date objects, "2026 02 20", "2026-02-20", etc.
function normalizeDate(d) {
  if (!d) return "";

  // Handle JavaScript Date objects (returned by Sheets getValues())
  if (d instanceof Date || (typeof d === "object" && d.getFullYear)) {
    var year = d.getFullYear();
    var month = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  var str = String(d).trim();

  // Handle full datetime strings like "Thu Feb 20 2026 ..."
  // or ISO strings like "2026-02-20T04:01:50.684Z"
  if (str.length > 10 && str.indexOf("T") > -1) {
    str = str.split("T")[0];
  }

  // Handle various separators: spaces, slashes → dashes
  str = str.replace(/\s+/g, "-").replace(/\//g, "-");

  return str;
}

// ===== WEB APP ENDPOINTS =====

function doPost(e) {
  try {
    ensureHeaders();
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
    ensureHeaders();
    var action = e.parameter.action;

    if (action === "getAllData") {
      return getAllData(e.parameter.date || "");
    } else if (action === "getRecords") {
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
function submitChecklist(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Records");

  var items = data.items;
  var results = [];
  var dateStr = normalizeDate(data.date);

  for (var i = 0; i < items.length; i++) {
    var item = items[i];

    var score = 0;
    if (item.lights) score++;
    if (item.computer) score++;
    if (item.aircon) score++;
    if (item.fan) score++;

    var allChecked = score === 4;
    var status = allChecked
      ? "ผ่านครบ"
      : score > 0
        ? "ผ่าน " + score + "/4"
        : "ไม่ผ่าน";

    var existingRow = findExistingRecord(
      sheet,
      dateStr,
      data.buildingName,
      item.roomName,
    );

    var rowData = [
      dateStr,
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
      new Date().toISOString(),
    ];

    var oldScore = 0;
    var oldAllChecked = false;
    if (existingRow > 0) {
      oldScore = Number(sheet.getRange(existingRow, 11).getValue()) || 0;
      oldAllChecked =
        String(sheet.getRange(existingRow, 10).getValue()) === "ผ่านครบ";
      sheet.getRange(existingRow, 1, 1, 12).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }

    updateScore(
      data.buildingName,
      item.roomName,
      score,
      allChecked,
      existingRow > 0,
      oldScore,
      oldAllChecked,
    );

    results.push({ room: item.roomName, score: score, status: status });
  }

  return jsonResponse({ success: true, results: results });
}

// Find existing record — normalize dates for comparison
function findExistingRecord(sheet, date, building, room) {
  var data = sheet.getDataRange().getValues();
  var normDate = normalizeDate(date);
  for (var i = 1; i < data.length; i++) {
    var rowDate = normalizeDate(data[i][0]);
    if (
      rowDate === normDate &&
      data[i][3] === building &&
      data[i][4] === room
    ) {
      return i + 1;
    }
  }
  return -1;
}

// ===== UPDATE SCORES =====
function updateScore(
  buildingName,
  roomName,
  newScore,
  newAllChecked,
  isUpdate,
  oldScore,
  oldAllChecked,
) {
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
      currentTotalScore = currentTotalScore - oldScore + newScore;
      if (oldAllChecked) totalPassed--;
      if (newAllChecked) totalPassed++;
    } else {
      currentTotalScore += newScore;
      totalChecks++;
      if (newAllChecked) totalPassed++;
    }

    sheet
      .getRange(foundRow, 3, 1, 3)
      .setValues([[currentTotalScore, totalChecks, totalPassed]]);
  } else {
    sheet.appendRow([
      buildingName,
      roomName,
      newScore,
      1,
      newAllChecked ? 1 : 0,
    ]);
  }
}

// ===== GET RECORDS =====
function getRecords(dateFilter) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Records");
  var data = sheet.getDataRange().getValues();
  var normFilter = normalizeDate(dateFilter);

  var records = [];
  for (var i = 1; i < data.length; i++) {
    var rowDate = normalizeDate(data[i][0]);
    if (normFilter && rowDate !== normFilter) continue;
    records.push({
      date: rowDate,
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
      timestamp: data[i][11],
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
      totalPassed: data[i][4],
    });
  }

  scores.sort(function (a, b) {
    return b.totalScore - a.totalScore;
  });

  return jsonResponse({ success: true, scores: scores });
}

// ===== GET TODAY STATUS =====
function getTodayStatus(date) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Records");
  var data = sheet.getDataRange().getValues();
  var normDate = normalizeDate(date);

  var status = {};
  for (var i = 1; i < data.length; i++) {
    var rowDate = normalizeDate(data[i][0]);
    if (rowDate !== normDate) continue;
    var key = data[i][3] + "|" + data[i][4];
    status[key] = {
      inspector: data[i][2],
      lights: data[i][5] === "✓",
      computer: data[i][6] === "✓",
      aircon: data[i][7] === "✓",
      fan: data[i][8] === "✓",
      allPassed: String(data[i][9]) === "ผ่านครบ",
      score: data[i][10],
    };
  }

  return jsonResponse({ success: true, status: status });
}

// ===== COMBINED ENDPOINT — single call for Dashboard =====
function getAllData(dateFilter) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Read Records sheet once
  var recordsSheet = ss.getSheetByName("Records");
  var recordsData = recordsSheet.getDataRange().getValues();
  var normFilter = normalizeDate(dateFilter);

  // Build todayStatus + records in one pass
  var status = {};
  var records = [];
  for (var i = 1; i < recordsData.length; i++) {
    var rowDate = normalizeDate(recordsData[i][0]);

    // Today status
    if (rowDate === normFilter) {
      var key = recordsData[i][3] + "|" + recordsData[i][4];
      status[key] = {
        inspector: recordsData[i][2],
        lights: recordsData[i][5] === "✓",
        computer: recordsData[i][6] === "✓",
        aircon: recordsData[i][7] === "✓",
        fan: recordsData[i][8] === "✓",
        allPassed: String(recordsData[i][9]) === "ผ่านครบ",
        score: recordsData[i][10],
      };
    }

    // All records
    records.push({
      date: rowDate,
      day: recordsData[i][1],
      inspector: recordsData[i][2],
      building: recordsData[i][3],
      room: recordsData[i][4],
      lights: recordsData[i][5] === "✓",
      computer: recordsData[i][6] === "✓",
      aircon: recordsData[i][7] === "✓",
      fan: recordsData[i][8] === "✓",
      status: recordsData[i][9],
      score: recordsData[i][10],
      timestamp: recordsData[i][11],
    });
  }

  // Read Scores sheet
  var scoresSheet = ss.getSheetByName("Scores");
  var scoresData = scoresSheet.getDataRange().getValues();
  var scores = [];
  for (var j = 1; j < scoresData.length; j++) {
    scores.push({
      building: scoresData[j][0],
      room: scoresData[j][1],
      totalScore: scoresData[j][2],
      totalChecks: scoresData[j][3],
      totalPassed: scoresData[j][4],
    });
  }
  scores.sort(function (a, b) {
    return b.totalScore - a.totalScore;
  });

  return jsonResponse({
    success: true,
    status: status,
    records: records,
    scores: scores,
  });
}

// ===== HELPER =====
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
