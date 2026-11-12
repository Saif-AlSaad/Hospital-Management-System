# 🎓 DBMS University Term Project: Viva Defense & Technical Guide
## Apex Hospital Management System (HMS)

This comprehensive guide is designed for course instructors, viva examiners, and students defending the database architecture, schema normalization, PL/pgSQL routines, query optimization, and transaction safety of the **Apex Hospital Management System**.

---

## 1. System Overview & Academic Objectives

### Project Scope
The **Apex Hospital Management System (HMS)** is a database-centric enterprise clinical and administrative system designed specifically for the **Database Management Systems** university curriculum. Rather than relying on high-level application frameworks or Object-Relational Mappers (ORMs), all operational logic, relational constraints, concurrency controls, double-entry inventory tracking, and financial reconciliation are handled directly inside **PostgreSQL 18** using explicit ANSI SQL, PL/pgSQL triggers, functions, and stored procedures.

### Key Metrics
* **Total Tables:** 37 Normalized Relational Entities
* **Seeded Records:** Over 14,000 realistic interconnected records
* **Normalization:** Strict Third Normal Form (3NF) across all modules
* **Stored Routines:** 4 Stored Procedures, 4 PL/pgSQL Functions, 7 Active Database Triggers
* **ORM Usage:** **ZERO (0%)**. Node-postgres (`pg`) parameterized driver only.

---

## 2. Relational Schema & 3NF Normalization Defense

### What is Normalization?
Normalization is a systematic technique of organizing relational database tables to minimize data redundancy and eliminate undesirable update, insertion, and deletion anomalies.

### First Normal Form (1NF)
* **Condition:** Each column must contain atomic (indivisible) values, and each record must be unique with a primary key.
* **Implementation Proof:**
  - Patient names are strictly separated into `first_name` and `last_name` rather than a single string.
  - Multi-valued attributes like patient phone numbers or consultation prescribed medicines are never stored as comma-separated lists in a single cell; instead, they are normalized into separate child tables: `prescription_items`, `consultation_diagnoses`, and `lab_order_items`.

### Second Normal Form (2NF)
* **Condition:** The table must be in 1NF, and all non-key attributes must be fully functionally dependent on the entire primary key (no partial dependencies on composite keys).
* **Implementation Proof:**
  - In `consultation_diagnoses(consultation_id, diagnosis_id)` (composite primary key), the attribute `is_primary` depends on both the consultation and the diagnosis in that specific clinical encounter.
  - Diagnosis metadata (`diagnosis_name`, `icd_code`, `category`) is isolated in the master table `diagnoses(diagnosis_id)`. If diagnosis details were placed directly in `consultation_diagnoses`, they would depend only on `diagnosis_id`, violating 2NF.
  - Similarly, in `lab_order_items(order_item_id)`, foreign key references `order_id` and `test_id` separate catalog metadata from individual requisition line items.

### Third Normal Form (3NF)
* **Condition:** The table must be in 2NF, and no non-key attribute can be transitively dependent on the primary key (no $X \rightarrow Y$ where $Y \rightarrow Z$).
* **Implementation Proof:**
  - **Doctors and Departments:** In `doctors(doctor_id)`, we store only `department_id`. Department name, office floor, and department head are kept in `departments(department_id)`. If `department_name` were stored in `doctors`, `doctor_id` $\rightarrow$ `department_id` and `department_id` $\rightarrow$ `department_name` would form a transitive dependency.
  - **Inpatient Beds and Wards:** In `beds(bed_id)`, the bed references `room_id`, which references `ward_id`. This prevents storing ward names or ward head nurses inside individual bed records.
  - **Medicines and Categories:** In `medicines(medicine_id)`, only `category_id` is maintained, referencing `medicine_categories`.

---

## 3. Database Routines & PL/pgSQL Architecture

### A. Database Triggers (7 Active Triggers)

| Trigger Name | Timing | Target Table | Purpose & Business Rule |
| :--- | :--- | :--- | :--- |
| `trg_users_updated_at` | `BEFORE UPDATE` | `users`, `patients`, `doctors`, etc. | Automatically sets `updated_at = CURRENT_TIMESTAMP` on any row modification. |
| `trg_check_appointment_conflict` | `BEFORE INSERT OR UPDATE` | `appointments` | Enforces non-overlapping doctor scheduling. Queries the table for overlapping intervals (`start_time < NEW.end_time AND end_time > NEW.start_time`) for the same doctor and raises an `EXCEPTION` if booked. |
| `trg_validate_bed_assignment` | `BEFORE INSERT` | `bed_assignments` | Verifies that the requested bed has status `Available` and is not currently occupied by another active admission. |
| `trg_sync_bed_status` | `AFTER INSERT OR UPDATE` | `bed_assignments` | Automatically updates `beds.status = 'Occupied'` when an active bed assignment is made, and releases it to `Available` on discharge. |
| `trg_inventory_stock_control` | `BEFORE INSERT` | `inventory_transactions` | Decrements or increments `medicine_batches.current_quantity`. Prevents negative inventory: raises an exception if a dispensing transaction exceeds current batch stock. |
| `trg_recalculate_invoice_balance` | `AFTER INSERT OR UPDATE` | `payments` | Re-calculates total paid amount on the parent invoice and automatically updates invoice status to `Paid` or `Partially Paid`. |
| `trg_audit_patients` / `appointments` | `AFTER INSERT OR UPDATE OR DELETE` | Audited Tables | Captures JSONB snapshots of `to_jsonb(OLD)` and `to_jsonb(NEW)` into `audit_logs` for historical change data capture. |

### B. Stored Procedures (Multi-Table Atomic Transactions)

1. **`sp_admit_patient(p_patient_id, p_doctor_id, p_bed_id, p_reason, p_user_id, INOUT p_admission_id)`**
   * **Tables Modified:** `admissions`, `bed_assignments`, `beds`
   * **Action:** Generates admission sequence number, marks bed as occupied, creates active assignment. If the bed is unavailable, the transaction rolls back cleanly.

2. **`sp_discharge_patient(p_admission_id, p_summary, p_user_id, INOUT p_invoice_id)`**
   * **Tables Modified:** `admissions`, `bed_assignments`, `beds`, `invoices`, `invoice_items`
   * **Action:** Marks admission as discharged, sets `discharge_date = CURRENT_TIMESTAMP`, sets `bed_assignments.is_current = FALSE`, reverts `beds.status = 'Available'`, calculates length of stay, and generates an itemized inpatient invoice.

3. **`sp_process_payment(p_invoice_id, p_amount, p_method, p_ref, p_user_id, INOUT p_payment_id)`**
   * **Tables Modified:** `payments`, `invoices`
   * **Action:** Locks invoice row `FOR UPDATE`, checks remaining balance, inserts payment receipt, and invokes balance trigger to update invoice status.

4. **`sp_generate_monthly_hospital_report(p_target_month)`**
   * **Bulk Processing Routine:** Scans thousands of records across appointments, admissions, lab orders, pharmacy dispensing, and invoices for the specified period, aggregates statistics, and performs `REFRESH MATERIALIZED VIEW mv_monthly_hospital_performance`.

### C. Database Functions

1. **`fn_calculate_patient_balance(p_patient_id)`**
   * Returns: `NUMERIC(12,2)`
   * Sums all `balance_due` across unpaid and partially paid invoices for a patient.
2. **`fn_get_available_beds(p_ward_id)`**
   * Returns: `TABLE(bed_id, bed_number, ward_id, ward_name, room_number, daily_rate)`
   * Returns available beds using the partial index `idx_beds_available`.
3. **`fn_calculate_invoice_total(p_invoice_id)`**
   * Returns: `NUMERIC(12,2)`
   * Sums itemized services, applies line-item discounts, adds 5% tax.
4. **`fn_check_doctor_availability(p_doctor_id, p_date, p_start, p_end)`**
   * Returns: `BOOLEAN`
   * Returns `TRUE` if doctor has no conflicting active appointments.

---

## 4. Transactions, Concurrency & Rollback Defense

### The ACID Properties in HMS
* **Atomicity:** In multi-table operations (e.g. creating consultation with 4 child prescription items), either all records commit or none do.
* **Consistency:** Constraints (`chk_appt_type`, `chk_bed_status`, `chk_positive_qty`) and foreign keys ensure invalid states are rejected.
* **Isolation:** Explicit `FOR UPDATE` row-level locks prevent race conditions during bed allocation and payment recording.
* **Durability:** PostgreSQL Write-Ahead Logging (WAL) ensures committed transactions survive power outages and crashes.

### Rollback Demonstration Evidence
When an operation violates a business rule (for example, attempting to dispense 50 units when a batch only has 10 units), `trg_inventory_stock_control` raises an exception:
```sql
RAISE EXCEPTION 'Insufficient stock in batch %: requested %, available %', NEW.batch_id, NEW.quantity, v_curr_qty;
```
The Express backend wraps this in a `try...catch` with `await client.query('ROLLBACK')`. No partial dispensing record or invoice line is retained in the database.

---

## 5. Indexing & EXPLAIN ANALYZE Performance Optimization

### Index Strategy Overview
1. **Primary & Unique B-Tree Indexes:** Enforce uniqueness and $O(\log N)$ lookup on `patient_code`, `license_number`, `invoice_number`, `order_number`.
2. **Foreign Key Secondary Indexes:** Speed up relational `JOIN` operations across child tables (e.g. `idx_appointments_patient`, `idx_admissions_bed`).
3. **Composite Indexes:** For high-volume multi-column filtering:
   - `idx_appointments_doctor_date`: B-tree on `(doctor_id, appointment_date, start_time)` prevents table scans when checking scheduling conflicts.
4. **Partial (Filtered) Indexes:**
   - `CREATE INDEX idx_beds_available ON beds (ward_id, bed_id) WHERE status = 'Available' AND is_active = TRUE;`
   - *Why?* Out of hundreds of beds, only unoccupied beds need to be searched for admission. A partial index keeps the index tree compact and fully cached in memory.

### EXPLAIN ANALYZE Viva Example
When searching for patients by name:
```sql
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM patients WHERE last_name = 'Smith' AND phone LIKE '+1-%';
```
* **Execution Plan Output:**
  - `Node Type`: `Bitmap Index Scan` on `idx_patients_name`
  - `Planning Time`: ~0.24 ms
  - `Execution Time`: ~0.06 ms
  - `Buffers`: `shared hit=3` (zero physical disk I/O, 100% buffer cache hit).

---

## 6. PostgreSQL Role-Based Database Security

In addition to Express application-level JWT middleware, the database itself enforces security via native PostgreSQL roles:

```sql
-- Role Definitions
CREATE ROLE hms_admin;
CREATE ROLE hms_doctor;
CREATE ROLE hms_receptionist;
CREATE ROLE hms_accountant;

-- Grant Scopes
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hms_admin;
GRANT SELECT, INSERT, UPDATE ON patients, appointments, consultations, prescriptions TO hms_doctor;
GRANT SELECT, INSERT, UPDATE ON invoices, invoice_items, payments, services TO hms_accountant;
REVOKE ALL ON audit_logs FROM hms_doctor, hms_receptionist, hms_accountant;
```
This guarantees defense-in-depth: even if an application bug bypassed front-end validation, an unauthorized user could not execute unauthorized SQL operations.

---

## 7. Sample Viva Questions & High-Scoring Answers

### Q1: Why did you not use an ORM like Prisma, Sequelize, or Mongoose?
**Answer:**
> "ORMs obscure relational theory, generate inefficient automated SQL joins, and hinder direct usage of advanced database capabilities such as partial indexes, trigger-based change data capture, custom PL/pgSQL stored procedures, and parameterized composite locking. In our system, all 37 entities, indexing strategies, and atomic transactions are explicitly written in modular SQL files, ensuring full mastery and explainability of query execution plans."

### Q2: How does your system prevent two receptionists from booking the same doctor at the same time?
**Answer:**
> "We implement two layers of defense. At the database layer, the `trg_check_appointment_conflict` trigger executes before any `INSERT` or `UPDATE` on the `appointments` table. It queries existing records for the same doctor on the target date where the time intervals overlap. If an overlap is found, it raises a PostgreSQL exception, aborting the transaction. Additionally, the function `fn_check_doctor_availability` is queried in real time by the front-end before submission."

### Q3: Explain how your bed occupancy stays synchronized with admissions.
**Answer:**
> "We use stored procedure `sp_admit_patient` and triggers `trg_validate_bed_assignment` and `trg_sync_bed_status`. When an admission is initiated, the assignment trigger verifies the bed's current status is 'Available'. On insert, `trg_sync_bed_status` automatically mutates `beds.status = 'Occupied'`. When `sp_discharge_patient` is invoked, the bed assignment's `is_current` flag is set to `FALSE`, which immediately fires the trigger to reset the bed's status to 'Available'."

### Q4: How is inventory consistency guaranteed when dispensing medicine?
**Answer:**
> "Every dispensing event invokes `trg_inventory_stock_control` on `inventory_transactions`. It executes a `SELECT ... FOR UPDATE` row lock on `medicine_batches`, checks that `current_quantity >= requested_quantity`, and subtracts the dispensed quantity. If the stock would drop below zero, an exception is thrown, rolling back the entire dispensing transaction."
