# Hospital Management System (HMS) - Relational Schema & Data Dictionary

## 1. System Overview & Architecture Principles

The **Hospital Management System (HMS)** database is engineered in strict compliance with the **Third Normal Form (3NF)** and BCNF where appropriate, ensuring transactional integrity, zero redundancy, and full referential consistency across all operational workflows.

### Core Architectural Decisions:
1. **Surrogate Primary Keys:** Every independent entity utilizes an auto-incrementing integer or bigint identity surrogate key (`SERIAL` / `BIGSERIAL`) to optimize foreign key join performance.
2. **Natural / Business Keys:** Enforced via `UNIQUE` constraints (e.g., `patient_code`, `appointment_number`, `license_number`, `invoice_number`, `prescription_number`).
3. **Composite Primary Keys:** Used in junction tables establishing many-to-many relationships (e.g., `user_roles(user_id, role_id)`, `consultation_diagnoses(consultation_id, diagnosis_id)`).
4. **Temporal Integrity:** Standardized with `TIMESTAMPTZ` for all timestamps (`created_at`, `updated_at`, `admission_date`, `discharge_date`), preventing timezone ambiguity.
5. **Auditing & Tracing:** Centralized `audit_logs` table powered by PostgreSQL triggers capturing `OLD` and `NEW` row snapshots in `JSONB`.
6. **Soft Deletion:** Core master entities (`patients`, `doctors`, `departments`, `medicines`, `lab_tests`) feature `is_active BOOLEAN DEFAULT TRUE` to prevent cascading loss of historical clinical/billing records.
7. **Money & Arithmetic:** All financial columns (`consultation_fee`, `unit_price`, `total_amount`, `subtotal`, `daily_rate`) employ `NUMERIC(12, 2)` or `NUMERIC(10, 2)` to eliminate floating-point rounding inaccuracies.

---

## 2. Normalization Analysis & Formal Proofs

### 2.1 First Normal Form (1NF) Compliance
* **Atomic Attributes:** Every column stores strictly atomic, scalar values (single integers, strings, dates, or numeric quantities). Complex structures (such as vitals) are structured with explicit validation or JSONB for semi-structured device feeds, while core relational data is fully decomposed.
* **No Repeating Groups:** Multi-valued attributes such as multiple phone numbers, multiple prescription medicines, or multiple diagnoses per consultation are factored into child tables (`consultation_diagnoses`, `prescription_items`, `invoice_items`, `lab_order_items`).
* **Uniquely Identifiable Rows:** Every relation defines a primary key constraint.

### 2.2 Second Normal Form (2NF) Compliance
* A relation is in 2NF if it is in 1NF and every non-prime attribute is fully functionally dependent on the entire primary key (no partial key dependencies).
* For tables with single-column primary keys, partial dependency is impossible.
* For tables with composite primary keys:
  * `user_roles(user_id, role_id)`: Non-prime attribute `assigned_at` depends on the combination of `(user_id, role_id)`.
  * `consultation_diagnoses(consultation_id, diagnosis_id)`: Non-prime attributes `diagnosis_type` and `notes` depend strictly on both the consultation and the diagnosis assigned.

### 2.3 Third Normal Form (3NF) Compliance
* A relation is in 3NF if it is in 2NF and no non-prime attribute is transitively dependent on the primary key ($X \rightarrow Y$ and $Y \rightarrow Z$).
* **Staff vs. Doctors Decomposition:** Rather than embedding doctor specialization, license number, and consultation fee inside `staff` or `users` (which would cause transitive dependencies through `user_id -> staff_id -> doctor_id`), these are cleanly split into three distinct relations:
  - `users`: Authentication credentials only.
  - `staff`: Physical person and employment details.
  - `doctors`: Clinical credentialing and physician attributes.
* **Wards, Rooms, and Beds Hierarchy:**
  - `wards` holds ward-level information (`ward_type`, `department_id`).
  - `rooms` references `ward_id` and holds `room_number`, `room_type`.
  - `beds` references `room_id` and holds `bed_number`, `daily_rate`, `status`.
  - No bed-level record redundantly stores ward details, eliminating transitive dependencies.
* **Pricing & Invoicing:**
  - `services` and `medicines` maintain standard catalog rates.
  - `invoice_items` captures the point-in-time billed `unit_price` so that future catalog rate revisions do not retroactively alter historic financial statements.

---

## 3. Entity-by-Entity Data Dictionary

### Module 1: Authentication & Organization

#### 1. `roles`
Stores authorization roles within the hospital.
* **Primary Key:** `role_id`
* **Relationships:** One-to-Many with `user_roles`.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `role_id` | SERIAL | PRIMARY KEY | Unique role identifier |
| `role_name` | VARCHAR(50) | NOT NULL, UNIQUE | Role name (Admin, Doctor, Nurse, Pharmacist, LabTechnician, Receptionist, Accountant) |
| `description` | VARCHAR(255) | NULL | Functional description of the role |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | System creation timestamp |

#### 2. `users`
Core user credentials for role-based authentication.
* **Primary Key:** `user_id`
* **Relationships:** One-to-Many with `user_roles`, One-to-One with `staff`, One-to-Many with `audit_logs`.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `user_id` | SERIAL | PRIMARY KEY | Unique user identifier |
| `username` | VARCHAR(50) | NOT NULL, UNIQUE | Unique login username |
| `email` | VARCHAR(100) | NOT NULL, UNIQUE | User email address |
| `password_hash` | VARCHAR(255) | NOT NULL | Secure bcrypt/argon2 password hash |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | User active status |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

#### 3. `user_roles`
Junction table linking users to roles (Composite Primary Key).
* **Composite Primary Key:** `(user_id, role_id)`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `user_id` | INT | NOT NULL, FK -> `users(user_id)` ON DELETE CASCADE | Target user |
| `role_id` | INT | NOT NULL, FK -> `roles(role_id)` ON DELETE RESTRICT | Assigned role |
| `assigned_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp role was assigned |

#### 4. `departments`
Hospital departments (e.g., Cardiology, Neurology, Pediatrics, Orthopedics).
* **Primary Key:** `department_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `department_id` | SERIAL | PRIMARY KEY | Unique department identifier |
| `department_name` | VARCHAR(100) | NOT NULL, UNIQUE | Name of hospital department |
| `code` | VARCHAR(10) | NOT NULL, UNIQUE | Short code (e.g., CARD, NEUR, PEDI) |
| `description` | TEXT | NULL | Department scope and description |
| `head_doctor_id` | INT | NULL | FK to `doctors(doctor_id)` ON DELETE SET NULL |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Status flag |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

#### 5. `staff`
Demographic and employment details of hospital personnel.
* **Primary Key:** `staff_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `staff_id` | SERIAL | PRIMARY KEY | Unique staff identifier |
| `user_id` | INT | UNIQUE, FK -> `users(user_id)` ON DELETE SET NULL | Linked user account |
| `department_id` | INT | NOT NULL, FK -> `departments(department_id)` | Assigned department |
| `first_name` | VARCHAR(50) | NOT NULL | First name |
| `last_name` | VARCHAR(50) | NOT NULL | Last name |
| `gender` | VARCHAR(10) | CHECK (gender IN ('Male', 'Female', 'Other')) | Gender |
| `date_of_birth` | DATE | NOT NULL | Date of birth |
| `phone` | VARCHAR(20) | NOT NULL, UNIQUE | Contact phone number |
| `email` | VARCHAR(100) | NOT NULL, UNIQUE | Work contact email |
| `hire_date` | DATE | NOT NULL, DEFAULT CURRENT_DATE | Date hired |
| `employment_status` | VARCHAR(20) | NOT NULL, DEFAULT 'Active' | Status ('Active', 'On Leave', 'Terminated') |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

#### 6. `doctors`
Medical practitioner credentials, specialization, and consultation parameters.
* **Primary Key:** `doctor_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `doctor_id` | SERIAL | PRIMARY KEY | Unique doctor identifier |
| `staff_id` | INT | NOT NULL, UNIQUE, FK -> `staff(staff_id)` ON DELETE CASCADE | Associated staff profile |
| `department_id` | INT | NOT NULL, FK -> `departments(department_id)` | Primary department |
| `specialization` | VARCHAR(100) | NOT NULL | Specialization area |
| `license_number` | VARCHAR(50) | NOT NULL, UNIQUE | Medical Board license number |
| `consultation_fee` | NUMERIC(10, 2) | NOT NULL, CHECK (consultation_fee >= 0) | Standard consultation fee |
| `bio` | TEXT | NULL | Professional biography |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Active physician flag |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

#### 7. `doctor_schedules`
Weekly recurring availability templates for scheduling appointments.
* **Primary Key:** `schedule_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `schedule_id` | SERIAL | PRIMARY KEY | Unique schedule identifier |
| `doctor_id` | INT | NOT NULL, FK -> `doctors(doctor_id)` ON DELETE CASCADE | Assigned doctor |
| `day_of_week` | SMALLINT | NOT NULL, CHECK (day_of_week BETWEEN 0 AND 6) | 0=Sunday, 1=Monday, ..., 6=Saturday |
| `start_time` | TIME | NOT NULL | Clinic shift start time |
| `end_time` | TIME | NOT NULL, CHECK (end_time > start_time) | Clinic shift end time |
| `slot_duration_minutes` | INT | NOT NULL, DEFAULT 20, CHECK (slot_duration_minutes > 0) | Time per patient consultation |
| `max_patients` | INT | NOT NULL, DEFAULT 25, CHECK (max_patients > 0) | Maximum bookings per shift |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Status flag |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

---

### Module 2 & 4 & 5: Patients, Appointments, Consultations & Records

#### 8. `patients`
Central master registry of all hospital patients.
* **Primary Key:** `patient_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `patient_id` | SERIAL | PRIMARY KEY | System surrogate identifier |
| `patient_code` | VARCHAR(20) | NOT NULL, UNIQUE | Human-readable patient ID (e.g., P-10001) |
| `first_name` | VARCHAR(50) | NOT NULL | Given name |
| `last_name` | VARCHAR(50) | NOT NULL | Family name |
| `date_of_birth` | DATE | NOT NULL | Birth date |
| `gender` | VARCHAR(10) | NOT NULL, CHECK (gender IN ('Male', 'Female', 'Other')) | Gender |
| `blood_group` | VARCHAR(5) | NULL, CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')) | Blood type |
| `phone` | VARCHAR(20) | NOT NULL, UNIQUE | Mobile contact number |
| `email` | VARCHAR(100) | NULL | Email address |
| `address` | TEXT | NULL | Residential street address |
| `emergency_contact_name` | VARCHAR(100) | NOT NULL | Emergency contact person |
| `emergency_contact_phone` | VARCHAR(20) | NOT NULL | Emergency contact phone number |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Soft delete status |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Registration date |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

#### 9. `appointments`
Outpatient appointment bookings linking patients, doctors, and time slots.
* **Primary Key:** `appointment_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `appointment_id` | SERIAL | PRIMARY KEY | Surrogate identifier |
| `appointment_number` | VARCHAR(25) | NOT NULL, UNIQUE | Human-readable booking code (e.g., APT-2026-0001) |
| `patient_id` | INT | NOT NULL, FK -> `patients(patient_id)` ON DELETE RESTRICT | Patient booking |
| `doctor_id` | INT | NOT NULL, FK -> `doctors(doctor_id)` ON DELETE RESTRICT | Target doctor |
| `department_id` | INT | NOT NULL, FK -> `departments(department_id)` | Medical department |
| `appointment_date` | DATE | NOT NULL | Scheduled appointment date |
| `start_time` | TIME | NOT NULL | Scheduled slot start time |
| `end_time` | TIME | NOT NULL, CHECK (end_time > start_time) | Slot end time |
| `appointment_type` | VARCHAR(20) | NOT NULL, DEFAULT 'Routine' | Type ('New', 'Follow-up', 'Routine', 'Emergency') |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'Scheduled' | 'Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'No-Show' |
| `notes` | TEXT | NULL | Reception / patient symptoms |
| `created_by` | INT | NULL, FK -> `users(user_id)` | Creating receptionist / user |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

#### 10. `consultations`
Clinical encounter documentation created by the attending doctor.
* **Primary Key:** `consultation_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `consultation_id` | SERIAL | PRIMARY KEY | Unique consultation ID |
| `consultation_number` | VARCHAR(25) | NOT NULL, UNIQUE | Clinical encounter number (CON-XXXX) |
| `appointment_id` | INT | NULL, UNIQUE, FK -> `appointments(appointment_id)` | Optional linked appointment |
| `patient_id` | INT | NOT NULL, FK -> `patients(patient_id)` | Patient examined |
| `doctor_id` | INT | NOT NULL, FK -> `doctors(doctor_id)` | Physician conducting encounter |
| `consultation_date` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp of consultation |
| `symptoms` | TEXT | NOT NULL | Presenting complaints & symptoms |
| `clinical_notes` | TEXT | NOT NULL | Physical examination & assessment notes |
| `treatment_plan` | TEXT | NULL | Management plan |
| `follow_up_date` | DATE | NULL | Recommended follow up date |
| `vitals` | JSONB | NULL | Vital signs: `{bp_systolic, bp_diastolic, pulse, temp_f, weight_kg, spo2}` |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

#### 11. `diagnoses`
Standardized clinical diagnosis classification catalog (ICD-10 aligned).
* **Primary Key:** `diagnosis_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `diagnosis_id` | SERIAL | PRIMARY KEY | Unique diagnosis catalog ID |
| `icd_code` | VARCHAR(15) | NOT NULL, UNIQUE | ICD-10/11 standard code (e.g., I10, E11.9) |
| `diagnosis_name` | VARCHAR(200) | NOT NULL | Clinical condition name |
| `description` | TEXT | NULL | Clinical condition details |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Catalog status |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

#### 12. `consultation_diagnoses`
Junction table linking consultations to multiple diagnoses (Composite PK).
* **Composite Primary Key:** `(consultation_id, diagnosis_id)`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `consultation_id` | INT | NOT NULL, FK -> `consultations(consultation_id)` ON DELETE CASCADE | Associated encounter |
| `diagnosis_id` | INT | NOT NULL, FK -> `diagnoses(diagnosis_id)` ON DELETE RESTRICT | Diagnosis entry |
| `diagnosis_type` | VARCHAR(20) | NOT NULL, DEFAULT 'Primary' | Type ('Primary', 'Secondary', 'Differential') |
| `notes` | TEXT | NULL | Physician clinical remarks |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Linked timestamp |

#### 13. `medical_records`
Patient document registry (imaging files, external discharge summaries, biopsy PDFs).
* **Primary Key:** `record_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `record_id` | SERIAL | PRIMARY KEY | Document identifier |
| `patient_id` | INT | NOT NULL, FK -> `patients(patient_id)` ON DELETE CASCADE | Subject patient |
| `record_type` | VARCHAR(50) | NOT NULL | Type ('LabReport', 'DischargeSummary', 'Radiology', 'Pathology', 'History') |
| `title` | VARCHAR(150) | NOT NULL | Document title |
| `description` | TEXT | NULL | Detailed notes |
| `file_url` | VARCHAR(255) | NULL | Storage URI / path |
| `recorded_by` | INT | NOT NULL, FK -> `users(user_id)` | Staff member who uploaded document |
| `recorded_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Document effective date |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | System entry timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Update timestamp |

---

### Module 6: Inpatient Admission & Bed Management

#### 14. `wards`
Inpatient wards grouped by medical disciplines.
* **Primary Key:** `ward_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `ward_id` | SERIAL | PRIMARY KEY | Ward surrogate ID |
| `ward_name` | VARCHAR(100) | NOT NULL, UNIQUE | Ward designation (e.g., 'Cardiology Ward 3B') |
| `ward_type` | VARCHAR(30) | NOT NULL | Type ('General', 'ICU', 'CCU', 'Pediatric', 'Maternity', 'Surgical', 'Orthopedic') |
| `department_id` | INT | NOT NULL, FK -> `departments(department_id)` | Supervising department |
| `total_beds` | INT | NOT NULL, DEFAULT 0, CHECK (total_beds >= 0) | Capacity count |
| `gender_preference` | VARCHAR(10) | NOT NULL, DEFAULT 'Any' | 'Any', 'Male', 'Female' |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Active flag |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

#### 15. `rooms`
Rooms partitioned inside specific wards.
* **Primary Key:** `room_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `room_id` | SERIAL | PRIMARY KEY | Unique room ID |
| `ward_id` | INT | NOT NULL, FK -> `wards(ward_id)` ON DELETE CASCADE | Parent ward |
| `room_number` | VARCHAR(20) | NOT NULL | Physical room number (e.g., 301, 302-A) |
| `room_type` | VARCHAR(30) | NOT NULL, DEFAULT 'Standard' | 'Standard', 'Deluxe', 'Isolation', 'Semi-Private' |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

#### 16. `beds`
Individual hospital beds with live occupancy status and billing rates.
* **Primary Key:** `bed_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `bed_id` | SERIAL | PRIMARY KEY | Bed surrogate key |
| `room_id` | INT | NOT NULL, FK -> `rooms(room_id)` ON DELETE CASCADE | Parent room |
| `bed_number` | VARCHAR(20) | NOT NULL | Bed label (e.g., 'B-01', 'ICU-3') |
| `daily_rate` | NUMERIC(10, 2) | NOT NULL, CHECK (daily_rate >= 0) | Per-day occupancy charge |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'Available' | 'Available', 'Occupied', 'Maintenance', 'Reserved' |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Status flag |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

#### 17. `admissions`
Inpatient hospital stay records.
* **Primary Key:** `admission_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `admission_id` | SERIAL | PRIMARY KEY | Inpatient admission ID |
| `admission_number` | VARCHAR(25) | NOT NULL, UNIQUE | Admission code (ADM-2026-0001) |
| `patient_id` | INT | NOT NULL, FK -> `patients(patient_id)` ON DELETE RESTRICT | Inpatient |
| `admitting_doctor_id` | INT | NOT NULL, FK -> `doctors(doctor_id)` | Primary attending physician |
| `admission_date` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Admission timestamp |
| `discharge_date` | TIMESTAMPTZ | NULL | Actual discharge timestamp |
| `admission_reason` | TEXT | NOT NULL | Reason for admission |
| `discharge_summary` | TEXT | NULL | Final summary upon discharge |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'Admitted' | 'Admitted', 'Discharged', 'Transferred', 'Cancelled' |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

#### 18. `bed_assignments`
Historical and active allocation of beds to admissions.
* **Primary Key:** `assignment_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `assignment_id` | SERIAL | PRIMARY KEY | Bed allocation event ID |
| `admission_id` | INT | NOT NULL, FK -> `admissions(admission_id)` ON DELETE CASCADE | Associated stay |
| `bed_id` | INT | NOT NULL, FK -> `beds(bed_id)` ON DELETE RESTRICT | Bed allocated |
| `assigned_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Start of bed occupancy |
| `released_at` | TIMESTAMPTZ | NULL | Vacated timestamp |
| `is_current` | BOOLEAN | NOT NULL, DEFAULT TRUE | True if active assignment |
| `assigned_by` | INT | NOT NULL, FK -> `users(user_id)` | Staff initiating allocation |
| `notes` | TEXT | NULL | Transfer or allocation remarks |

---

### Module 7: Laboratory Management

#### 19. `lab_test_categories`
Classification groups for diagnostic tests (e.g., Hematology, Biochemistry, Microbiology, Radiology).
* **Primary Key:** `category_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `category_id` | SERIAL | PRIMARY KEY | Category ID |
| `category_name` | VARCHAR(100) | NOT NULL, UNIQUE | Category title |
| `description` | TEXT | NULL | Details |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

#### 20. `lab_tests`
Master catalog of diagnostic lab tests.
* **Primary Key:** `test_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `test_id` | SERIAL | PRIMARY KEY | Test surrogate ID |
| `category_id` | INT | NOT NULL, FK -> `lab_test_categories(category_id)` | Category |
| `test_code` | VARCHAR(20) | NOT NULL, UNIQUE | Test code (e.g., CBC, LFT, LIPID, FBS) |
| `test_name` | VARCHAR(150) | NOT NULL | Test name |
| `description` | TEXT | NULL | Clinical purpose |
| `standard_fee` | NUMERIC(10, 2) | NOT NULL, CHECK (standard_fee >= 0) | Charge fee |
| `normal_range` | VARCHAR(100) | NULL | Standard baseline values |
| `units` | VARCHAR(30) | NULL | Measured unit (mg/dL, g/dL, cells/mcL) |
| `sample_type` | VARCHAR(50) | NOT NULL | 'Blood', 'Urine', 'Serum', 'Stool', 'CSF', 'Swab' |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Active status |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

#### 21. `lab_orders`
Doctor diagnostic requisition orders.
* **Primary Key:** `order_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `order_id` | SERIAL | PRIMARY KEY | Order identifier |
| `order_number` | VARCHAR(25) | NOT NULL, UNIQUE | Requisition code (LBO-2026-0001) |
| `patient_id` | INT | NOT NULL, FK -> `patients(patient_id)` | Subject patient |
| `doctor_id` | INT | NOT NULL, FK -> `doctors(doctor_id)` | Ordering physician |
| `consultation_id` | INT | NULL, FK -> `consultations(consultation_id)` | Linked consultation |
| `order_date` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Placement date |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'Ordered' | 'Ordered', 'In Progress', 'Completed', 'Cancelled' |
| `priority` | VARCHAR(20) | NOT NULL, DEFAULT 'Routine' | 'Routine', 'Urgent', 'Emergency' |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

#### 22. `lab_order_items`
Individual tests ordered inside a requisition batch.
* **Primary Key:** `order_item_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `order_item_id` | SERIAL | PRIMARY KEY | Item surrogate key |
| `order_id` | INT | NOT NULL, FK -> `lab_orders(order_id)` ON DELETE CASCADE | Parent requisition |
| `test_id` | INT | NOT NULL, FK -> `lab_tests(test_id)` | Specific test |
| `item_fee` | NUMERIC(10, 2) | NOT NULL, CHECK (item_fee >= 0) | Billed fee |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'Pending' | 'Pending', 'Sample Collected', 'Testing', 'Completed', 'Cancelled' |
| `performed_by` | INT | NULL, FK -> `staff(staff_id)` | Lab technician performing test |
| `result_summary` | TEXT | NULL | Summary conclusion |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

#### 23. `lab_results`
Measured parameters and quantitative test values for completed tests.
* **Primary Key:** `result_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `result_id` | SERIAL | PRIMARY KEY | Result measurement ID |
| `order_item_id` | INT | NOT NULL, FK -> `lab_order_items(order_item_id)` ON DELETE CASCADE | Parent test item |
| `parameter_name` | VARCHAR(100) | NOT NULL | Parameter (e.g., Hemoglobin, Fasting Blood Sugar) |
| `measured_value` | VARCHAR(100) | NOT NULL | Recorded value |
| `unit` | VARCHAR(30) | NULL | Measured unit |
| `reference_range` | VARCHAR(100) | NULL | Normal bounds |
| `is_abnormal` | BOOLEAN | NOT NULL, DEFAULT FALSE | Flags out-of-bound values |
| `remarks` | TEXT | NULL | Observations |
| `technician_id` | INT | NOT NULL, FK -> `staff(staff_id)` | Technician conducting test |
| `verified_by` | INT | NULL, FK -> `doctors(doctor_id)` | Pathologist/physician verifying results |
| `completed_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Completion timestamp |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

---

### Module 8 & 9: Pharmacy, Inventory & Prescriptions

#### 24. `medicine_categories`
Drug therapeutic categories (e.g., Antibiotics, Analgesics, Antihypertensives, Antidiabetics).
* **Primary Key:** `category_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `category_id` | SERIAL | PRIMARY KEY | Category identifier |
| `category_name` | VARCHAR(100) | NOT NULL, UNIQUE | Category title |
| `description` | TEXT | NULL | Classification details |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Status |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

#### 25. `medicines`
Pharmaceutical drug formulary master list.
* **Primary Key:** `medicine_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `medicine_id` | SERIAL | PRIMARY KEY | Drug surrogate ID |
| `category_id` | INT | NOT NULL, FK -> `medicine_categories(category_id)` | Therapeutic category |
| `brand_name` | VARCHAR(150) | NOT NULL | Trade name (e.g., 'Amoxil', 'Napa Extra') |
| `generic_name` | VARCHAR(150) | NOT NULL | Active ingredient (e.g., 'Amoxicillin') |
| `dosage_form` | VARCHAR(30) | NOT NULL | 'Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Drops', 'Inhaler' |
| `strength` | VARCHAR(50) | NOT NULL | Concentration (e.g., '500mg', '10mg/5ml') |
| `manufacturer` | VARCHAR(150) | NOT NULL | Pharmaceutical manufacturer |
| `unit_price` | NUMERIC(10, 2) | NOT NULL, CHECK (unit_price >= 0) | Standard dispensing unit price |
| `reorder_level` | INT | NOT NULL, DEFAULT 50, CHECK (reorder_level >= 0) | Stock threshold triggering warning |
| `is_prescription_required` | BOOLEAN | NOT NULL, DEFAULT TRUE | Prescription necessity flag |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Soft delete status |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

#### 26. `medicine_batches`
Inventory batches tracking lot numbers, expiry dates, purchase costs, and physical units on hand.
* **Primary Key:** `batch_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `batch_id` | SERIAL | PRIMARY KEY | Inventory lot ID |
| `medicine_id` | INT | NOT NULL, FK -> `medicines(medicine_id)` ON DELETE RESTRICT | Master drug |
| `batch_number` | VARCHAR(50) | NOT NULL | Manufacturer lot number |
| `manufacture_date` | DATE | NOT NULL | Batch manufacturing date |
| `expiry_date` | DATE | NOT NULL, CHECK (expiry_date > manufacture_date) | Expiration cutoff date |
| `cost_price` | NUMERIC(10, 2) | NOT NULL, CHECK (cost_price >= 0) | Unit acquisition cost |
| `selling_price` | NUMERIC(10, 2) | NOT NULL, CHECK (selling_price >= cost_price) | Unit selling price |
| `initial_quantity` | INT | NOT NULL, CHECK (initial_quantity >= 0) | Received quantity |
| `current_quantity` | INT | NOT NULL, CHECK (current_quantity >= 0) | Available quantity in stock (DB Check prevents negative) |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Active inventory status |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

#### 27. `inventory_transactions`
Auditable double-entry ledger of all stock additions, deductions, and adjustments.
* **Primary Key:** `transaction_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `transaction_id` | BIGSERIAL | PRIMARY KEY | Stock movement ledger ID |
| `batch_id` | INT | NOT NULL, FK -> `medicine_batches(batch_id)` | Stock batch affected |
| `medicine_id` | INT | NOT NULL, FK -> `medicines(medicine_id)` | Medicine reference |
| `transaction_type` | VARCHAR(25) | NOT NULL | 'Purchase', 'Dispense', 'Adjustment', 'Return', 'Disposal' |
| `quantity` | INT | NOT NULL | Quantity moved (positive or negative) |
| `unit_price` | NUMERIC(10, 2) | NOT NULL | Point-in-time unit rate |
| `total_amount` | NUMERIC(12, 2) | NOT NULL | Total valuation |
| `reference_type` | VARCHAR(50) | NULL | 'Prescription', 'PurchaseOrder', 'AuditAdjustment' |
| `reference_id` | INT | NULL | Referenced record ID |
| `transaction_date` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Transaction execution timestamp |
| `performed_by` | INT | NOT NULL, FK -> `users(user_id)` | Staff member executing transaction |
| `notes` | TEXT | NULL | Reason / adjustment remarks |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

#### 28. `prescriptions`
Prescription orders written during patient consultations.
* **Primary Key:** `prescription_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `prescription_id` | SERIAL | PRIMARY KEY | Prescription surrogate ID |
| `prescription_number` | VARCHAR(25) | NOT NULL, UNIQUE | Document code (RX-2026-0001) |
| `consultation_id` | INT | NULL, FK -> `consultations(consultation_id)` | Linked clinical consultation |
| `patient_id` | INT | NOT NULL, FK -> `patients(patient_id)` | Patient |
| `doctor_id` | INT | NOT NULL, FK -> `doctors(doctor_id)` | Prescribing physician |
| `issue_date` | DATE | NOT NULL, DEFAULT CURRENT_DATE | Issue date |
| `status` | VARCHAR(25) | NOT NULL, DEFAULT 'Active' | 'Active', 'Partially Dispensed', 'Dispensed', 'Cancelled' |
| `notes` | TEXT | NULL | Physician clinical instructions |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

#### 29. `prescription_items`
Individual line items in a prescription specifying drug, dosage, and duration.
* **Primary Key:** `item_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `item_id` | SERIAL | PRIMARY KEY | Line item surrogate ID |
| `prescription_id` | INT | NOT NULL, FK -> `prescriptions(prescription_id)` ON DELETE CASCADE | Associated prescription |
| `medicine_id` | INT | NOT NULL, FK -> `medicines(medicine_id)` | Prescribed medication |
| `dosage` | VARCHAR(50) | NOT NULL | e.g., '1 tablet', '5ml' |
| `frequency` | VARCHAR(50) | NOT NULL | e.g., '1-0-1 after meals', 'TDS' |
| `duration_days` | INT | NOT NULL, CHECK (duration_days > 0) | Days of treatment course |
| `prescribed_quantity` | INT | NOT NULL, CHECK (prescribed_quantity > 0) | Total count required |
| `dispensed_quantity` | INT | NOT NULL, DEFAULT 0, CHECK (dispensed_quantity >= 0) | Quantity released by pharmacy |
| `instructions` | TEXT | NULL | Patient usage guidance |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

#### 30. `medicine_dispensing`
Pharmacy fulfillment header documenting medication checkout to patients.
* **Primary Key:** `dispensing_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `dispensing_id` | SERIAL | PRIMARY KEY | Dispensing event ID |
| `dispensing_number` | VARCHAR(25) | NOT NULL, UNIQUE | Slip number (DSP-2026-0001) |
| `prescription_id` | INT | NOT NULL, FK -> `prescriptions(prescription_id)` | Associated prescription |
| `patient_id` | INT | NOT NULL, FK -> `patients(patient_id)` | Recipient patient |
| `pharmacist_id` | INT | NOT NULL, FK -> `staff(staff_id)` | Dispensing pharmacist |
| `dispensing_date` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Handover timestamp |
| `total_amount` | NUMERIC(10, 2) | NOT NULL, DEFAULT 0.00 | Total pharmacy bill |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'Completed' | 'Completed', 'Reversed' |
| `notes` | TEXT | NULL | Dispensing notes |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

#### 31. `medicine_dispensing_items`
Detailed line items of dispensed medications detailing batches and prices.
* **Primary Key:** `dispensing_item_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `dispensing_item_id` | SERIAL | PRIMARY KEY | Dispensed line item ID |
| `dispensing_id` | INT | NOT NULL, FK -> `medicine_dispensing(dispensing_id)` ON DELETE CASCADE | Parent dispensing event |
| `prescription_item_id` | INT | NOT NULL, FK -> `prescription_items(item_id)` | Prescribed line item fulfilled |
| `batch_id` | INT | NOT NULL, FK -> `medicine_batches(batch_id)` | Specific lot pulled |
| `medicine_id` | INT | NOT NULL, FK -> `medicines(medicine_id)` | Drug reference |
| `quantity` | INT | NOT NULL, CHECK (quantity > 0) | Count released |
| `unit_price` | NUMERIC(10, 2) | NOT NULL, CHECK (unit_price >= 0) | Price per unit |
| `subtotal` | NUMERIC(10, 2) | NOT NULL, CHECK (subtotal >= 0) | Quantity * unit price |

---

### Module 10: Billing & Payments

#### 32. `services`
Standard tariff catalog for all hospital procedures, bed charges, and consults.
* **Primary Key:** `service_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `service_id` | SERIAL | PRIMARY KEY | Service code ID |
| `service_code` | VARCHAR(20) | NOT NULL, UNIQUE | Charge code (e.g., CNS-GEN, BED-ICU, LAB-CBC) |
| `service_name` | VARCHAR(150) | NOT NULL | Service title |
| `category` | VARCHAR(30) | NOT NULL | 'Consultation', 'Lab', 'Bed', 'Pharmacy', 'Procedure', 'Nursing' |
| `standard_fee` | NUMERIC(10, 2) | NOT NULL, CHECK (standard_fee >= 0) | Standard fee |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Status flag |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

#### 33. `invoices`
Consolidated financial invoice for outpatient, inpatient, lab, and pharmacy services.
* **Primary Key:** `invoice_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `invoice_id` | SERIAL | PRIMARY KEY | Invoice surrogate key |
| `invoice_number` | VARCHAR(25) | NOT NULL, UNIQUE | Billing invoice number (INV-2026-0001) |
| `patient_id` | INT | NOT NULL, FK -> `patients(patient_id)` | Debtor patient |
| `admission_id` | INT | NULL, FK -> `admissions(admission_id)` | Linked inpatient stay |
| `consultation_id` | INT | NULL, FK -> `consultations(consultation_id)` | Linked consultation |
| `issue_date` | DATE | NOT NULL, DEFAULT CURRENT_DATE | Invoice date |
| `due_date` | DATE | NOT NULL, DEFAULT CURRENT_DATE | Payment due date |
| `subtotal` | NUMERIC(12, 2) | NOT NULL, DEFAULT 0.00, CHECK (subtotal >= 0) | Gross itemized charges |
| `discount_amount` | NUMERIC(10, 2) | NOT NULL, DEFAULT 0.00, CHECK (discount_amount >= 0) | Concession or waiver |
| `tax_amount` | NUMERIC(10, 2) | NOT NULL, DEFAULT 0.00, CHECK (tax_amount >= 0) | Applicable hospital VAT/Tax |
| `total_amount` | NUMERIC(12, 2) | NOT NULL, DEFAULT 0.00, CHECK (total_amount >= 0) | Net payable (`subtotal - discount + tax`) |
| `paid_amount` | NUMERIC(12, 2) | NOT NULL, DEFAULT 0.00, CHECK (paid_amount >= 0) | Cumulative sum of payments |
| `balance_due` | NUMERIC(12, 2) | NOT NULL, DEFAULT 0.00 | Remaining unpaid balance |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'Unpaid' | 'Unpaid', 'Partially Paid', 'Paid', 'Cancelled' |
| `notes` | TEXT | NULL | Billing remarks |
| `created_by` | INT | NOT NULL, FK -> `users(user_id)` | Accountant / cashier |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

#### 34. `invoice_items`
Itemized line entries constituting an invoice.
* **Primary Key:** `item_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `item_id` | SERIAL | PRIMARY KEY | Line item surrogate ID |
| `invoice_id` | INT | NOT NULL, FK -> `invoices(invoice_id)` ON DELETE CASCADE | Associated invoice |
| `service_id` | INT | NULL, FK -> `services(service_id)` | Charged service |
| `item_description` | VARCHAR(255) | NOT NULL | Detailed description of line item |
| `quantity` | INT | NOT NULL, DEFAULT 1, CHECK (quantity > 0) | Multiplier units |
| `unit_price` | NUMERIC(10, 2) | NOT NULL, CHECK (unit_price >= 0) | Unit rate |
| `discount` | NUMERIC(10, 2) | NOT NULL, DEFAULT 0.00, CHECK (discount >= 0) | Item line discount |
| `total_price` | NUMERIC(12, 2) | NOT NULL, CHECK (total_price >= 0) | `(quantity * unit_price) - discount` |
| `reference_type` | VARCHAR(50) | NULL | 'Consultation', 'LabOrderItem', 'BedDay', 'Dispensing', 'Procedure' |
| `reference_id` | INT | NULL | Originating operational ID |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

#### 35. `payments`
Financial payment receipts recorded against invoices.
* **Primary Key:** `payment_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `payment_id` | SERIAL | PRIMARY KEY | Payment receipt ID |
| `payment_number` | VARCHAR(25) | NOT NULL, UNIQUE | Receipt number (PAY-2026-0001) |
| `invoice_id` | INT | NOT NULL, FK -> `invoices(invoice_id)` ON DELETE RESTRICT | Target invoice |
| `patient_id` | INT | NOT NULL, FK -> `patients(patient_id)` | Paying patient |
| `payment_date` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Payment timestamp |
| `amount` | NUMERIC(12, 2) | NOT NULL, CHECK (amount > 0) | Amount remitted |
| `payment_method` | VARCHAR(30) | NOT NULL | 'Cash', 'Credit Card', 'Debit Card', 'MFS/bKash', 'Bank Transfer', 'Insurance' |
| `transaction_reference` | VARCHAR(100) | NULL | Bank slip or mobile gateway reference |
| `received_by` | INT | NOT NULL, FK -> `users(user_id)` | Cashier / accountant |
| `notes` | TEXT | NULL | Payment remarks |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp |

---

### Module 11 & 12: Audit & System Management

#### 36. `audit_logs`
Historical event log capturing all changes to tables with complete before/after values.
* **Primary Key:** `log_id`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `log_id` | BIGSERIAL | PRIMARY KEY | Audit sequence identifier |
| `table_name` | VARCHAR(50) | NOT NULL | Target table name (e.g., 'patients', 'invoices') |
| `record_id` | VARCHAR(50) | NOT NULL | Primary key of modified row |
| `action` | VARCHAR(10) | NOT NULL, CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')) | DML action performed |
| `old_values` | JSONB | NULL | Row state prior to update/delete |
| `new_values` | JSONB | NULL | Row state following insert/update |
| `changed_by` | INT | NULL, FK -> `users(user_id)` | User responsible |
| `changed_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Timestamp of modification |
| `ip_address` | VARCHAR(45) | NULL | Client IP origin |

#### 37. `hospital_settings`
Global system parameters and facility metadata.
* **Primary Key:** `setting_key`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `setting_key` | VARCHAR(50) | PRIMARY KEY | Setting identification key |
| `setting_value` | TEXT | NOT NULL | Configured value |
| `description` | TEXT | NULL | Parameter purpose |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

---

## 4. Cardinality & Participation Matrix

| Entity 1 | Cardinality | Entity 2 | Entity 1 Participation | Entity 2 Participation | Junction / FK Description |
| :--- | :---: | :--- | :---: | :---: | :--- |
| `users` | M : N | `roles` | Mandatory | Mandatory | `user_roles(user_id, role_id)` composite PK |
| `departments` | 1 : N | `staff` | Optional | Mandatory | `staff.department_id` references `departments` |
| `staff` | 1 : 1 | `doctors` | Optional | Mandatory | `doctors.staff_id` unique FK to `staff` |
| `departments` | 1 : 1 | `doctors` (Head) | Optional | Optional | `departments.head_doctor_id` references `doctors` |
| `doctors` | 1 : N | `doctor_schedules` | Optional | Mandatory | `doctor_schedules.doctor_id` |
| `patients` | 1 : N | `appointments` | Optional | Mandatory | `appointments.patient_id` |
| `doctors` | 1 : N | `appointments` | Optional | Mandatory | `appointments.doctor_id` |
| `appointments` | 1 : 1 | `consultations` | Optional | Optional | `consultations.appointment_id` unique FK |
| `consultations` | M : N | `diagnoses` | Optional | Optional | `consultation_diagnoses(consultation_id, diagnosis_id)` |
| `patients` | 1 : N | `medical_records` | Optional | Mandatory | `medical_records.patient_id` |
| `wards` | 1 : N | `rooms` | Mandatory | Mandatory | `rooms.ward_id` references `wards` |
| `rooms` | 1 : N | `beds` | Mandatory | Mandatory | `beds.room_id` references `rooms` |
| `patients` | 1 : N | `admissions` | Optional | Mandatory | `admissions.patient_id` |
| `admissions` | 1 : N | `bed_assignments`| Mandatory | Mandatory | `bed_assignments.admission_id` |
| `beds` | 1 : N | `bed_assignments`| Optional | Mandatory | `bed_assignments.bed_id` |
| `lab_orders` | 1 : N | `lab_order_items` | Mandatory | Mandatory | `lab_order_items.order_id` |
| `lab_order_items`| 1 : N | `lab_results` | Optional | Mandatory | `lab_results.order_item_id` |
| `medicines` | 1 : N | `medicine_batches` | Mandatory | Mandatory | `medicine_batches.medicine_id` |
| `prescriptions` | 1 : N | `prescription_items`| Mandatory | Mandatory | `prescription_items.prescription_id` |
| `prescription_items`| 1 : N | `medicine_dispensing_items` | Optional | Mandatory | `medicine_dispensing_items.prescription_item_id` |
| `invoices` | 1 : N | `invoice_items` | Mandatory | Mandatory | `invoice_items.invoice_id` |
| `invoices` | 1 : N | `payments` | Optional | Mandatory | `payments.invoice_id` |
