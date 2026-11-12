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

// Helper utilities for realistic synthetic data
const FIRST_NAMES_MALE = [
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles',
  'Daniel', 'Matthew', 'Anthony', 'Donald', 'Mark', 'Paul', 'Steven', 'Andrew', 'Kenneth', 'Joshua',
  'Kevin', 'Brian', 'George', 'Edward', 'Ronald', 'Timothy', 'Jason', 'Jeffrey', 'Ryan', 'Jacob',
  'Gary', 'Nicholas', 'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon', 'Benjamin',
  'Samuel', 'Gregory', 'Frank', 'Alexander', 'Raymond', 'Patrick', 'Jack', 'Dennis', 'Jerry', 'Tyler',
  'Aaron', 'Jose', 'Adam', 'Nathan', 'Henry', 'Douglas', 'Zachary', 'Peter', 'Kyle', 'Walter'
];

const FIRST_NAMES_FEMALE = [
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen',
  'Nancy', 'Lisa', 'Betty', 'Margaret', 'Sandra', 'Ashley', 'Kimberly', 'Emily', 'Donna', 'Michelle',
  'Dorothy', 'Carol', 'Amanda', 'Melissa', 'Deborah', 'Stephanie', 'Rebecca', 'Sharon', 'Laura', 'Cynthia',
  'Kathleen', 'Amy', 'Shirley', 'Angela', 'Helen', 'Anna', 'Brenda', 'Pamela', 'Nicole', 'Samantha',
  'Katherine', 'Christine', 'Debra', 'Rachel', 'Carolyn', 'Janet', 'Maria', 'Heather', 'Diane', 'Julie',
  'Joyce', 'Victoria', 'Kelly', 'Christina', 'Joan', 'Evelyn', 'Lauren', 'Judith', 'Olivia', 'Sophia'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['Male', 'Female'];
const CITIES = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'Austin'];

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
      { username: 'admin', role: 'Admin', email: 'admin@apex-hospital.org', dept: deptIds[0], fname: 'Arthur', lname: 'Pendleton' },
      { username: 'doctor1', role: 'Doctor', email: 'dr.smith@apex-hospital.org', dept: deptIds[0], fname: 'Edward', lname: 'Smith' },
      { username: 'receptionist1', role: 'Receptionist', email: 'reception@apex-hospital.org', dept: deptIds[0], fname: 'Emily', lname: 'Clark' },
      { username: 'accountant1', role: 'Accountant', email: 'finance@apex-hospital.org', dept: deptIds[0], fname: 'Walter', lname: 'Finley' },
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
        VALUES ($1, $2, $3, $4, 'Male', '1980-05-15', $5, $6, '2020-01-10', 'Active')
        ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name
        RETURNING staff_id;
      `, [uid, acc.dept, acc.fname, acc.lname, `+1-555-${getRandomInt(100, 999)}-${getRandomInt(1000, 9999)}`, acc.email]);
      
      const sid = sRes.rows[0].staff_id;
      staffIds.push(sid);

      if (acc.role === 'Doctor') {
        const dRes = await client.query(`
          INSERT INTO doctors (staff_id, department_id, specialization, license_number, consultation_fee, bio)
          VALUES ($1, $2, 'Consultant Cardiologist', 'MD-LIC-10001', 65.00, 'Chief Cardiologist with 15+ years experience in interventional cardiac care.')
          ON CONFLICT (license_number) DO NOTHING
          RETURNING doctor_id;
        `, [sid, acc.dept]);
        if (dRes.rows.length > 0) doctorIds.push(dRes.rows[0].doctor_id);
      }
    }

    // Generate remaining 93 staff to reach 100 staff, with 29 more doctors to reach 30 doctors total
    const SPECIALIZATIONS = [
      'Cardiology', 'Interventional Cardiology', 'Adult Neurology', 'Pediatric Neurology',
      'General Pediatrics', 'Pediatric Cardiology', 'Orthopedic Surgery', 'Joint Replacement',
      'Internal Medicine', 'Endocrinology', 'General Surgery', 'Laparoscopic Surgery',
      'Obstetrics & Gynecology', 'Fetal Medicine', 'Emergency Medicine', 'Critical Care'
    ];

    for (let i = 8; i <= 100; i++) {
      const isDoc = (i <= 36); // first 30 docs total
      const gender = getRandomItem(GENDERS);
      const fname = (gender === 'Male') ? getRandomItem(FIRST_NAMES_MALE) : getRandomItem(FIRST_NAMES_FEMALE);
      const lname = getRandomItem(LAST_NAMES);
      const username = `staff_${i}_${fname.toLowerCase()}`;
      const email = `${username}@apex-hospital.org`;
      const deptId = getRandomItem(deptIds);
      const phone = `+1-555-${getRandomInt(100, 999)}-${String(i).padStart(4, '0')}`;

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
          const licNum = `MD-LIC-${10000 + i}`;
          const fee = getRandomItem([40.00, 50.00, 60.00, 75.00, 90.00]);
          const spec = getRandomItem(SPECIALIZATIONS);
          const dRes = await client.query(`
            INSERT INTO doctors (staff_id, department_id, specialization, license_number, consultation_fee, bio)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (license_number) DO NOTHING
            RETURNING doctor_id;
          `, [sid, deptId, spec, licNum, fee, `Practicing specialist in ${spec} with board certification.`]);
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
          const rate = (roomType === 'Deluxe') ? 250.00 : (w.type === 'ICU' ? 450.00 : 75.00);
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
    // Step 5: Medicines & Batches (300 Medicines, 1,000 Batches)
    // ------------------------------------------------------------------------
    console.log('5. Seeding Formulary: 300 Medicines and 1,000 Batches...');
    const medCatRes = await client.query('SELECT category_id FROM medicine_categories;');
    const medCatIds = medCatRes.rows.map(c => c.category_id);

    const DRUG_NAMES = [
      { b: 'Amoxil', g: 'Amoxicillin', f: 'Capsule', s: '500mg', m: 'GlaxoSmithKline', p: 1.20 },
      { b: 'Augmentin', g: 'Amoxicillin + Clavulanate', f: 'Tablet', s: '625mg', m: 'GlaxoSmithKline', p: 2.50 },
      { b: 'Ciproxin', g: 'Ciprofloxacin', f: 'Tablet', s: '500mg', m: 'Bayer', p: 1.80 },
      { b: 'Zithromax', g: 'Azithromycin', f: 'Tablet', s: '500mg', m: 'Pfizer', p: 3.00 },
      { b: 'Panadol Extra', g: 'Paracetamol + Caffeine', f: 'Tablet', s: '500mg/65mg', m: 'GSK', p: 0.30 },
      { b: 'Brufen', g: 'Ibuprofen', f: 'Tablet', s: '400mg', m: 'Abbott', p: 0.50 },
      { b: 'Voltaren', g: 'Diclofenac Sodium', f: 'Tablet', s: '50mg', m: 'Novartis', p: 0.80 },
      { b: 'Tramal', g: 'Tramadol HCl', f: 'Capsule', s: '50mg', m: 'Grünenthal', p: 1.50 },
      { b: 'Lipitor', g: 'Atorvastatin', f: 'Tablet', s: '20mg', m: 'Pfizer', p: 1.40 },
      { b: 'Crestor', g: 'Rosuvastatin', f: 'Tablet', s: '10mg', m: 'AstraZeneca', p: 2.10 },
      { b: 'Norvasc', g: 'Amlodipine', f: 'Tablet', s: '5mg', m: 'Pfizer', p: 0.70 },
      { b: 'Cozaar', g: 'Losartan Potassium', f: 'Tablet', s: '50mg', m: 'Merck', p: 0.90 },
      { b: 'Tenormin', g: 'Atenolol', f: 'Tablet', s: '50mg', m: 'AstraZeneca', p: 0.60 },
      { b: 'Glucophage', g: 'Metformin HCl', f: 'Tablet', s: '500mg', m: 'Merck Serono', p: 0.40 },
      { b: 'Januvia', g: 'Sitagliptin', f: 'Tablet', s: '100mg', m: 'MSD', p: 3.50 },
      { b: 'Amaryl', g: 'Glimepiride', f: 'Tablet', s: '2mg', m: 'Sanofi', p: 0.75 },
      { b: 'Nexium', g: 'Esomeprazole', f: 'Capsule', s: '40mg', m: 'AstraZeneca', p: 1.80 },
      { b: 'Losec', g: 'Omeprazole', f: 'Capsule', s: '20mg', m: 'AstraZeneca', p: 0.60 },
      { b: 'Zantac', g: 'Famotidine', f: 'Tablet', s: '20mg', m: 'Boehringer', p: 0.50 },
      { b: 'Zyrtec', g: 'Cetirizine HCl', f: 'Tablet', s: '10mg', m: 'UCB', p: 0.45 },
      { b: 'Claritin', g: 'Loratadine', f: 'Tablet', s: '10mg', m: 'Bayer', p: 0.50 },
      { b: 'Ventolin', g: 'Salbutamol', f: 'Inhaler', s: '100mcg', m: 'GSK', p: 8.50 },
      { b: 'Seretide', g: 'Salmeterol + Fluticasone', f: 'Inhaler', s: '25/250mcg', m: 'GSK', p: 28.00 },
      { b: 'Neurobion', g: 'Vitamin B1 + B6 + B12', f: 'Tablet', s: 'Forte', m: 'P&G Health', p: 0.60 },
      { b: 'Centrum', g: 'Multivitamins + Minerals', f: 'Tablet', s: 'Adults', m: 'Pfizer', p: 0.40 },
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

    // Batches (1,000 batches)
    const batchIds = [];
    const adminUserRes = await client.query("SELECT user_id FROM users WHERE username = 'admin' LIMIT 1;");
    const adminUserId = adminUserRes.rows[0]?.user_id || 1;

    for (let b = 1; b <= 1000; b++) {
      const medId = medicineIds[b % medicineIds.length] || medicineIds[0];
      const batchNo = `LOT-${2025000 + b}`;
      const cost = getRandomItem([0.20, 0.50, 1.00, 2.00, 5.00]);
      const sell = cost * 1.5;
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
          VALUES ($1, $2, 'Purchase', $3, $4, $5, 'PurchaseOrder', 1000 + $6, CURRENT_TIMESTAMP - INTERVAL '60 days', $7, 'Initial stock import')
          ON CONFLICT DO NOTHING;
        `, [bRes.rows[0].batch_id, medId, initialQty, cost, totalVal, b, adminUserId]);
      }
    }
    console.log(`✓ Seeded ${medicineIds.length} medicines and ${batchIds.length} active inventory batches.`);

    // ------------------------------------------------------------------------
    // Step 6: Patients (1,500 Patients)
    // ------------------------------------------------------------------------
    console.log('6. Seeding 1,500 Patients...');
    const patientIds = [];
    const patientValues = [];

    for (let p = 1; p <= 1500; p++) {
      const gender = getRandomItem(GENDERS);
      const fname = (gender === 'Male') ? getRandomItem(FIRST_NAMES_MALE) : getRandomItem(FIRST_NAMES_FEMALE);
      const lname = getRandomItem(LAST_NAMES);
      const pcode = `P-${10000 + p}`;
      const dob = getRandomDate(1945, 2018);
      const blood = getRandomItem(BLOOD_GROUPS);
      const phone = `+1-${getRandomInt(200, 999)}-${getRandomInt(100, 999)}-${String(p).padStart(4, '0')}`;
      const email = `patient.${p}.${fname.toLowerCase()}@example.com`;
      const addr = `${getRandomInt(10, 999)} Oak Street, ${getRandomItem(CITIES)}`;
      const emName = `${getRandomItem(FIRST_NAMES_FEMALE)} ${lname}`;
      const emPhone = `+1-555-${getRandomInt(100, 999)}-${getRandomInt(1000, 9999)}`;

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
    // Step 7: Appointments (3,000 Appointments)
    // ------------------------------------------------------------------------
    console.log('7. Seeding 3,000 Appointments...');
    const appointmentIds = [];
    const apptValues = [];
    const APPT_TYPES = ['New', 'Follow-up', 'Routine', 'Emergency'];
    const APPT_STATUSES = ['Completed', 'Completed', 'Completed', 'Scheduled', 'Confirmed', 'Cancelled', 'No-Show'];

    for (let a = 1; a <= 3000; a++) {
      const apptNum = `APT-${20260000 + a}`;
      const pid = getRandomItem(patientIds);
      const docId = getRandomItem(doctorIds);
      const deptId = getRandomItem(deptIds);
      const apptDate = getRandomDate(2025, 2026);
      const startHour = getRandomInt(9, 14);
      const isHalf = Math.random() < 0.5;
      const startTime = `${String(startHour).padStart(2, '0')}:${isHalf ? '30' : '00'}:00`;
      const endTime = isHalf ? `${String(startHour + 1).padStart(2, '0')}:00:00` : `${String(startHour).padStart(2, '0')}:30:00`;
      const apptType = getRandomItem(APPT_TYPES);
      const status = (new Date(apptDate) < new Date('2026-03-01')) ? 'Completed' : getRandomItem(APPT_STATUSES);

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
    // Step 8: Consultations & Diagnoses (2,000 Consultations)
    // ------------------------------------------------------------------------
    console.log('8. Seeding 2,000 Consultations with Diagnoses and Vitals...');
    const consultationIds = [];
    const diagRes = await client.query('SELECT diagnosis_id FROM diagnoses;');
    const diagnosisIds = diagRes.rows.map(d => d.diagnosis_id);

    const SYMPTOMS_LIST = [
      'Persistent dry cough and mild fever for 3 days.',
      'Chest tightness on moderate exertion and occasional palpitations.',
      'Severe lower back pain radiating down left thigh.',
      'Recurrent headaches and photophobia in mornings.',
      'Epigastric burning sensation worsening after fatty meals.',
      'Polyuria, increased thirst, and unintentional weight loss.',
      'Sore throat, difficulty swallowing, and cervical lymphadenopathy.',
      'Joint stiffness and swelling in both knees on waking.'
    ];

    const PLANS = [
      'Prescribed anti-inflammatory regimen; advised rest and hydration.',
      'Initiated first-line antihypertensive therapy; scheduled follow-up in 14 days.',
      'Ordered comprehensive metabolic panel and dietary lifestyle modification.',
      'Recommended physical therapy twice weekly and ergonomic posture adjustments.',
      'Started antimicrobial course for 7 days; advised emergency visit if fever spikes.'
    ];

    // Select completed appointments to link consultations
    const completedAppts = await client.query(`
      SELECT appointment_id, patient_id, doctor_id, appointment_date 
      FROM appointments 
      WHERE status = 'Completed' 
      LIMIT 2000;
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

        // Assign 1-2 diagnoses
        const diagId1 = getRandomItem(diagnosisIds);
        await client.query(`
          INSERT INTO consultation_diagnoses (consultation_id, diagnosis_id, diagnosis_type, notes)
          VALUES ($1, $2, 'Primary', 'Clinical confirmation')
          ON CONFLICT DO NOTHING;
        `, [conId, diagId1]);

        if (c % 2 === 0) {
          const diagId2 = getRandomItem(diagnosisIds);
          if (diagId2 !== diagId1) {
            await client.query(`
              INSERT INTO consultation_diagnoses (consultation_id, diagnosis_id, diagnosis_type, notes)
              VALUES ($1, $2, 'Secondary', 'Associated condition')
              ON CONFLICT DO NOTHING;
            `, [conId, diagId2]);
          }
        }
      }
    }
    console.log(`✓ Seeded ${consultationIds.length} clinical consultations with linked diagnoses.`);

    // ------------------------------------------------------------------------
    // Step 9: Inpatient Admissions & Bed Allocation (300 Admissions)
    // ------------------------------------------------------------------------
    console.log('9. Seeding 300 Inpatient Admissions with Bed Assignments...');
    const admissionIds = [];
    const REASONS = [
      'Acute exacerbation of chronic obstructive pulmonary disease requiring IV steroids.',
      'Hypertensive urgency with encephalopathy for monitored stabilization.',
      'Elective laparoscopic cholecystectomy post-operative monitoring.',
      'Severe acute pyelonephritis requiring intravenous antibiotics.',
      'Unstable angina pectoris for telemetry observation and coronary workup.',
      'Post-trauma closed fracture reduction and observation.'
    ];

    for (let adm = 1; adm <= 300; adm++) {
      const admNum = `ADM-${20260000 + adm}`;
      const pid = patientIds[adm % patientIds.length];
      const docId = getRandomItem(doctorIds);
      const isCurrent = (adm > 250); // last 50 are active inpatients
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

        // Assign a bed
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
    // Step 10: Prescriptions & Items (1,000 Prescriptions, 2,500 Items)
    // ------------------------------------------------------------------------
    console.log('10. Seeding 1,000 Prescriptions and 2,500 Prescription Items...');
    const prescriptionIds = [];
    const DOSAGES = ['500mg', '1 tablet', '20mg', '10ml', '1 capsule', '2 puffs'];
    const FREQS = ['1-0-1 after meals', '1-1-1 before meals', '0-0-1 at bedtime', '1-0-0 morning', 'SOS (as needed)'];

    for (let rx = 1; rx <= 1000; rx++) {
      const rxNum = `RX-${20260000 + rx}`;
      const conId = consultationIds[rx % consultationIds.length] || null;
      const pid = patientIds[rx % patientIds.length];
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

        // Add 2-3 items per prescription
        const itemCount = getRandomInt(2, 3);
        for (let it = 0; it < itemCount; it++) {
          const medId = getRandomItem(medicineIds);
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
          `, [presId, medId, getRandomItem(DOSAGES), getRandomItem(FREQS), duration, presQty, dispQty]);
        }
      }
    }
    console.log(`✓ Seeded ${prescriptionIds.length} prescriptions with items.`);

    // ------------------------------------------------------------------------
    // Step 11: Laboratory Orders, Items, and Results (500 Orders, 1,200 Items)
    // ------------------------------------------------------------------------
    console.log('11. Seeding 500 Lab Orders with Items and Results...');
    const labTestRes = await client.query('SELECT test_id, test_code, test_name, standard_fee, normal_range, units FROM lab_tests;');
    const labTests = labTestRes.rows;
    const labOrderIds = [];

    for (let lo = 1; lo <= 500; lo++) {
      const orderNum = `LBO-${20260000 + lo}`;
      const pid = patientIds[lo % patientIds.length];
      const docId = getRandomItem(doctorIds);
      const conId = consultationIds[lo % consultationIds.length] || null;
      const status = (lo < 400) ? 'Completed' : getRandomItem(['Ordered', 'In Progress']);
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

        // Add 1-3 test items
        const numTests = getRandomInt(1, 3);
        for (let t = 0; t < numTests; t++) {
          const test = getRandomItem(labTests);
          const itemStatus = (status === 'Completed') ? 'Completed' : 'Pending';

          const itRes = await client.query(`
            INSERT INTO lab_order_items (order_id, test_id, item_fee, status, performed_by, result_summary)
            VALUES ($1, $2, $3, $4, $5, 'Laboratory analysis completed with verified parameters.')
            RETURNING order_item_id;
          `, [orderId, test.test_id, test.standard_fee, itemStatus, staffIds[0]]);

          if (itRes.rows.length > 0 && status === 'Completed') {
            const orderItemId = itRes.rows[0].order_item_id;
            const isAbnormal = (Math.random() < 0.2); // 20% abnormal rate

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
    }
    console.log(`✓ Seeded ${labOrderIds.length} laboratory orders and test results.`);

    // ------------------------------------------------------------------------
    // Step 12: Invoices & Payments (2,000 Invoices, 3,000 Payments)
    // ------------------------------------------------------------------------
    console.log('12. Seeding 2,000 Invoices and 3,000 Payment Records...');
    const invoiceIds = [];

    for (let inv = 1; inv <= 2000; inv++) {
      const invNum = `INV-${20260000 + inv}`;
      const pid = patientIds[inv % patientIds.length];
      const admId = (inv <= 250) ? admissionIds[inv % admissionIds.length] : null;
      const conId = (inv > 250 && inv <= 1500) ? consultationIds[inv % consultationIds.length] : null;
      const daysAgo = getRandomInt(1, 180);
      const subtotal = getRandomItem([50.00, 75.00, 120.00, 250.00, 480.00, 950.00]);
      const discount = (inv % 5 === 0) ? 10.00 : 0.00;
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
          $11, 'Standard patient billing statement', $12, CURRENT_TIMESTAMP - INTERVAL '${daysAgo} days'
        )
        ON CONFLICT (invoice_number) DO NOTHING
        RETURNING invoice_id;
      `, [invNum, pid, admId, conId, subtotal, discount, tax, total, paid, balance, status, adminUserId]);

      if (invRes.rows.length > 0) {
        const invoiceId = invRes.rows[0].invoice_id;
        invoiceIds.push({ id: invoiceId, patientId: pid, total, paid, status, daysAgo });

        // Add line item
        const itemNet = parseFloat((subtotal - discount).toFixed(2));
        await client.query(`
          INSERT INTO invoice_items (
            invoice_id, item_description, quantity, unit_price, discount, total_price, reference_type
          )
          VALUES ($1, 'Clinical Healthcare & Diagnostic Hospital Services', 1, $2, $3, $4, 'Consultation')
          ON CONFLICT DO NOTHING;
        `, [invoiceId, subtotal, discount, itemNet]);
      }
    }

    // Generate 3,000 payment receipts
    console.log('12b. Generating 3,000 Payment Receipts...');
    let paymentCount = 0;
    const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'MFS/bKash', 'Bank Transfer', 'Insurance'];

    for (let p = 1; p <= 3000; p++) {
      const invObj = invoiceIds[p % invoiceIds.length];
      if (!invObj) continue;

      const payNum = `PAY-${20260000 + p}`;
      const method = getRandomItem(PAYMENT_METHODS);
      const payAmount = (invObj.paid > 0) ? (invObj.paid / (p % 2 === 0 ? 2 : 1)) : 25.00;
      const amount = parseFloat(Math.max(10.00, Math.min(payAmount, 500.00)).toFixed(2));
      const ref = `TXN-${getRandomInt(100000, 999999)}-${p}`;

      await client.query(`
        INSERT INTO payments (
          payment_number, invoice_id, patient_id, payment_date,
          amount, payment_method, transaction_reference, received_by, notes
        )
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP - INTERVAL '${invObj.daysAgo} days', $4, $5, $6, $7, 'Settlement receipt')
        ON CONFLICT (payment_number) DO NOTHING;
      `, [payNum, invObj.id, invObj.patientId, amount, method, ref, adminUserId]);

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
