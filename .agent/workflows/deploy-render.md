---
description: How to deploy the Energy Saving Checklist app to Render
---

# Deploy to Render

## Prerequisites

- GitHub account
- Render account (https://render.com)
- Google account (for Google Sheets)

## Step 1: Setup Google Sheet

1. สร้าง Google Sheet ใหม่ที่ https://sheets.google.com
2. ตั้งชื่อ Sheet แรกว่า **Records** และ Sheet ที่ 2 ว่า **Scores**
3. ไปที่ **Extensions > Apps Script**
4. ลบ code เดิม → วาง code จาก `google-apps-script/Code.gs`
5. กดรัน function **setupSheets()** 1 ครั้ง (จะสร้างหัวตารางให้อัตโนมัติ)
6. ไปที่ **Deploy > New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
7. กด **Deploy** แล้ว copy URL ที่ได้

## Step 2: Configure App

// turbo

1. เปิดไฟล์ `src/data/api.js`
2. ใส่ URL ที่ copy มาในตัวแปร `SCRIPT_URL`:

```javascript
const SCRIPT_URL = "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";
```

## Step 3: Push to GitHub

// turbo

1. Initialize git repository:

```bash
git init
git add .
git commit -m "Energy Saving Checklist App"
```

// turbo 2. Create repo on GitHub and push:

```bash
git remote add origin https://github.com/YOUR_USERNAME/energy-saving-checklist.git

```

## Step 4: Deploy on Render

1. ไปที่ https://dashboard.render.com
2. กด **New** > **Static Site**
3. เชื่อมต่อ GitHub repository
4. ตั้งค่า:
   - **Name**: energy-saving-checklist (หรือชื่อที่ต้องการ)
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
5. กด **Deploy**

> Render จะ build และ deploy ให้อัตโนมัติทุกครั้งที่ push code ใหม่

## Step 5: Verify

1. เปิด URL ที่ Render ให้ (เช่น `https://energy-saving-checklist.onrender.com`)
2. ทดสอบกรอกฟอร์ม → ตรวจสอบว่าข้อมูลเข้า Google Sheet
3. ดู Dashboard → ตรวจสอบคะแนนสะสม
