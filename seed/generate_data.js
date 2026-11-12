// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Realistic Representative Data Generator
// Generates thousands of interconnected records matching rubric targets.
// ============================================================================

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'hospital_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 10,
});

// Helper utilities for realistic synthetic data (Bangladeshi Scenario)
const FIRST_NAMES_MALE = [
  'Mohammad', 'Md.', 'Tanvir', 'Mahmudul', 'Rafiqul', 'Kamrul', 'Arif', 'Tariqul', 'Saiful', 'Jashim',
  'Nazmul', 'Ashiqur', 'Fahim', 'Shahriar', 'Rakib', 'Sabbir', 'Hasibul', 'Zubair', 'Imran', 'Mustafizur',
  'Sajjad', 'Habibur', 'Shahadat', 'Zahid', 'Anisur', 'Mizanur', 'Farhan', 'Mahin', 'Shakib', 'Tamim',
  'Mushfiqur', 'Tasnim', 'Asif', 'Nayeem', 'Rashed', 'Sharif', 'Monir', 'Sumon', 'Ripon', 'Al-Amin',
  'Shamim', 'Golam', 'Biplob', 'Enamul', 'Ashraful', 'Mehedi', 'Sohan', 'Rubel', 'Sayed', 'Kabir'
];

const FIRST_NAMES_FEMALE = [
  'Nusrat', 'Sadia', 'Farhana', 'Sharmin', 'Tanjina', 'Ruma', 'Fatema', 'Ayesha', 'Tahmina', 'Shabnam',
  'Afroza', 'Taslima', 'Nasrin', 'Jannatul', 'Sumaiya', 'Sabrina', 'Farzana', 'Maksuda', 'Rokeya', 'Hasina',
  'Shirina', 'Roksana', 'Meherun', 'Salma', 'Monira', 'Shamima', 'Rehana', 'Sultana', 'Dilruba', 'Jesmin',
  'Marufa', 'Khadija', 'Zinnat', 'Rumana', 'Shampa', 'Nargis', 'Parvin', 'Bilkis', 'Mahbuba', 'Rubina',
  'Nazma', 'Rabeya', 'Shahnaz', 'Laila', 'Shirin', 'Shahana', 'Amena', 'Priyanka', 'Puja', 'Barnali'
];

const LAST_NAMES = [
  'Ahmed', 'Rahman', 'Islam', 'Hasan', 'Hossain', 'Khan', 'Chowdhury', 'Begum', 'Akter', 'Khatun',
  'Siddique', 'Ali', 'Uddin', 'Miah', 'Molla', 'Bhuiyan', 'Talukder', 'Sarker', 'Sheikh', 'Dewan',
  'Majumder', 'Kazi', 'Howlader', 'Biswas', 'Barua', 'Das', 'Roy', 'Chakraborty', 'Paul', 'Sen',
  'Dutta', 'Saha', 'Gazi', 'Mallick', 'Munshi', 'Bhowmik', 'Nath', 'Samad', 'Karim', 'Patwary'
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['Male', 'Female'];
const CITIES = ['Dhaka', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal', 'Rangpur', 'Mymensingh', 'Cumilla', 'Gazipur', 'Narayanganj', 'Bogura'];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate(startYear, endYear) {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 11, 31).getTime();
  return new Date(start + Math.random() * (end - start)).toISOString().split('T')[0];
}

function getRandomTimestamp(daysAgoStart, daysAgoEnd) {
  const now = Date.now();
  const start = now - (daysAgoStart * 86400000);
  const end = now - (daysAgoEnd * 86400000);
  return new Date(start + Math.random() * (end - start)).toISOString();
}

async function runSeed() {
  console.log('🚀 Starting Hospital Management System Database Seeding...');
  const startTime = Date.now();
  const client = await pool.connect();

  try {
    console.log('0. Truncating operational tables for clean repeatable seed...');
    await client.query(`
      TRUNCATE payments, invoice_items, invoices, medicine_dispensing_items, medicine_dispensing,
               prescription_items, prescriptions, inventory_transactions, medicine_batches,
               medicines, lab_results, lab_order_items, lab_orders, bed_assignments,
               admissions, beds, rooms, wards, medical_records, consultation_diagnoses,
               consultations, appointments, patients, doctor_schedules, doctors, staff,
               user_roles, users RESTART IDENTITY CASCADE;
    `);

    // Re-seed reference master data
    console.log('0b. Ensuring reference catalogs are populated...');
    const fs = require('fs');
    const refDataSql = fs.readFileSync(path.join(__dirname, '01_reference_data.sql'), 'utf-8');
    await client.query(refDataSql);

    // Disable triggers for fast, bulk synthetic import
    console.log('0c. Optimizing bulk data ingestion (pausing triggers during generation)...');
    const triggerTables = ['appointments', 'bed_assignments', 'inventory_transactions', 'payments', 'invoices', 'patients', 'prescriptions', 'admissions'];
    for (const tbl of triggerTables) {
      await client.query(`ALTER TABLE ${tbl} DISABLE TRIGGER USER;`);
    }

    // ------------------------------------------------------------------------
    // Step 1: Pre-hash password for consistent user credentials
    // ------------------------------------------------------------------------
    console.log('1. Generating secure credential hashes...');
    const defaultPasswordHash = await bcrypt.hash('password123', 10);

    // Fetch existing roles & departments
    const rolesRes = await client.query('SELECT role_id, role_name FROM roles;');
    const roleMap = {};
    rolesRes.rows.forEach(r => { roleMap[r.role_name] = r.role_id; });

    const deptsRes = await client.query('SELECT department_id, code, department_name FROM departments;');
    const deptIds = deptsRes.rows.map(d => d.department_id);

    // ------------------------------------------------------------------------
    // Step 2: Create Hospital Users & Staff (100 Staff, 30 Doctors)
    // ------------------------------------------------------------------------
    console.log('2. Seeding Users and Staff members (100 staff with 30 doctors)...');

    // Fixed default test accounts
    const testAccounts = [
      { username: 'admin', role: 'Admin', email: 'admin@apex-hospital.com.bd', dept: deptIds[0], fname: 'Saif', lname: 'Al Saad' },
      { username: 'doctor1', role: 'Doctor', email: 'dr.tanvir@apex-hospital.com.bd', dept: deptIds[0], fname: 'Tanvir', lname: 'Ahmed' },
      { username: 'receptionist1', role: 'Receptionist', email: 'reception@apex-hospital.com.bd', dept: deptIds[0], fname: 'Nusrat', lname: 'Jahan' },
      { username: 'accountant1', role: 'Accountant', email: 'finance@apex-hospital.com.bd', dept: deptIds[0], fname: 'Kamrul', lname: 'Hasan' },
    ];

    const staffIds = [];
    const doctorIds = [];

    // Insert fixed accounts
    for (const acc of testAccounts) {
      const uRes = await client.query(`
        INSERT INTO users (username, email, password_hash, is_active)
        VALUES ($1, $2, $3, TRUE)
        ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash
        RETURNING user_id;
      `, [acc.username, acc.email, defaultPasswordHash]);
      const uid = uRes.rows[0].user_id;

      if (roleMap[acc.role]) {
        await client.query(`
          INSERT INTO user_roles (user_id, role_id)
          VALUES ($1, $2)
          ON CONFLICT (user_id, role_id) DO NOTHING;
        `, [uid, roleMap[acc.role]]);
      }

      const sRes = await client.query(`
        INSERT INTO staff (user_id, department_id, first_name, last_name, gender, date_of_birth, phone, email, hire_date, employment_status)
        VALUES ($1, $2, $3, $4, 'Male', '1982-05-15', $5, $6, '2020-01-10', 'Active')
        ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name
        RETURNING staff_id;
      `, [uid, acc.dept, acc.fname, acc.lname, `+880-1712-${getRandomInt(100000, 999999)}`, acc.email]);
      
      const sid = sRes.rows[0].staff_id;
      staffIds.push(sid);

      if (acc.role === 'Doctor') {
        const dRes = await client.query(`
          INSERT INTO doctors (staff_id, department_id, specialization, license_number, consultation_fee, bio)
          VALUES ($1, $2, 'Consultant Cardiologist', 'BMDC-A-48291', 1000.00, 'Senior Consultant Cardiologist, FCPS (Cardiology), MBBS. 15+ years experience at National Institute of Cardiovascular Diseases (NICVD).')
          ON CONFLICT (license_number) DO NOTHING
          RETURNING doctor_id;
        `, [sid, acc.dept]);
        if (dRes.rows.length > 0) doctorIds.push(dRes.rows[0].doctor_id);
      }
    }

    // Generate remaining staff to reach 100 staff, with 29 more doctors to reach 30 doctors total
    const SPECIALIZATIONS = [
      'Cardiology', 'Interventional Cardiology', 'Adult Neurology', 'Pediatric Neurology',
      'General Pediatrics', 'Pediatric Cardiology', 'Orthopedic Surgery', 'Joint Replacement',
      'Internal Medicine', 'Endocrinology', 'General Surgery', 'Laparoscopic Surgery',
      'Obstetrics & Gynecology', 'Fetal Medicine', 'Emergency Medicine', 'Critical Care'
    ];

    for (let i = 5; i <= 100; i++) {
      const isDoc = (i <= 36); // first 30 docs total
      const gender = getRandomItem(GENDERS);
      const fname = (gender === 'Male') ? getRandomItem(FIRST_NAMES_MALE) : getRandomItem(FIRST_NAMES_FEMALE);
      const lname = getRandomItem(LAST_NAMES);
      const cleanFname = fname.toLowerCase().replace(/[^a-z]/g, '');
      const username = `staff_${i}_${cleanFname}`;
      const email = `${username}@apex-hospital.com.bd`;
      const deptId = getRandomItem(deptIds);
      const phone = `+880-1${getRandomItem(['7', '8', '9', '6'])}${getRandomInt(10, 99)}-${String(i).padStart(6, '0')}`;

      const uRes = await client.query(`
        INSERT INTO users (username, email, password_hash, is_active)
        VALUES ($1, $2, $3, TRUE)
        ON CONFLICT (username) DO NOTHING
        RETURNING user_id;
      `, [username, email, defaultPasswordHash]);

      let uid = uRes.rows[0] ? uRes.rows[0].user_id : null;
      if (!uid) {
        const existing = await client.query('SELECT user_id FROM users WHERE username = $1', [username]);
        uid = existing.rows[0]?.user_id;
      }

      const roleName = isDoc ? 'Doctor' : getRandomItem(['Receptionist', 'Accountant']);
      if (uid && roleMap[roleName]) {
        await client.query(`
          INSERT INTO user_roles (user_id, role_id)
          VALUES ($1, $2)
          ON CONFLICT (user_id, role_id) DO NOTHING;
        `, [uid, roleMap[roleName]]);
      }

      const sRes = await client.query(`
        INSERT INTO staff (user_id, department_id, first_name, last_name, gender, date_of_birth, phone, email, hire_date, employment_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Active')
        ON CONFLICT (phone) DO NOTHING
        RETURNING staff_id;
      `, [uid, deptId, fname, lname, gender, getRandomDate(1970, 1998), phone, email, getRandomDate(2018, 2024)]);

      if (sRes.rows.length > 0) {
        const sid = sRes.rows[0].staff_id;
        staffIds.push(sid);

        if (isDoc && doctorIds.length < 30) {
          const licNum = `BMDC-A-${20000 + i}`;
          const fee = getRandomItem([600.00, 800.00, 1000.00, 1200.00, 1500.00]);
          const spec = getRandomItem(SPECIALIZATIONS);
          const dRes = await client.query(`
            INSERT INTO doctors (staff_id, department_id, specialization, license_number, consultation_fee, bio)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (license_number) DO NOTHING
            RETURNING doctor_id;
          `, [sid, deptId, spec, licNum, fee, `Consultant in ${spec} with FCPS/MD certification and BMDC accreditation.`]);
          if (dRes.rows.length > 0) doctorIds.push(dRes.rows[0].doctor_id);
        }
      }
    }

    console.log(`✓ Seeded ${staffIds.length} staff records and ${doctorIds.length} doctors.`);

    // Update Head Doctors for departments
    for (let di = 0; di < deptIds.length; di++) {
      if (doctorIds[di]) {
        await client.query(`
          UPDATE departments SET head_doctor_id = $1 WHERE department_id = $2;
        `, [doctorIds[di], deptIds[di]]);
      }
    }

    // ------------------------------------------------------------------------
    // Step 3: Doctor Schedules (Weekly recurring availability)
    // ------------------------------------------------------------------------
    console.log('3. Seeding Doctor Schedules...');
    for (const docId of doctorIds) {
      // Each doctor works 4-5 days a week
      const days = [1, 2, 3, 4, 5];
      for (const d of days) {
        await client.query(`
          INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, max_patients)
          VALUES ($1, $2, '09:00:00', '15:00:00', 20, 20)
          ON CONFLICT DO NOTHING;
        `, [docId, d]);
      }
    }

    // ------------------------------------------------------------------------
    // Step 4: Wards, Rooms, and Beds (150 Beds target)
    // ------------------------------------------------------------------------
    console.log('4. Seeding Inpatient Wards, Rooms, and 150 Beds...');
    const WARD_DEFS = [
      { name: 'Cardiology CCU & Ward', type: 'ICU', deptIdx: 0, beds: 20 },
      { name: 'Neurology Inpatient Wing', type: 'General', deptIdx: 1, beds: 20 },
      { name: 'Pediatrics Acute Ward', type: 'Pediatric', deptIdx: 2, beds: 20 },
      { name: 'Orthopedics Recovery Wing', type: 'Orthopedic', deptIdx: 3, beds: 20 },
      { name: 'General Medicine Male Ward', type: 'General', deptIdx: 4, beds: 20 },
      { name: 'General Medicine Female Ward', type: 'General', deptIdx: 4, beds: 20 },
      { name: 'Surgical ICU & Post-Op', type: 'Surgical', deptIdx: 5, beds: 15 },
      { name: 'Maternity & Neonatal Ward', type: 'Maternity', deptIdx: 6, beds: 15 },
    ];

    const bedIds = [];
    for (const w of WARD_DEFS) {
      const deptId = deptIds[w.deptIdx] || deptIds[0];
      const wRes = await client.query(`
        INSERT INTO wards (ward_name, ward_type, department_id, total_beds, gender_preference)
        VALUES ($1, $2, $3, $4, 'Any')
        ON CONFLICT (ward_name) DO UPDATE SET total_beds = EXCLUDED.total_beds
        RETURNING ward_id;
      `, [w.name, w.type, deptId, w.beds]);
      const wardId = wRes.rows[0].ward_id;

      // 4 rooms per ward
      for (let r = 1; r <= 4; r++) {
        const roomNum = `R-${wardId}${r}0`;
        const roomType = (r === 1) ? 'Deluxe' : (r === 2 ? 'Semi-Private' : 'Standard');
        const rRes = await client.query(`
          INSERT INTO rooms (ward_id, room_number, room_type)
          VALUES ($1, $2, $3)
          ON CONFLICT (ward_id, room_number) DO UPDATE SET room_type = EXCLUDED.room_type
          RETURNING room_id;
        `, [wardId, roomNum, roomType]);
        const roomId = rRes.rows[0].room_id;

        // 5 beds per room = 20 beds per ward * 7 wards + 15 = 150 beds
        const bedsInRoom = Math.ceil(w.beds / 4);
        for (let b = 1; b <= bedsInRoom; b++) {
          if (bedIds.length >= 150) break;
          const bedNum = `B-${r}${b}`;
          const rate = (roomType === 'Deluxe') ? 3500.00 : (w.type === 'ICU' ? 8000.00 : (roomType === 'Semi-Private' ? 1500.00 : 500.00));
          const bRes = await client.query(`
            INSERT INTO beds (room_id, bed_number, daily_rate, status, is_active)
            VALUES ($1, $2, $3, 'Available', TRUE)
            ON CONFLICT (room_id, bed_number) DO NOTHING
            RETURNING bed_id;
          `, [roomId, bedNum, rate]);
          if (bRes.rows.length > 0) bedIds.push(bRes.rows[0].bed_id);
        }
      }
    }
    console.log(`✓ Seeded ${bedIds.length} hospital beds across wards.`);

    // ------------------------------------------------------------------------
    // Step 5: Medicines & Batches (300 Medicines, 100 Batches)
    // ------------------------------------------------------------------------
    console.log('5. Seeding Formulary: 300 Medicines and 100 Batches (Bangladeshi Brands)...');
    const medCatRes = await client.query('SELECT category_id FROM medicine_categories;');
    const medCatIds = medCatRes.rows.map(c => c.category_id);

    const DRUG_NAMES = [
      { b: 'Napa Extra', g: 'Paracetamol + Caffeine', f: 'Tablet', s: '500mg/65mg', m: 'Beximco Pharmaceuticals Ltd.', p: 3.00 },
      { b: 'Ace Plus', g: 'Paracetamol + Caffeine', f: 'Tablet', s: '500mg/65mg', m: 'Square Pharmaceuticals Ltd.', p: 3.00 },
      { b: 'Seclo', g: 'Omeprazole', f: 'Capsule', s: '20mg', m: 'Square Pharmaceuticals Ltd.', p: 6.00 },
      { b: 'Maxpro', g: 'Esomeprazole Magnesium', f: 'Capsule', s: '20mg', m: 'Beximco Pharmaceuticals Ltd.', p: 8.00 },
      { b: 'Pantonix', g: 'Pantoprazole Sodium', f: 'Tablet', s: '20mg', m: 'Incepta Pharmaceuticals Ltd.', p: 7.00 },
      { b: 'Ciprocin', g: 'Ciprofloxacin', f: 'Tablet', s: '500mg', m: 'Square Pharmaceuticals Ltd.', p: 15.00 },
      { b: 'Zimax', g: 'Azithromycin', f: 'Tablet', s: '500mg', m: 'Square Pharmaceuticals Ltd.', p: 35.00 },
      { b: 'Fexo', g: 'Fexofenadine HCl', f: 'Tablet', s: '120mg', m: 'Square Pharmaceuticals Ltd.', p: 9.00 },
      { b: 'Alatrex', g: 'Cetirizine HCl', f: 'Tablet', s: '10mg', m: 'Square Pharmaceuticals Ltd.', p: 3.50 },
      { b: 'Monas', g: 'Montelukast Sodium', f: 'Tablet', s: '10mg', m: 'Square Pharmaceuticals Ltd.', p: 16.00 },
      { b: 'Bizoran', g: 'Amlodipine + Olmesartan', f: 'Tablet', s: '5/20mg', m: 'Square Pharmaceuticals Ltd.', p: 12.00 },
      { b: 'Gluconor', g: 'Metformin HCl', f: 'Tablet', s: '500mg', m: 'Square Pharmaceuticals Ltd.', p: 4.00 },
      { b: 'Compath', g: 'Metformin + Sitagliptin', f: 'Tablet', s: '50/500mg', m: 'Incepta Pharmaceuticals Ltd.', p: 18.00 },
      { b: 'Sergel', g: 'Esomeprazole Magnesium', f: 'Capsule', s: '40mg', m: 'Healthcare Pharmaceuticals Ltd.', p: 12.00 },
      { b: 'Filwel Gold', g: 'Multivitamins & Multiminerals', f: 'Tablet', s: 'A-Z Formula', m: 'Square Pharmaceuticals Ltd.', p: 6.00 },
      { b: 'Bicozin', g: 'Vitamin B-Complex + Zinc', f: 'Syrup', s: '100ml', m: 'Square Pharmaceuticals Ltd.', p: 75.00 },
      { b: 'D-Rise', g: 'Cholecalciferol (Vitamin D3)', f: 'Capsule', s: '20000 IU', m: 'Popular Pharmaceuticals Ltd.', p: 30.00 },
      { b: 'Torax', g: 'Ketorolac Tromethamine', f: 'Tablet', s: '10mg', m: 'Square Pharmaceuticals Ltd.', p: 10.00 },
      { b: 'Clofenac', g: 'Diclofenac Sodium', f: 'Tablet', s: '50mg', m: 'Square Pharmaceuticals Ltd.', p: 4.50 },
      { b: 'Azmasol', g: 'Salbutamol HFA', f: 'Inhaler', s: '100mcg/puff', m: 'Beximco Pharmaceuticals Ltd.', p: 190.00 },
      { b: 'Ipec', g: 'Iron Polymaltose + Folic Acid', f: 'Tablet', s: 'Complex', m: 'Square Pharmaceuticals Ltd.', p: 7.00 },
      { b: 'Osartil', g: 'Losartan Potassium', f: 'Tablet', s: '50mg', m: 'Incepta Pharmaceuticals Ltd.', p: 8.00 },
      { b: 'Finix', g: 'Rabeprazole Sodium', f: 'Tablet', s: '20mg', m: 'Opsonin Pharma Ltd.', p: 7.00 },
      { b: 'Cef-3', g: 'Cefixime Trihydrate', f: 'Capsule', s: '200mg', m: 'Square Pharmaceuticals Ltd.', p: 40.00 },
      { b: 'Moxaclav', g: 'Amoxicillin + Clavulanic Acid', f: 'Tablet', s: '625mg', m: 'Square Pharmaceuticals Ltd.', p: 32.00 },
      { b: 'Rivotril', g: 'Clonazepam', f: 'Tablet', s: '0.5mg', m: 'Radiant Pharmaceuticals Ltd.', p: 7.50 },
      { b: 'Telfast', g: 'Fexofenadine HCl', f: 'Tablet', s: '180mg', m: 'Sanofi Bangladesh Ltd.', p: 14.00 },
      { b: 'Entacyd', g: 'Magaldrate + Simethicone', f: 'Suspension', s: '200ml', m: 'Square Pharmaceuticals Ltd.', p: 110.00 }
    ];

    const medicineIds = [];
    for (let i = 0; i < 300; i++) {
      const template = DRUG_NAMES[i % DRUG_NAMES.length];
      const brand = (i < DRUG_NAMES.length) ? template.b : `${template.b}-${Math.floor(i / DRUG_NAMES.length) + 1}`;
      const strength = (i % 2 === 0) ? template.s : `${parseFloat(template.s) * 2 || 100}mg`;
      const catId = getRandomItem(medCatIds);

      const mRes = await client.query(`
        INSERT INTO medicines (
          category_id, brand_name, generic_name, dosage_form, strength,
          manufacturer, unit_price, reorder_level, is_prescription_required, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 50, TRUE, TRUE)
        ON CONFLICT (brand_name, strength, dosage_form) DO NOTHING
        RETURNING medicine_id;
      `, [catId, brand, template.g, template.f, strength, template.m, template.p]);

      if (mRes.rows.length > 0) {
        medicineIds.push(mRes.rows[0].medicine_id);
      }
    }

    // Batches (100 batches)
    const batchIds = [];
    const adminUserRes = await client.query("SELECT user_id FROM users WHERE username = 'admin' LIMIT 1;");
    const adminUserId = adminUserRes.rows[0]?.user_id || 1;

    for (let b = 1; b <= 100; b++) {
      const medId = medicineIds[b % medicineIds.length] || medicineIds[0];
      const batchNo = `LOT-${2025000 + b}`;
      const cost = getRandomItem([2.50, 5.00, 10.00, 20.00, 45.00, 120.00]);
      const sell = parseFloat((cost * 1.35).toFixed(2));
      const initialQty = getRandomInt(100, 500);
      const currentQty = getRandomInt(20, initialQty);
      const expDate = getRandomDate(2026, 2029);

      const bRes = await client.query(`
        INSERT INTO medicine_batches (
          medicine_id, batch_number, manufacture_date, expiry_date,
          cost_price, selling_price, initial_quantity, current_quantity, is_active
        )
        VALUES ($1, $2, '2025-01-01', $3, $4, $5, $6, $7, TRUE)
        ON CONFLICT (medicine_id, batch_number) DO NOTHING
        RETURNING batch_id;
      `, [medId, batchNo, expDate, cost, sell, initialQty, currentQty]);

      if (bRes.rows.length > 0) {
        batchIds.push(bRes.rows[0].batch_id);

        // Record initial inventory purchase transaction
        const totalVal = parseFloat((initialQty * cost).toFixed(2));
        await client.query(`
          INSERT INTO inventory_transactions (
            batch_id, medicine_id, transaction_type, quantity, unit_price,
            total_amount, reference_type, reference_id, transaction_date, performed_by, notes
          )
          VALUES ($1, $2, 'Purchase', $3, $4, $5, 'PurchaseOrder', 1000 + $6, CURRENT_TIMESTAMP - INTERVAL '60 days', $7, 'Initial stock import from local pharmaceutical supplier')
          ON CONFLICT DO NOTHING;
        `, [bRes.rows[0].batch_id, medId, initialQty, cost, totalVal, b, adminUserId]);
      }
    }
    console.log(`✓ Seeded ${medicineIds.length} medicines and ${batchIds.length} active inventory batches.`);

    // ------------------------------------------------------------------------
    // Step 6: Patients (50 Patients - Bangladeshi Demographics)
    // ------------------------------------------------------------------------
    console.log('6. Seeding 50 Patients...');
    const patientIds = [];
    const patientValues = [];

    const BD_LOCALITIES = ['Dhanmondi', 'Gulshan', 'Banani', 'Mirpur', 'Uttara', 'Mohammadpur', 'Badda', 'Chashara', 'Agrabad', 'Zindabazar', 'Shaheb Bazar', 'Kandirpar'];

    for (let p = 1; p <= 50; p++) {
      const gender = getRandomItem(GENDERS);
      const fname = (gender === 'Male') ? getRandomItem(FIRST_NAMES_MALE) : getRandomItem(FIRST_NAMES_FEMALE);
      const lname = getRandomItem(LAST_NAMES);
      const pcode = `P-${10000 + p}`;
      const dob = getRandomDate(1945, 2018);
      const blood = getRandomItem(BLOOD_GROUPS);
      const phone = `+880-1${getRandomItem(['7', '8', '9', '6'])}${getRandomInt(10, 99)}-${String(p).padStart(6, '0')}`;
      const cleanFname = fname.toLowerCase().replace(/[^a-z]/g, '');
      const email = `patient.${p}.${cleanFname}@gmail.com`;
      const addr = `House ${getRandomInt(1, 60)}, Road ${getRandomInt(1, 27)}, ${getRandomItem(BD_LOCALITIES)}, ${getRandomItem(CITIES)}`;
      const emName = `${getRandomItem(FIRST_NAMES_FEMALE)} ${lname}`;
      const emPhone = `+880-1${getRandomItem(['7', '8', '9', '3'])}${getRandomInt(10, 99)}-${getRandomInt(100000, 999999)}`;

      patientValues.push(`('${pcode}', '${fname}', '${lname}', '${dob}', '${gender}', '${blood}', '${phone}', '${email}', '${addr}', '${emName}', '${emPhone}')`);
    }

    // Insert patients in chunks of 500
    for (let i = 0; i < patientValues.length; i += 500) {
      const chunk = patientValues.slice(i, i + 500);
      const q = `
        INSERT INTO patients (patient_code, first_name, last_name, date_of_birth, gender, blood_group, phone, email, address, emergency_contact_name, emergency_contact_phone)
        VALUES ${chunk.join(', ')}
        ON CONFLICT (patient_code) DO NOTHING
        RETURNING patient_id;
      `;
      const res = await client.query(q);
      res.rows.forEach(r => patientIds.push(r.patient_id));
    }
    console.log(`✓ Seeded ${patientIds.length} patients.`);

    // ------------------------------------------------------------------------
    // Step 7: Appointments (50 Appointments)
    // ------------------------------------------------------------------------
    console.log('7. Seeding 50 Appointments...');
    const appointmentIds = [];
    const apptValues = [];
    const APPT_TYPES = ['New', 'Follow-up', 'Routine', 'Emergency'];

    for (let a = 1; a <= 50; a++) {
      const apptNum = `APT-${20260000 + a}`;
      const pid = patientIds[(a - 1) % patientIds.length];
      const docId = getRandomItem(doctorIds);
      const deptId = getRandomItem(deptIds);
      const apptDate = getRandomDate(2025, 2026);
      const startHour = getRandomInt(9, 14);
      const isHalf = Math.random() < 0.5;
      const startTime = `${String(startHour).padStart(2, '0')}:${isHalf ? '30' : '00'}:00`;
      const endTime = isHalf ? `${String(startHour + 1).padStart(2, '0')}:00:00` : `${String(startHour).padStart(2, '0')}:30:00`;
      const apptType = getRandomItem(APPT_TYPES);
      const status = 'Completed';

      apptValues.push(`('${apptNum}', ${pid}, ${docId}, ${deptId}, '${apptDate}', '${startTime}', '${endTime}', '${apptType}', '${status}', 'Patient reported general discomfort and requested clinical review.', ${adminUserId})`);
    }

    // Insert appointments in chunks of 500
    for (let i = 0; i < apptValues.length; i += 500) {
      const chunk = apptValues.slice(i, i + 500);
      const q = `
        INSERT INTO appointments (appointment_number, patient_id, doctor_id, department_id, appointment_date, start_time, end_time, appointment_type, status, notes, created_by)
        VALUES ${chunk.join(', ')}
        ON CONFLICT (appointment_number) DO NOTHING
        RETURNING appointment_id;
      `;
      const res = await client.query(q);
      res.rows.forEach(r => appointmentIds.push(r.appointment_id));
    }
    console.log(`✓ Seeded ${appointmentIds.length} appointments.`);

    // ------------------------------------------------------------------------
    // Step 8: Consultations & Diagnoses (50 Consultations, 55 Diagnoses)
    // ------------------------------------------------------------------------
    console.log('8. Seeding 50 Consultations with 55 Diagnoses and Vitals...');
    const consultationIds = [];
    const diagRes = await client.query('SELECT diagnosis_id FROM diagnoses;');
    const diagnosisIds = diagRes.rows.map(d => d.diagnosis_id);

    const SYMPTOMS_LIST = [
      'High intermittent fever (103°F) for 4 days with severe retro-orbital headache and joint arthralgia (suspected Dengue).',
      'Persistent dry cough, wheezing, and seasonal bronchial asthma exacerbation due to winter dust and pollution.',
      'Chest tightness on moderate exertion radiating to left arm with profuse sweating (angina).',
      'Severe epigastric burning sensation, sour water brash, and postprandial nausea after spicy rich meals.',
      'Frequent watery loose motions (6-8 times/day), abdominal griping pain, and moderate dehydration.',
      'Elevated random blood sugar (14.2 mmol/L), polyuria, increased thirst, and unexplained weight loss.',
      'Severe sore throat, high fever, and painful bilateral cervical lymphadenopathy.',
      'Bilateral knee joint pain, morning stiffness lasting 45 minutes, and difficulty walking on stairs.'
    ];

    const PLANS = [
      'Advised oral rehydration salts (ORS), Paracetamol 500mg SOS, complete rest, and daily CBC monitoring for platelet count.',
      'Prescribed Esomeprazole 20mg before breakfast, antacid suspension after meals, and strict dietary oil restriction.',
      'Initiated Amlodipine 5mg + Olmesartan 20mg once daily; advised low sodium intake, morning walks, and weekly BP log.',
      'Started Azithromycin 500mg once daily for 5 days with Salbutamol inhaler; scheduled follow-up in 7 days.',
      'Adjusted Metformin to 500mg twice daily with meals; diabetic diet chart provided and HbA1c scheduled.'
    ];

    // Select completed appointments to link consultations
    const completedAppts = await client.query(`
      SELECT appointment_id, patient_id, doctor_id, appointment_date 
      FROM appointments 
      WHERE status = 'Completed' 
      ORDER BY appointment_id ASC
      LIMIT 50;
    `);

    for (let c = 0; c < completedAppts.rows.length; c++) {
      const appt = completedAppts.rows[c];
      const conNum = `CON-${20260000 + c + 1}`;
      const symptoms = getRandomItem(SYMPTOMS_LIST);
      const plan = getRandomItem(PLANS);
      const notes = `Clinical Assessment: Patient appears alert and oriented. Systemic examination reveals stable hemodynamics. ${symptoms}`;
      const vitals = JSON.stringify({
        bp_systolic: getRandomInt(110, 145),
        bp_diastolic: getRandomInt(70, 95),
        pulse: getRandomInt(65, 90),
        temperature_f: getRandomItem([98.4, 98.6, 99.1, 100.2]),
        weight_kg: getRandomInt(55, 95),
        spo2: getRandomInt(96, 100)
      });

      const cRes = await client.query(`
        INSERT INTO consultations (
          consultation_number, appointment_id, patient_id, doctor_id,
          consultation_date, symptoms, clinical_notes, treatment_plan, follow_up_date, vitals
        )
        VALUES ($1, $2, $3, $4, ($5::DATE + INTERVAL '10 hours'), $6, $7, $8, ($5::DATE + INTERVAL '14 days'), $9::jsonb)
        ON CONFLICT (consultation_number) DO NOTHING
        RETURNING consultation_id;
      `, [conNum, appt.appointment_id, appt.patient_id, appt.doctor_id, appt.appointment_date, symptoms, notes, plan, vitals]);

      if (cRes.rows.length > 0) {
        const conId = cRes.rows[0].consultation_id;
        consultationIds.push(conId);

        // Assign primary diagnosis (1 per consultation = 50 total)
        const diagId1 = diagnosisIds[c % diagnosisIds.length];
        await client.query(`
          INSERT INTO consultation_diagnoses (consultation_id, diagnosis_id, diagnosis_type, notes)
          VALUES ($1, $2, 'Primary', 'Clinical confirmation')
          ON CONFLICT DO NOTHING;
        `, [conId, diagId1]);

        // Assign secondary diagnosis for first 5 consultations (5 additional = 55 total)
        if (c < 5) {
          const diagId2 = diagnosisIds[(c + 7) % diagnosisIds.length];
          await client.query(`
            INSERT INTO consultation_diagnoses (consultation_id, diagnosis_id, diagnosis_type, notes)
            VALUES ($1, $2, 'Secondary', 'Associated condition')
            ON CONFLICT DO NOTHING;
          `, [conId, diagId2]);
        }
      }
    }
    console.log(`✓ Seeded ${consultationIds.length} clinical consultations with linked diagnoses.`);

    // ------------------------------------------------------------------------
    // Step 9: Inpatient Admissions & Bed Allocation (10 Admissions, 15 Bed Assignments)
    // ------------------------------------------------------------------------
    console.log('9. Seeding 10 Inpatient Admissions with 15 Bed Assignments...');
    const admissionIds = [];
    const REASONS = [
      'Severe Dengue fever with warning signs (platelet count < 50,000/mcL) for close inpatient fluid management.',
      'Acute exacerbation of bronchial asthma with severe bronchospasm requiring continuous nebulization and IV steroids.',
      'Hypertensive urgency with encephalopathy for monitored intravenous antihypertensive stabilization.',
      'Acute watery diarrhea and severe gastroenteritis with electrolyte imbalance requiring IV fluid resuscitation.',
      'Unstable angina pectoris admitted to CCU for continuous telemetry observation and coronary angiogram workup.',
      'Post-operative care following elective laparoscopic cholecystectomy for symptomatic cholelithiasis.'
    ];

    for (let adm = 1; adm <= 10; adm++) {
      const admNum = `ADM-${20260000 + adm}`;
      const pid = patientIds[(adm - 1) % patientIds.length];
      const docId = getRandomItem(doctorIds);
      const isCurrent = (adm > 6); // last 4 are active inpatients
      const admDate = isCurrent ? getRandomTimestamp(15, 1) : getRandomTimestamp(180, 20);
      const disDate = isCurrent ? null : new Date(new Date(admDate).getTime() + getRandomInt(2, 8) * 86400000).toISOString();
      const status = isCurrent ? 'Admitted' : 'Discharged';
      const reason = getRandomItem(REASONS);
      const summary = isCurrent ? null : 'Patient responded well to inpatient clinical management and was discharged in hemodynamically stable condition.';

      const aRes = await client.query(`
        INSERT INTO admissions (
          admission_number, patient_id, admitting_doctor_id, admission_date,
          discharge_date, admission_reason, discharge_summary, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (admission_number) DO NOTHING
        RETURNING admission_id;
      `, [admNum, pid, docId, admDate, disDate, reason, summary, status]);

      if (aRes.rows.length > 0) {
        const admissionId = aRes.rows[0].admission_id;
        admissionIds.push(admissionId);

        // Assign initial prior bed for first 5 admissions to record bed transfers (5 additional assignments)
        if (adm <= 5) {
          const prevBedId = bedIds[(adm + 30) % bedIds.length];
          const prevDate = new Date(new Date(admDate).getTime() - 2 * 86400000).toISOString();
          await client.query(`
            INSERT INTO bed_assignments (admission_id, bed_id, assigned_at, released_at, is_current, assigned_by, notes)
            VALUES ($1, $2, $3, $4, FALSE, $5, 'Initial bed before clinical ward transfer')
            ON CONFLICT DO NOTHING;
          `, [admissionId, prevBedId, prevDate, admDate, adminUserId]);
        }

        // Primary bed assignment (10 assignments total across all 10 admissions = 15 assignments total)
        const bedId = bedIds[(adm - 1) % bedIds.length];
        await client.query(`
          INSERT INTO bed_assignments (admission_id, bed_id, assigned_at, released_at, is_current, assigned_by, notes)
          VALUES ($1, $2, $3, $4, $5, $6, 'Standard admission bed allocation')
          ON CONFLICT DO NOTHING;
        `, [admissionId, bedId, admDate, disDate, isCurrent, adminUserId]);

        if (isCurrent) {
          await client.query("UPDATE beds SET status = 'Occupied' WHERE bed_id = $1;", [bedId]);
        }
      }
    }
    console.log(`✓ Seeded ${admissionIds.length} inpatient admissions with bed allocations.`);

    // ------------------------------------------------------------------------
    // Step 10: Prescriptions & Items (50 Prescriptions, 55 Items)
    // ------------------------------------------------------------------------
    console.log('10. Seeding 50 Prescriptions and 55 Prescription Items...');
    const prescriptionIds = [];
    const DOSAGES = ['500mg', '1 tablet', '20mg', '10ml', '1 capsule', '2 puffs'];
    const FREQS = ['1-0-1 after meals', '1-1-1 before meals', '0-0-1 at bedtime', '1-0-0 morning', 'SOS (as needed)'];

    for (let rx = 1; rx <= 50; rx++) {
      const rxNum = `RX-${20260000 + rx}`;
      const conId = consultationIds[rx % consultationIds.length] || null;
      const pid = patientIds[(rx - 1) % patientIds.length];
      const docId = getRandomItem(doctorIds);
      const status = getRandomItem(['Active', 'Dispensed', 'Dispensed', 'Partially Dispensed']);

      const rxRes = await client.query(`
        INSERT INTO prescriptions (prescription_number, consultation_id, patient_id, doctor_id, issue_date, status, notes)
        VALUES ($1, $2, $3, $4, CURRENT_DATE - INTERVAL '${getRandomInt(0, 120)} days', $5, 'Take medicines strictly as prescribed with plenty of water.')
        ON CONFLICT (prescription_number) DO NOTHING
        RETURNING prescription_id;
      `, [rxNum, conId, pid, docId, status]);

      if (rxRes.rows.length > 0) {
        const presId = rxRes.rows[0].prescription_id;
        prescriptionIds.push(presId);

        // 1st item for each prescription (50 items total)
        const medId1 = medicineIds[(rx - 1) % medicineIds.length];
        const duration = getRandomItem([5, 7, 10, 14, 30]);
        const presQty = (duration === 30) ? 30 : getRandomInt(10, 20);
        const dispQty = (status === 'Dispensed') ? presQty : (status === 'Partially Dispensed' ? Math.floor(presQty / 2) : 0);

        await client.query(`
          INSERT INTO prescription_items (
            prescription_id, medicine_id, dosage, frequency, duration_days,
            prescribed_quantity, dispensed_quantity, instructions
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'Follow doctor dosage advice')
          ON CONFLICT DO NOTHING;
        `, [presId, medId1, getRandomItem(DOSAGES), getRandomItem(FREQS), duration, presQty, dispQty]);

        // 2nd item for first 5 prescriptions (5 additional items = 55 total)
        if (rx <= 5) {
          const medId2 = medicineIds[(rx + 20) % medicineIds.length];
          await client.query(`
            INSERT INTO prescription_items (
              prescription_id, medicine_id, dosage, frequency, duration_days,
              prescribed_quantity, dispensed_quantity, instructions
            )
            VALUES ($1, $2, $3, $4, 7, 14, 0, 'Follow doctor dosage advice')
            ON CONFLICT DO NOTHING;
          `, [presId, medId2, getRandomItem(DOSAGES), getRandomItem(FREQS)]);
        }
      }
    }
    console.log(`✓ Seeded ${prescriptionIds.length} prescriptions with items.`);

    // ------------------------------------------------------------------------
    // Step 11: Laboratory Orders, Items, and Results (20 Orders, 20 Items, 20 Results)
    // ------------------------------------------------------------------------
    console.log('11. Seeding 20 Lab Orders, 20 Items, and 20 Test Results...');
    const labTestRes = await client.query('SELECT test_id, test_code, test_name, standard_fee, normal_range, units FROM lab_tests;');
    const labTests = labTestRes.rows;
    const labOrderIds = [];

    for (let lo = 1; lo <= 20; lo++) {
      const orderNum = `LBO-${20260000 + lo}`;
      const pid = patientIds[(lo - 1) % patientIds.length];
      const docId = getRandomItem(doctorIds);
      const conId = consultationIds[lo % consultationIds.length] || null;
      const status = 'Completed';
      const priority = getRandomItem(['Routine', 'Routine', 'Urgent', 'Emergency']);

      const oRes = await client.query(`
        INSERT INTO lab_orders (order_number, patient_id, doctor_id, consultation_id, order_date, status, priority)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP - INTERVAL '${getRandomInt(1, 150)} days', $5, $6)
        ON CONFLICT (order_number) DO NOTHING
        RETURNING order_id;
      `, [orderNum, pid, docId, conId, status, priority]);

      if (oRes.rows.length > 0) {
        const orderId = oRes.rows[0].order_id;
        labOrderIds.push(orderId);

        // Exactly 1 test per order = 20 items total
        const test = labTests[(lo - 1) % labTests.length];

        const itRes = await client.query(`
          INSERT INTO lab_order_items (order_id, test_id, item_fee, status, performed_by, result_summary)
          VALUES ($1, $2, $3, 'Completed', $4, 'Laboratory analysis completed with verified parameters.')
          RETURNING order_item_id;
        `, [orderId, test.test_id, test.standard_fee, staffIds[0]]);

        if (itRes.rows.length > 0) {
          const orderItemId = itRes.rows[0].order_item_id;
          const isAbnormal = (lo % 4 === 0);

          await client.query(`
            INSERT INTO lab_results (
              order_item_id, parameter_name, measured_value, unit,
              reference_range, is_abnormal, remarks, technician_id, verified_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT DO NOTHING;
          `, [
            orderItemId,
            test.test_name,
            isAbnormal ? '142.5 (High)' : '85.0 (Normal)',
            test.units || 'mg/dL',
            test.normal_range || '70-99',
            isAbnormal,
            isAbnormal ? 'Value elevated above standard reference threshold.' : 'Within normal physiological limits.',
            staffIds[0],
            docId
          ]);
        }
      }
    }
    console.log(`✓ Seeded ${labOrderIds.length} laboratory orders and test results.`);

    // ------------------------------------------------------------------------
    // Step 12: Invoices & Payments (100 Invoices, 100 Items, 150 Payments)
    // ------------------------------------------------------------------------
    console.log('12. Seeding 100 Invoices and 150 Payment Records...');
    const invoiceIds = [];

    for (let inv = 1; inv <= 100; inv++) {
      const invNum = `INV-${20260000 + inv}`;
      const pid = patientIds[(inv - 1) % patientIds.length];
      const admId = (inv <= 10) ? admissionIds[(inv - 1) % admissionIds.length] : null;
      const conId = (inv > 10 && inv <= 50) ? consultationIds[(inv - 11) % consultationIds.length] : null;
      const daysAgo = getRandomInt(1, 180);
      const subtotal = getRandomItem([500.00, 800.00, 1200.00, 2500.00, 4500.00, 8500.00, 15000.00]);
      const discount = (inv % 5 === 0) ? 200.00 : 0.00;
      const tax = parseFloat(((subtotal - discount) * 0.05).toFixed(2));
      const total = subtotal - discount + tax;

      // Status determination
      let status = 'Unpaid';
      let paid = 0.00;
      let balance = total;

      if (inv % 3 === 0) {
        status = 'Paid';
        paid = total;
        balance = 0.00;
      } else if (inv % 4 === 0) {
        status = 'Partially Paid';
        paid = parseFloat((total * 0.5).toFixed(2));
        balance = total - paid;
      }

      const invRes = await client.query(`
        INSERT INTO invoices (
          invoice_number, patient_id, admission_id, consultation_id, issue_date, due_date,
          subtotal, discount_amount, tax_amount, total_amount, paid_amount, balance_due,
          status, notes, created_by, created_at
        )
        VALUES (
          $1, $2, $3, $4, CURRENT_DATE - INTERVAL '${daysAgo} days', (CURRENT_DATE - INTERVAL '${daysAgo} days') + INTERVAL '14 days',
          $5, $6, $7, $8, $9, $10,
          $11, 'Patient billing statement (Apex Hospital Dhaka)', $12, CURRENT_TIMESTAMP - INTERVAL '${daysAgo} days'
        )
        ON CONFLICT (invoice_number) DO NOTHING
        RETURNING invoice_id;
      `, [invNum, pid, admId, conId, subtotal, discount, tax, total, paid, balance, status, adminUserId]);

      if (invRes.rows.length > 0) {
        const invoiceId = invRes.rows[0].invoice_id;
        invoiceIds.push({ id: invoiceId, patientId: pid, total, paid, status, daysAgo });

        // Add exactly 1 line item per invoice = 100 invoice_items total
        const itemNet = parseFloat((subtotal - discount).toFixed(2));
        await client.query(`
          INSERT INTO invoice_items (
            invoice_id, item_description, quantity, unit_price, discount, total_price, reference_type
          )
          VALUES ($1, 'Clinical Specialist Consultation & Hospital Services (Dhaka Facility)', 1, $2, $3, $4, 'Consultation')
          ON CONFLICT DO NOTHING;
        `, [invoiceId, subtotal, discount, itemNet]);
      }
    }

    // Generate 150 payment receipts
    console.log('12b. Generating 150 Payment Receipts...');
    let paymentCount = 0;
    const PAYMENT_METHODS = ['Cash', 'bKash', 'Nagad', 'Rocket', 'Debit Card', 'Credit Card', 'Bank Transfer'];

    for (let p = 1; p <= 150; p++) {
      const invObj = invoiceIds[(p - 1) % invoiceIds.length];
      if (!invObj) continue;

      const payNum = `PAY-${20260000 + p}`;
      const method = getRandomItem(PAYMENT_METHODS);
      const payAmount = (invObj.paid > 0) ? (invObj.paid / (p % 2 === 0 ? 2 : 1)) : 500.00;
      const amount = parseFloat(Math.max(100.00, Math.min(payAmount, 15000.00)).toFixed(2));
      const prefix = (method === 'bKash' ? 'BKH' : (method === 'Nagad' ? 'NGD' : (method === 'Rocket' ? 'RKT' : 'TXN')));
      const ref = `${prefix}-${getRandomInt(100000, 999999)}-${p}`;

      const payNotes = (method === 'Debit Card' ? 'Settlement receipt via DBBL NexusPay' : (method === 'Credit Card' ? 'Settlement receipt via Visa/Mastercard' : `Settlement receipt via ${method}`));
      await client.query(`
        INSERT INTO payments (
          payment_number, invoice_id, patient_id, payment_date,
          amount, payment_method, transaction_reference, received_by, notes
        )
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP - INTERVAL '${invObj.daysAgo} days', $4, $5, $6, $7, $8)
        ON CONFLICT (payment_number) DO NOTHING;
      `, [payNum, invObj.id, invObj.patientId, amount, method, ref, adminUserId, payNotes]);

      paymentCount++;
    }
    console.log(`✓ Seeded ${invoiceIds.length} invoices and ${paymentCount} payment receipts.`);

    // Re-enable triggers
    console.log('12c. Re-enabling database triggers for normal operational enforcement...');
    for (const tbl of triggerTables) {
      await client.query(`ALTER TABLE ${tbl} ENABLE TRIGGER USER;`);
    }

    // ------------------------------------------------------------------------
    // Step 13: Refresh Materialized Views
    // ------------------------------------------------------------------------
    console.log('13. Refreshing analytical materialized views...');
    await client.query('REFRESH MATERIALIZED VIEW mv_monthly_hospital_performance;');

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n🎉 SEEDING COMPLETED SUCCESSFULLY in ${duration} seconds!`);
    console.log('====================================================');
    console.log(`✓ Staff Accounts:      ${staffIds.length}`);
    console.log(`✓ Doctors:             ${doctorIds.length}`);
    console.log(`✓ Wards & Beds:        ${bedIds.length} Beds`);
    console.log(`✓ Medicines & Batches: ${medicineIds.length} Meds, ${batchIds.length} Batches`);
    console.log(`✓ Registered Patients: ${patientIds.length}`);
    console.log(`✓ Appointments:        ${appointmentIds.length}`);
    console.log(`✓ Consultations:       ${consultationIds.length}`);
    console.log(`✓ Inpatient Stays:     ${admissionIds.length}`);
    console.log(`✓ Lab Orders & Tests:  ${labOrderIds.length}`);
    console.log(`✓ Prescriptions:       ${prescriptionIds.length}`);
    console.log(`✓ Invoices:            ${invoiceIds.length}`);
    console.log(`✓ Payments:            ${paymentCount}`);
    console.log('====================================================\n');

  } catch (err) {
    console.error('❌ Error during data seeding:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runSeed();
