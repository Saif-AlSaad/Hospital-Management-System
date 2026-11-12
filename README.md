# 🏥 Apex Hospital Management System (HMS)
### Database-Centric University Term Project | Database Management Systems (DBMS)

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18.6-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-Backend-000000?style=for-the-badge&logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![No ORM](https://img.shields.io/badge/ORM-None%20(Pure%20SQL)-green?style=for-the-badge)

A comprehensive, production-grade Hospital Management System demonstrating advanced relational schema design, strict Third Normal Form (3NF) normalization, explicit ANSI SQL, PL/pgSQL routines (triggers, stored procedures, functions, transactions), indexing strategies, and database-level security.

---

## 🌟 Key Highlights & Academic Criteria

* **Zero ORM / Query Builders:** **100% Raw Parameterized SQL** using the plain `pg` (node-postgres) driver. No Prisma, Sequelize, Knex, or Drizzle.
* **37 Normalized Relational Tables:** Modeled across 6 clinical and operational clusters adhering to strict 3NF normalization.
* **~14,000 Realistic Seeded Records:** Synthetic dataset spanning patients, physicians, appointments, clinical encounters, admissions, diagnostics, batches, prescriptions, and financial ledgers.
* **7 Active Database Triggers:** Automated scheduling conflict prevention, bed occupancy synchronization, inventory stock control, invoice re-balancing, and JSONB audit logging.
* **4 Stored Procedures:** Transactional inpatient admissions, discharges, payment processing with INOUT parameters, and bulk analytics generation.
* **4 Database Functions:** Balance calculations, bed availability queries, invoice totals, and real-time physician schedule checks.
* **Live EXPLAIN ANALYZE Inspector:** Visual query plan analyzer demonstrating B-Tree indexing, partial indexes, and buffer hit rates.
* **PostgreSQL RBAC:** Database roles (`hms_admin`, `hms_doctor`, `hms_accountant`, `hms_receptionist`) with explicit `GRANT` and `REVOKE` permissions.

---

## 📂 Repository Architecture

```text
hospital-management-system/
│
├── schema/                                 # Database Foundation (DDL)
│   ├── 01_create_tables.sql                # 37 relational tables with sequences & constraints
│   ├── 02_constraints.sql                  # Primary keys, foreign keys & CHECK constraints
│   ├── 03_indexes.sql                      # Performance B-Trees, composite & partial indexes
│   ├── 04_views.sql                        # Operational views & materialized view
│   └── 05_roles_and_privileges.sql         # PostgreSQL RBAC roles & permissions
│
├── routines/                               # Database-Level Business Logic
│   ├── functions.sql                       # PL/pgSQL scalar & table functions
│   ├── procedures.sql                      # Multi-table atomic stored procedures
│   └── triggers.sql                        # BEFORE/AFTER database triggers & audit trail
│
├── queries/                                # Reference SQL Catalog
│   ├── insert_queries.sql                  # Multi-table insert templates
│   ├── update_queries.sql                  # Controlled updates
│   ├── delete_queries.sql                  # Cascading and soft deletion queries
│   ├── advanced_queries.sql                # Complex JOINs, subqueries, and GROUP BY/HAVING
│   └── reporting_queries.sql               # Financial, clinical, and operational reports
│
├── seed/                                   # Data Generation & Seeding
│   ├── 01_reference_data.sql               # Departments, diagnoses, lab tests, medicines
│   ├── 02_sample_data.sql                  # Core user accounts & staff
│   └── generate_data.js                    # High-speed synthetic data generator (~14,000 rows)
│
├── backend/                                # Node.js / Express Backend
│   ├── src/
│   │   ├── db/pool.js                      # Parameterized PostgreSQL connection pool
│   │   ├── middleware/                     # JWT authentication & role-based authorization
│   │   ├── routes/                         # 15 modular REST API routers
│   │   └── app.js                          # Express application entrypoint
│   ├── .env                                # Database environment configuration
│   └── package.json
│
├── frontend/                               # React + Vite Frontend
│   ├── src/
│   │   ├── components/                     # Sidebar, Navbar, DataTable, Modal
│   │   ├── pages/                          # 18 fully implemented module views
│   │   ├── services/api.js                 # API service layer with JWT interceptor
│   │   ├── App.jsx                         # Main dashboard router & session state
│   │   └── index.css                       # Modern medical dashboard design system
│   ├── vite.config.js                      # Dev server & reverse proxy configuration
│   └── package.json
│
├── tests/                                  # Automated Verification Suites
│   ├── database_tests.sql                  # Live SQL verification suite for PostgreSQL
│   ├── transaction_tests.sql               # Transaction atomicity and rollback proofs
│   └── api_tests/
│       └── workflows.test.js               # End-to-end integration tests (Workflows A-F)
│
├── docs/                                   # Academic Documentation & Deliverables
│   ├── ERD.svg                             # Visual Entity Relationship Diagram
│   ├── ERD_source                          # Mermaid ERD source specification
│   ├── data_dictionary.md                  # Complete 3NF normalization proofs & column schema
│   └── viva_guide.md                       # Comprehensive university viva defense handbook
│
├── .gitignore
└── README.md
```

---

## ⚡ Quick Start & Installation

### Prerequisites
* **Node.js** (v18.0.0 or higher)
* **PostgreSQL** (v15+ recommended, developed on PostgreSQL 18)

### 1. Database Initialization
Create the database in PostgreSQL:
```bash
createdb -U postgres hospital_db
```

Execute the database DDL scripts and routines in sequential order:
```bash
# Foundation Schema
psql -U postgres -d hospital_db -f schema/01_create_tables.sql
psql -U postgres -d hospital_db -f schema/02_constraints.sql
psql -U postgres -d hospital_db -f schema/03_indexes.sql
psql -U postgres -d hospital_db -f schema/04_views.sql
psql -U postgres -d hospital_db -f schema/05_roles_and_privileges.sql

# Routines & Logic
psql -U postgres -d hospital_db -f routines/functions.sql
psql -U postgres -d hospital_db -f routines/procedures.sql
psql -U postgres -d hospital_db -f routines/triggers.sql

# Reference Data
psql -U postgres -d hospital_db -f seed/01_reference_data.sql
```

### 2. Generate Realistic Synthetic Dataset (~14,000 Rows)
Run the automated seed script to populate all 37 tables with realistic interconnected clinical data:
```bash
node seed/generate_data.js
```
*(Takes approximately 7 seconds to populate 1,500 patients, 30 doctors, 3,000 appointments, 2,000 consultations, 300 admissions, 1,000 prescriptions, 2,000 invoices, and 3,000 payments).*

### 3. Backend Setup & Launch
Navigate to `backend/`, verify `.env` matches your PostgreSQL credentials, and start the server:
```bash
cd backend
npm install
npm start
```
The API server runs on `http://localhost:5000`.

### 4. Frontend Launch
In a separate terminal, navigate to `frontend/` and launch the Vite development server:
```bash
cd frontend
npm install
npm run dev
```
Open your browser and navigate to **`http://localhost:3000`**.

---

## 🔑 Demo Accounts for University Viva Defense

The login page features **1-click quick-role switch buttons** for viva demonstration:

| Role | Username | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `password123` | Full access across all 18 modules, user management, and materialized views |
| **Doctor** | `doctor1` | `password123` | Patient encounters, diagnosis entry, and prescribing medications |
| **Nurse** | `nurse1` | `password123` | Inpatient wards, bed assignments, and patient admissions |
| **Receptionist** | `receptionist1` | `password123` | Patient registration, scheduling appointments, and bed allocation |
| **Lab Technician** | `labtech1` | `password123` | Diagnostic test requisitions, specimen processing, and recording results |
| **Pharmacist** | `pharmacist1` | `password123` | Pharmacy inventory batches, low-stock alerts, and prescription dispensing |
| **Accountant** | `accountant1` | `password123` | Itemized invoicing, payment receipts, fee tariffs, and revenue analytics |

---

## 🧪 Automated Testing & Verification

Run the comprehensive end-to-end integration test suite verifying Workflows A through F against the live PostgreSQL database:
```bash
node tests/api_tests/workflows.test.js
```

Run the database constraints and rollback verification suite directly in PostgreSQL:
```bash
psql -U postgres -d hospital_db -f tests/database_tests.sql
psql -U postgres -d hospital_db -f tests/transaction_tests.sql
```

---

## 📚 Academic Documentation

* **Complete Relational Data Dictionary & 3NF Proofs:** [`docs/data_dictionary.md`](docs/data_dictionary.md)
* **Comprehensive Viva Defense & Technical Handbook:** [`docs/viva_guide.md`](docs/viva_guide.md)
* **Visual Entity Relationship Diagram (ERD):** [`docs/ERD.svg`](docs/ERD.svg)

---

## ⚖️ Academic Integrity Statement
This project was designed and implemented explicitly for educational evaluation in university-level relational database management systems courses. All database routines, triggers, indexes, and queries are explicitly declared in structured SQL files without ORMs.
