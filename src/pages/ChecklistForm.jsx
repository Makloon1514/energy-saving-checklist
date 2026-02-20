import { useState, useCallback } from 'react';
import {
  CHECKLIST_ITEMS,
  getTodayDateString,
  getTodayInspectors,
  getInspectorAssignment,
  formatDateThai,
  getThaiDayOfWeek,
} from '../data/constants';
import { submitChecklist, isConfigured } from '../data/api';

export default function ChecklistForm() {
  const todayStr = getTodayDateString();
  const todayInspectors = getTodayInspectors(todayStr);

  // Step state
  const [selectedInspector, setSelectedInspector] = useState(null);
  const [checkStates, setCheckStates] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [savedRooms, setSavedRooms] = useState({});

  // Get assignment for selected inspector
  const assignment = selectedInspector
    ? getInspectorAssignment(selectedInspector, todayStr)
    : null;

  const getRoomChecks = useCallback(
    (roomId) => {
      if (checkStates[roomId]) return checkStates[roomId];
      const defaults = {};
      CHECKLIST_ITEMS.forEach((item) => {
        defaults[item.id] = false;
      });
      return defaults;
    },
    [checkStates]
  );

  const handleToggle = (roomId, checkId) => {
    setCheckStates((prev) => {
      const roomChecks = getRoomChecks(roomId);
      return {
        ...prev,
        [roomId]: {
          ...roomChecks,
          [checkId]: !roomChecks[checkId],
        },
      };
    });
  };

  const handleSubmitRoom = async (room) => {
    if (!assignment) return;
    setSubmitting(true);

    const checks = getRoomChecks(room.id);
    const data = {
      date: todayStr,
      dayName: getThaiDayOfWeek(todayStr),
      inspector: selectedInspector,
      buildingId: assignment.building.id,
      buildingName: assignment.building.name,
      items: [
        {
          roomId: room.id,
          roomName: room.name,
          lights: checks.lights || false,
          computer: checks.computer || false,
          aircon: checks.aircon || false,
          fan: checks.fan || false,
        },
      ],
    };

    try {
      setSubmitError(null);
      const result = await submitChecklist(data);
      setSavedRooms((prev) => ({ ...prev, [room.id]: true }));
      setSubmitResult({ roomId: room.id, success: true });
      setTimeout(() => setSubmitResult(null), 2500);
    } catch (err) {
      setSubmitError(err.message);
      setSubmitResult({ roomId: room.id, success: false });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAll = async () => {
    if (!assignment) return;
    setSubmitting(true);

    const items = assignment.building.rooms.map((room) => {
      const checks = getRoomChecks(room.id);
      return {
        roomId: room.id,
        roomName: room.name,
        lights: checks.lights || false,
        computer: checks.computer || false,
        aircon: checks.aircon || false,
        fan: checks.fan || false,
      };
    });

    const data = {
      date: todayStr,
      dayName: getThaiDayOfWeek(todayStr),
      inspector: selectedInspector,
      buildingId: assignment.building.id,
      buildingName: assignment.building.name,
      items,
    };

    try {
      setSubmitError(null);
      const result = await submitChecklist(data);
      const newSaved = {};
      assignment.building.rooms.forEach((r) => {
        newSaved[r.id] = true;
      });
      setSavedRooms((prev) => ({ ...prev, ...newSaved }));
      setSubmitResult({ all: true, success: true });
      setTimeout(() => setSubmitResult(null), 2500);
    } catch (err) {
      setSubmitError(err.message);
      setSubmitResult({ all: true, success: false });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedInspector(null);
    setCheckStates({});
    setSavedRooms({});
    setSubmitResult(null);
  };

  // ===== WEEKEND =====
  const isWeekend = todayInspectors.length === 0;

  if (isWeekend) {
    return (
      <div className="max-w-lg mx-auto pb-24">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">วันหยุดสุดสัปดาห์</h2>
          <p className="text-sm text-gray-500">ไม่มีตารางตรวจในวัน{getThaiDayOfWeek(todayStr)}</p>
          <div className="mt-4 bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400">📅 {formatDateThai(todayStr)}</p>
          </div>
        </div>
      </div>
    );
  }

  // ===== STEP 1: SELECT INSPECTOR =====
  if (!selectedInspector) {
    return (
      <div className="max-w-lg mx-auto pb-24">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-4">
          <h1 className="text-xl font-bold text-gray-800 mb-1">📋 ตรวจเช็คประหยัดพลังงาน</h1>
          <p className="text-sm text-gray-500">เลือกชื่อผู้ตรวจเพื่อเริ่มต้น</p>
          <div className="mt-3 bg-gray-50 rounded-xl px-4 py-2.5 text-sm text-gray-600">
            📅 {getThaiDayOfWeek(todayStr)} {formatDateThai(todayStr)}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">👤 เลือกชื่อของคุณ</h2>
          <div className="space-y-3">
            {todayInspectors.map((inspector) => (
              <button
                key={inspector.name}
                onClick={() => setSelectedInspector(inspector.name)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 active:scale-[0.98] group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold group-hover:bg-blue-200 transition-colors">
                  {inspector.name.charAt(0)}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-800 text-sm">{inspector.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">🏢 {inspector.buildingName}</div>
                </div>
                <svg className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ===== STEP 2: CHECKLIST FORM FOR ASSIGNED BUILDING =====
  return (
    <div className="max-w-lg mx-auto pb-24">
      {/* Config Warning */}
      {!isConfigured() && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
          <p className="text-xs text-red-700">
            ⚠️ <strong>ยังไม่ได้ตั้งค่า Google Sheet!</strong> กรุณาใส่ URL ใน <code>src/data/api.js</code>
          </p>
        </div>
      )}

      {/* Error Message */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
          <p className="text-xs text-red-700">❌ {submitError}</p>
        </div>
      )}
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-gray-800">📋 แบบตรวจเช็ค</h1>
          <button
            onClick={handleReset}
            className="text-xs text-gray-400 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            ← เปลี่ยนผู้ตรวจ
          </button>
        </div>

        {/* Date (read-only) */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-medium text-gray-500 w-14">วันที่:</span>
          <div className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-xs text-gray-600 font-medium">
            📅 {getThaiDayOfWeek(todayStr)} {formatDateThai(todayStr)}
          </div>
        </div>

        {/* Inspector & Building */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-medium text-gray-500 w-14">ผู้ตรวจ:</span>
          <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium">
            👤 {selectedInspector}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-500 w-14">อาคาร:</span>
          <span className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-medium">
            🏢 {assignment.building.name}
          </span>
        </div>
      </div>

      {/* Room Cards */}
      {assignment.building.rooms.map((room) => {
        const checks = getRoomChecks(room.id);
        const allChecked = CHECKLIST_ITEMS.every((item) => checks[item.id]);
        const isSaved = savedRooms[room.id];
        // คะแนนรายรายการ: 1 คะแนน/รายการ (สูงสุด 4)
        const roomScore = CHECKLIST_ITEMS.filter((item) => checks[item.id]).length;

        return (
          <div
            key={room.id}
            className={`bg-white rounded-2xl shadow-sm border mb-3 overflow-hidden transition-all duration-300 ${
              isSaved ? 'border-green-300' : 'border-gray-200'
            }`}
          >
            {/* Room Header */}
            <div
              className={`px-4 py-3 flex items-center justify-between ${
                allChecked ? 'bg-green-50' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${allChecked ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="font-semibold text-sm text-gray-800">🚪 {room.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  roomScore === 4 ? 'bg-green-100 text-green-700' : roomScore > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  ⭐ {roomScore}/4 คะแนน
                </span>
                {isSaved && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    ✅ บันทึกแล้ว
                  </span>
                )}
              </div>
            </div>

            {/* Checklist Items */}
            <div className="p-4 space-y-3">
              {CHECKLIST_ITEMS.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm text-gray-700">{item.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      checks[item.id] ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {checks[item.id] ? '+1' : '0'}
                    </span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={checks[item.id] || false}
                      onChange={() => handleToggle(room.id, item.id)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              ))}
            </div>

            {/* Save Button */}
            <div className="px-4 pb-4">
              <button
                onClick={() => handleSubmitRoom(room)}
                disabled={submitting}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  submitResult?.roomId === room.id && submitResult?.success
                    ? 'bg-green-500 text-white'
                    : submitting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-sm'
                }`}
              >
                {submitResult?.roomId === room.id && submitResult?.success
                  ? '✅ บันทึกสำเร็จ!'
                  : submitting
                  ? '⏳ กำลังบันทึก...'
                  : '💾 บันทึก'}
              </button>
            </div>
          </div>
        );
      })}

      {/* Submit All */}
      <button
        onClick={handleSubmitAll}
        disabled={submitting}
        className={`w-full py-3.5 rounded-2xl text-sm font-bold shadow-lg transition-all duration-200 mt-2 ${
          submitResult?.all && submitResult?.success
            ? 'bg-green-500 text-white shadow-green-200'
            : submitting
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-blue-200 hover:shadow-xl active:scale-[0.98]'
        }`}
      >
        {submitResult?.all && submitResult?.success
          ? '✅ บันทึกทั้งหมดสำเร็จ!'
          : submitting
          ? '⏳ กำลังบันทึก...'
          : `📤 บันทึกทั้งหมด (${assignment.building.name})`}
      </button>
    </div>
  );
}
