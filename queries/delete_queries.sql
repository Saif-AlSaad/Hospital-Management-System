-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM (HMS)
-- Explicit SQL Queries: DELETE Operations (Physical, Cascade, and Soft Deletions)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CASCADE DELETE 1: Cancelled Lab Requisition & Line Items
-- Deleting an order cascades automatically to lab_order_items (and any draft results).
-- Foreign Key: ON DELETE CASCADE defined in schema/02_constraints.sql
-- ----------------------------------------------------------------------------
DELETE FROM lab_orders
WHERE order_id = $1
  AND status = 'Cancelled';

-- ----------------------------------------------------------------------------
-- 2. CASCADE DELETE 2: Draft/Cancelled Prescription & Associated Items
-- Deleting a prescription cascades automatically to all child prescription_items.
-- Foreign Key: ON DELETE CASCADE defined in schema/02_constraints.sql
-- ----------------------------------------------------------------------------
DELETE FROM prescriptions
WHERE prescription_id = $1
  AND status = 'Cancelled';

-- ----------------------------------------------------------------------------
-- 3. SINGLE TABLE DELETE: Remove Specific Diagnosis From Consultation
-- Demonstrates direct deletion from a junction table with composite key.
-- ----------------------------------------------------------------------------
DELETE FROM consultation_diagnoses
WHERE consultation_id = $1
  AND diagnosis_id = $2;

-- ----------------------------------------------------------------------------
-- 4. SOFT DELETIONS (Preserving Historical & Audit Records)
-- Used for core clinical and master data to avoid breaking referential integrity.
-- ----------------------------------------------------------------------------

-- Soft delete patient record
UPDATE patients
SET is_active = FALSE,
    updated_at = CURRENT_TIMESTAMP
WHERE patient_id = $1;

-- Soft delete doctor profile
UPDATE doctors
SET is_active = FALSE,
    updated_at = CURRENT_TIMESTAMP
WHERE doctor_id = $1;

-- Soft delete medicine from active formulary
UPDATE medicines
SET is_active = FALSE,
    updated_at = CURRENT_TIMESTAMP
WHERE medicine_id = $1;

-- Soft delete hospital department
UPDATE departments
SET is_active = FALSE,
    updated_at = CURRENT_TIMESTAMP
WHERE department_id = $1;
