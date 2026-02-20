// อาคารและห้อง
export const BUILDINGS = [
  {
    id: 'building-1',
    name: 'อาคาร 1',
    rooms: [
      { id: '1-admin', name: 'บริหารงานทั่วไป' },
      { id: '1-finance', name: 'การเงิน' },
      { id: '1-eds', name: 'EDS' },
      { id: '1-plan', name: 'แผน' },
    ],
  },
  {
    id: 'building-2',
    name: 'อาคาร 2',
    rooms: [
      { id: '2-201', name: '2-201' },
      { id: '2-202', name: '2-202' },
      { id: '2-202-1', name: '2-202/1' },
      { id: '2-202-2', name: '2-202/2' },
    ],
  },
  {
    id: 'building-3',
    name: 'อาคาร 3',
    rooms: [
      { id: '3-201', name: '3-201' },
      { id: '3-202', name: '3-202' },
      { id: '3-203', name: '3-203' },
      { id: '3-204', name: '3-204' },
      { id: '3-205', name: '3-205' },
      { id: '3-206', name: '3-206' },
      { id: '3-207', name: '3-207' },
      { id: '3-208', name: '3-208' },
    ],
  },
];

// รายการตรวจเช็ค
export const CHECKLIST_ITEMS = [
  { id: 'lights', label: 'ปิดไฟ', icon: '💡' },
  { id: 'computer', label: 'ปิดคอมพิวเตอร์', icon: '💻' },
  { id: 'aircon', label: 'ปิดแอร์', icon: '❄️' },
  { id: 'fan', label: 'ปิดพัดลม', icon: '🌀' },
];

// ตารางเวรตรวจ — ผู้ตรวจแต่ละคนผูกกับอาคารที่รับผิดชอบ
export const INSPECTION_SCHEDULE = [
  {
    day: 'จันทร์',
    dayIndex: 1,
    inspectors: [
      { name: 'พี่แตน', buildingId: 'building-1', buildingName: 'อาคาร 1' },
      { name: 'พี่ณี', buildingId: 'building-3', buildingName: 'อาคาร 3' },
    ],
  },
  {
    day: 'อังคาร',
    dayIndex: 2,
    inspectors: [
      { name: 'เมจ', buildingId: 'building-1', buildingName: 'อาคาร 1' },
      { name: 'อ้อ', buildingId: 'building-3', buildingName: 'อาคาร 3' },
    ],
  },
  {
    day: 'พุธ',
    dayIndex: 3,
    inspectors: [
      { name: 'ออม', buildingId: 'building-1', buildingName: 'อาคาร 1' },
      { name: 'เบนซ์', buildingId: 'building-3', buildingName: 'อาคาร 3' },
    ],
  },
  {
    day: 'พฤหัสบดี',
    dayIndex: 4,
    inspectors: [
      { name: 'พี่นัน (ชาย)', buildingId: 'building-1', buildingName: 'อาคาร 1' },
      { name: 'น้ำหอม', buildingId: 'building-3', buildingName: 'อาคาร 3' },
    ],
  },
  {
    day: 'ศุกร์',
    dayIndex: 5,
    inspectors: [
      { name: 'ภรณ์', buildingId: 'building-1', buildingName: 'อาคาร 1' },
      { name: 'น้ำ', buildingId: 'building-3', buildingName: 'อาคาร 3' },
    ],
  },
];

// วันที่สำคัญ
export const CAMPAIGN_DATES = {
  inspectionStart: '2026-02-23',
  campaignStart: '2026-03-01',
  yearEnd: '2026-12-31',
};

// ===== HELPER FUNCTIONS =====

export function formatDateThai(dateStr) {
  const date = new Date(dateStr);
  const day = date.getDate();
  const months = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];
  const month = months[date.getMonth()];
  const yearBE = date.getFullYear() + 543;
  return `${day} ${month} ${yearBE}`;
}

export function getThaiDayOfWeek(dateStr) {
  const date = new Date(dateStr);
  const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  return days[date.getDay()];
}

export function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// หาตารางเวรของวันนี้
export function getTodaySchedule(dateStr) {
  const date = new Date(dateStr);
  const dayIndex = date.getDay();
  return INSPECTION_SCHEDULE.find((s) => s.dayIndex === dayIndex) || null;
}

// หาผู้ตรวจทั้งหมดของวันนี้
export function getTodayInspectors(dateStr) {
  const schedule = getTodaySchedule(dateStr);
  return schedule ? schedule.inspectors : [];
}

// หาอาคาร+ห้องที่ผู้ตรวจรับผิดชอบ
export function getInspectorAssignment(inspectorName, dateStr) {
  const schedule = getTodaySchedule(dateStr);
  if (!schedule) return null;
  const inspector = schedule.inspectors.find((i) => i.name === inspectorName);
  if (!inspector) return null;
  const building = BUILDINGS.find((b) => b.id === inspector.buildingId);
  return building
    ? { inspector, building }
    : null;
}
