import { useState, useEffect, useMemo } from 'react';
import {
  BUILDINGS,
  CHECKLIST_ITEMS,
  INSPECTION_SCHEDULE,
  CAMPAIGN_DATES,
  getTodayDateString,
  formatDateThai,
  getThaiDayOfWeek,
} from '../data/constants';
import { getRecords, getScores, getTodayStatus } from '../data/api';

export default function Dashboard() {
  const todayStr = getTodayDateString();
  const todayDayIndex = new Date(todayStr).getDay();

  const [activeSection, setActiveSection] = useState('today');
  const [todayStatusData, setTodayStatusData] = useState({});
  const [scoresData, setScoresData] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');

  // Fetch all data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [statusRes, scoresRes, recordsRes] = await Promise.all([
          getTodayStatus(todayStr),
          getScores(),
          getRecords(),
        ]);
        if (statusRes.success) setTodayStatusData(statusRes.status);
        if (scoresRes.success) setScoresData(scoresRes.scores);
        if (recordsRes.success) setAllRecords(recordsRes.records);
      } catch (e) {
        console.error('Dashboard fetch error:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [todayStr]);

  // Stats
  const totalRooms = BUILDINGS.reduce((sum, b) => sum + b.rooms.length, 0);
  const checkedRooms = Object.values(todayStatusData).filter((s) => s.allPassed).length;
  const partialRooms = Object.values(todayStatusData).filter((s) => !s.allPassed).length;
  const uncheckedRooms = totalRooms - checkedRooms - partialRooms;
  const completionPercent = totalRooms > 0 ? Math.round((checkedRooms / totalRooms) * 100) : 0;

  // Filtered records for sheet view
  const filteredRecords = useMemo(() => {
    let result = [...allRecords];
    if (filterDate) result = result.filter((r) => r.date === filterDate);
    if (filterBuilding) result = result.filter((r) => r.building === filterBuilding);
    return result.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return a.building.localeCompare(b.building);
    });
  }, [allRecords, filterDate, filterBuilding]);

  const uniqueDates = useMemo(() => {
    const dates = [...new Set(allRecords.map((r) => r.date))];
    return dates.sort().reverse();
  }, [allRecords]);

  // Total scores
  const totalScore = scoresData.reduce((sum, s) => sum + (Number(s.totalScore) || 0), 0);

  const SECTIONS = [
    { id: 'today', label: 'วันนี้', icon: '📊' },
    { id: 'schedule', label: 'ตารางเวร', icon: '📅' },
    { id: 'scores', label: 'คะแนน', icon: '🏆' },
    { id: 'sheet', label: 'ตาราง', icon: '📃' },
  ];

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-4">
        <h1 className="text-xl font-bold text-gray-800 mb-1">📊 Dashboard</h1>
        <p className="text-sm text-gray-500">
          สรุปผลแคมเปญประหยัดพลังงาน | {getThaiDayOfWeek(todayStr)} {formatDateThai(todayStr)}
        </p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {SECTIONS.map((sec) => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 ${
              activeSection === sec.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span>{sec.icon}</span> {sec.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-3xl mb-3 animate-bounce">⏳</div>
          <p className="text-sm text-gray-400">กำลังโหลดข้อมูล...</p>
        </div>
      ) : (
        <>
          {/* ===== TODAY STATUS ===== */}
          {activeSection === 'today' && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{checkedRooms}</div>
                  <div className="text-[10px] text-gray-500 mt-1">✅ ผ่าน</div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-500">{partialRooms}</div>
                  <div className="text-[10px] text-gray-500 mt-1">⚠️ ไม่ครบ</div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 text-center">
                  <div className="text-2xl font-bold text-gray-400">{uncheckedRooms}</div>
                  <div className="text-[10px] text-gray-500 mt-1">⬜ ยังไม่ตรวจ</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">ความสำเร็จวันนี้</span>
                  <span className="text-sm font-bold text-blue-600">{completionPercent}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${completionPercent}%`,
                      background:
                        completionPercent === 100
                          ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                          : 'linear-gradient(90deg, #2563eb, #3b82f6)',
                    }}
                  />
                </div>
              </div>

              {/* Building Status */}
              {BUILDINGS.map((building) => (
                <div
                  key={building.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-3 overflow-hidden"
                >
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                    <h3 className="font-semibold text-sm text-gray-800">🏢 {building.name}</h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {building.rooms.map((room) => {
                      const key = `${building.name}|${room.name}`;
                      const record = todayStatusData[key];
                      const status = record ? (record.allPassed ? 'pass' : 'partial') : 'none';

                      return (
                        <div key={room.id} className="px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                status === 'pass'
                                  ? 'bg-green-500'
                                  : status === 'partial'
                                  ? 'bg-yellow-400'
                                  : 'bg-gray-200'
                              }`}
                            />
                            <span className="text-sm text-gray-700">{room.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {record ? (
                              <>
                                {CHECKLIST_ITEMS.map((item) => (
                                  <span
                                    key={item.id}
                                    title={item.label}
                                    className={`text-[10px] w-5 h-5 rounded-full flex items-center justify-center ${
                                      record[item.id]
                                        ? 'bg-green-100 text-green-600'
                                        : 'bg-red-100 text-red-500'
                                    }`}
                                  >
                                    {item.icon}
                                  </span>
                                ))}
                                <span className="text-[10px] ml-1 text-gray-400">
                                  {record.inspector}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-gray-300">ยังไม่ตรวจ</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ===== SCHEDULE ===== */}
          {activeSection === 'schedule' && (
            <>
              {/* Campaign Info */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-5 mb-4">
                <h2 className="text-base font-bold text-blue-800 mb-3">🏆 แคมเปญประหยัดพลังงาน</h2>
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">📌</span>
                    <div>
                      <span className="font-medium text-gray-700">เริ่มตรวจเวร:</span>{' '}
                      <span className="text-gray-600">{formatDateThai(CAMPAIGN_DATES.inspectionStart)}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">🚀</span>
                    <div>
                      <span className="font-medium text-gray-700">เริ่มแคมเปญ:</span>{' '}
                      <span className="text-gray-600">{formatDateThai(CAMPAIGN_DATES.campaignStart)}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">🎉</span>
                    <div>
                      <span className="font-medium text-gray-700">ประกาศผล:</span>{' '}
                      <span className="text-gray-600">{formatDateThai(CAMPAIGN_DATES.yearEnd)}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 bg-white/70 rounded-xl p-3 border border-blue-100">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    💡 <strong>คะแนนสะสม</strong> — ปิดครบ 4 รายการ = +1 คะแนน/ห้อง
                    สิ้นปีมีรางวัลมีแน่! ประกาศผลวันสิ้นปี 2569
                  </p>
                </div>
              </div>

              {/* Duty Schedule */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                  <h3 className="font-semibold text-sm text-gray-800">👤 ตารางเวรตรวจ</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">วัน</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">อาคาร 1</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs">อาคาร 3</th>
                      </tr>
                    </thead>
                    <tbody>
                      {INSPECTION_SCHEDULE.map((s) => {
                        const isToday = s.dayIndex === todayDayIndex;
                        const b1 = s.inspectors.find((i) => i.buildingId === 'building-1');
                        const b3 = s.inspectors.find((i) => i.buildingId === 'building-3');
                        return (
                          <tr
                            key={s.dayIndex}
                            className={`border-b border-gray-50 ${isToday ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {isToday && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                )}
                                <span className={`font-medium ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                                  {s.day}
                                </span>
                              </div>
                            </td>
                            <td className={`px-4 py-3 ${isToday ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                              {b1?.name || '-'}
                            </td>
                            <td className={`px-4 py-3 ${isToday ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                              {b3?.name || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ===== SCORES ===== */}
          {activeSection === 'scores' && (
            <>
              {/* Total Score */}
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl border border-yellow-200 p-5 mb-4 text-center">
                <div className="text-4xl mb-2">🏆</div>
                <div className="text-3xl font-bold text-yellow-700">{totalScore}</div>
                <div className="text-xs text-yellow-600 mt-1">คะแนนรวมทั้งหมด</div>
              </div>

              {/* Score Ranking */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                  <h3 className="font-semibold text-sm text-gray-800">🏅 อันดับคะแนนสะสม</h3>
                </div>
                {scoresData.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="text-3xl mb-2">📭</div>
                    <p className="text-sm text-gray-400">ยังไม่มีข้อมูลคะแนน</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {scoresData.map((s, idx) => {
                      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                      const passRate =
                        s.totalChecks > 0 ? Math.round((s.totalPassed / s.totalChecks) * 100) : 0;
                      return (
                        <div key={`${s.building}-${s.room}`} className="px-4 py-3 flex items-center gap-3">
                          <span className="text-lg w-8 text-center">{medal}</span>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800">
                              {s.building} — {s.room}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              ตรวจ {s.totalChecks} ครั้ง | ผ่าน {s.totalPassed} ครั้ง ({passRate}%)
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-yellow-600">{s.totalScore}</div>
                            <div className="text-[10px] text-gray-400">คะแนน</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ===== SHEET VIEW ===== */}
          {activeSection === 'sheet' && (
            <>
              {/* Filters */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-4">
                <div className="flex gap-3 flex-wrap">
                  <select
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="flex-1 min-w-[140px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700"
                  >
                    <option value="">ทุกวัน</option>
                    {uniqueDates.map((d) => (
                      <option key={d} value={d}>
                        {formatDateThai(d)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filterBuilding}
                    onChange={(e) => setFilterBuilding(e.target.value)}
                    className="flex-1 min-w-[140px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700"
                  >
                    <option value="">ทุกอาคาร</option>
                    {BUILDINGS.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-3 py-3 text-gray-600 font-semibold text-xs whitespace-nowrap">
                          วันที่
                        </th>
                        <th className="text-left px-3 py-3 text-gray-600 font-semibold text-xs whitespace-nowrap">
                          ผู้ตรวจ
                        </th>
                        <th className="text-left px-3 py-3 text-gray-600 font-semibold text-xs whitespace-nowrap">
                          อาคาร
                        </th>
                        <th className="text-left px-3 py-3 text-gray-600 font-semibold text-xs whitespace-nowrap">
                          ห้อง
                        </th>
                        {CHECKLIST_ITEMS.map((item) => (
                          <th
                            key={item.id}
                            className="text-center px-2 py-3 text-gray-600 font-semibold text-xs whitespace-nowrap"
                          >
                            {item.icon}
                          </th>
                        ))}
                        <th className="text-center px-3 py-3 text-gray-600 font-semibold text-xs whitespace-nowrap">
                          สถานะ
                        </th>
                        <th className="text-center px-3 py-3 text-gray-600 font-semibold text-xs whitespace-nowrap">
                          คะแนน
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4 + CHECKLIST_ITEMS.length + 2}
                            className="text-center py-12 text-gray-400"
                          >
                            <div className="text-3xl mb-2">📭</div>
                            <div className="text-sm">ยังไม่มีข้อมูล</div>
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map((r, idx) => (
                          <tr
                            key={`${r.date}-${r.building}-${r.room}-${idx}`}
                            className={`border-b border-gray-50 ${idx % 2 === 0 ? '' : 'bg-gray-50/50'}`}
                          >
                            <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap text-xs">
                              {r.day || getThaiDayOfWeek(r.date)}
                              <br />
                              <span className="text-gray-400">{formatDateThai(r.date)}</span>
                            </td>
                            <td className="px-3 py-2.5 text-gray-700 text-xs">{r.inspector}</td>
                            <td className="px-3 py-2.5 text-gray-700 text-xs">{r.building}</td>
                            <td className="px-3 py-2.5 text-gray-700 text-xs font-medium">{r.room}</td>
                            {CHECKLIST_ITEMS.map((item) => (
                              <td key={item.id} className="text-center px-2 py-2.5">
                                {r[item.id] ? (
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 text-[10px]">
                                    ✓
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-500 text-[10px]">
                                    ✗
                                  </span>
                                )}
                              </td>
                            ))}
                            <td className="text-center px-3 py-2.5">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                  r.status === 'ผ่าน'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-600'
                                }`}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td className="text-center px-3 py-2.5 font-bold text-yellow-600 text-xs">
                              {r.score}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredRecords.length > 0 && (
                  <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 text-xs text-gray-500">
                    แสดง {filteredRecords.length} รายการ | ผ่าน{' '}
                    {filteredRecords.filter((r) => r.status === 'ผ่าน').length} | ไม่ผ่าน{' '}
                    {filteredRecords.filter((r) => r.status !== 'ผ่าน').length}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
