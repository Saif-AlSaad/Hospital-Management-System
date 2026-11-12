-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM (HMS)
-- DDL Script 05: PostgreSQL Database Roles, Grants & Access Control (Security)
-- DBMS: PostgreSQL 14+ (Tested on PostgreSQL 18)
-- ============================================================================

-- Clean creation of roles safely if they do not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hms_admin') THEN
        CREATE ROLE hms_admin WITH LOGIN PASSWORD 'Admin@SecureHMS2026';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hms_doctor') THEN
        CREATE ROLE hms_doctor WITH LOGIN PASSWORD 'Doctor@SecureHMS2026';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hms_accountant') THEN
        CREATE ROLE hms_accountant WITH LOGIN PASSWORD 'Accountant@SecureHMS2026';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hms_receptionist') THEN
        CREATE ROLE hms_receptionist WITH LOGIN PASSWORD 'Reception@SecureHMS2026';
    END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- 1. REVOKE DEFAULT PUBLIC PRIVILEGES FOR LEAST PRIVILEGE ENFORCEMENT
-- ----------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- ----------------------------------------------------------------------------
-- 2. ROLE: hms_admin (Hospital Superuser & IT Administrator)
-- ----------------------------------------------------------------------------
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hms_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO hms_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO hms_admin;
GRANT ALL PRIVILEGES ON ALL PROCEDURES IN SCHEMA public TO hms_admin;

-- ----------------------------------------------------------------------------
-- 3. ROLE: hms_doctor (Clinical Practitioner)
-- Has access to clinical consultations, prescriptions, lab requisitions, patient vitals.
-- Strictly prohibited from modifying billing, issuing invoices, or deleting audit logs.
-- ----------------------------------------------------------------------------
-- Read master data
GRANT SELECT ON patients, departments, staff, doctors, doctor_schedules,
                diagnoses, lab_tests, lab_test_categories, medicines,
                medicine_categories, services, wards, rooms, beds TO hms_doctor;

-- Manage outpatient consultations and appointments
GRANT SELECT, UPDATE ON appointments TO hms_doctor;
GRANT SELECT, INSERT, UPDATE ON consultations, consultation_diagnoses, medical_records TO hms_doctor;
GRANT USAGE, SELECT ON SEQUENCE consultations_consultation_id_seq, 
                                medical_records_record_id_seq TO hms_doctor;

-- Manage prescriptions
GRANT SELECT, INSERT, UPDATE ON prescriptions, prescription_items TO hms_doctor;
GRANT USAGE, SELECT ON SEQUENCE prescriptions_prescription_id_seq, 
                                prescription_items_item_id_seq TO hms_doctor;

-- Order lab tests & view results
GRANT SELECT, INSERT ON lab_orders, lab_order_items TO hms_doctor;
GRANT SELECT ON lab_results TO hms_doctor;
GRANT USAGE, SELECT ON SEQUENCE lab_orders_order_id_seq, 
                                lab_order_items_order_item_id_seq TO hms_doctor;

-- Manage admissions (physician notes)
GRANT SELECT, INSERT, UPDATE ON admissions TO hms_doctor;
GRANT USAGE, SELECT ON SEQUENCE admissions_admission_id_seq TO hms_doctor;

-- Views
GRANT SELECT ON v_doctor_directory, v_active_admissions, v_patient_360 TO hms_doctor;

-- Revoke destructive access explicitly (defense in depth)
REVOKE DELETE ON consultations, medical_records, prescriptions, lab_orders FROM hms_doctor;
REVOKE ALL ON invoices, invoice_items, payments, audit_logs, users, roles, user_roles FROM hms_doctor;

-- ----------------------------------------------------------------------------
-- 4. ROLE: hms_accountant (Finance & Billing Operations)
-- Full authority over invoices, payments, receipts, and revenue reporting.
-- Strictly restricted from reading private clinical doctor notes and symptoms.
-- ----------------------------------------------------------------------------
GRANT SELECT ON patients, services, departments, doctors, admissions, medicine_dispensing TO hms_accountant;
GRANT SELECT, INSERT, UPDATE ON invoices, invoice_items, payments TO hms_accountant;
GRANT USAGE, SELECT ON SEQUENCE invoices_invoice_id_seq, 
                                invoice_items_item_id_seq, 
                                payments_payment_id_seq TO hms_accountant;

GRANT SELECT ON v_patient_360, mv_monthly_hospital_performance TO hms_accountant;

-- Explicitly revoke access to confidential clinical diagnosis and doctor consultation notes
REVOKE ALL ON consultations, consultation_diagnoses, medical_records, lab_results FROM hms_accountant;

-- ----------------------------------------------------------------------------
-- 5. ROLE: hms_receptionist (Front Desk & Scheduling)
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON patients, appointments TO hms_receptionist;
GRANT USAGE, SELECT ON SEQUENCE patients_patient_id_seq, appointments_appointment_id_seq TO hms_receptionist;
GRANT SELECT ON departments, doctors, doctor_schedules, wards, rooms, beds, v_doctor_directory, v_bed_occupancy_by_ward TO hms_receptionist;

-- ----------------------------------------------------------------------------
-- 6. GRANT APP USER (The Postgres login used by Express backend connection pool)
-- ----------------------------------------------------------------------------
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL PROCEDURES IN SCHEMA public TO postgres;
