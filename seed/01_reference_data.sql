-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM (HMS)
-- Reference Data Seeder: Foundation Catalogs & Master Lookups
-- DBMS: PostgreSQL 14+ (Tested on PostgreSQL 18)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ROLES
-- ----------------------------------------------------------------------------
INSERT INTO roles (role_name, description) VALUES
('Admin', 'Full administrative authority and system management access'),
('Doctor', 'Clinical medical practitioner with patient encounter & prescription privileges'),
('Receptionist', 'Front-desk patient registration and appointment scheduling'),
('Accountant', 'Billing, invoicing, payments, and financial management')
ON CONFLICT (role_name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. DEPARTMENTS
-- ----------------------------------------------------------------------------
INSERT INTO departments (department_name, code, description) VALUES
('Cardiology', 'CARD', 'Comprehensive cardiovascular medicine and coronary care'),
('Neurology', 'NEUR', 'Diagnosis and management of brain, spine, and nervous system disorders'),
('Pediatrics', 'PEDI', 'Specialized healthcare for infants, children, and adolescents'),
('Orthopedics', 'ORTH', 'Musculoskeletal system surgery, fracture treatment, and joint care'),
('General Medicine', 'GMED', 'Adult outpatient primary care, chronic disease, and internal medicine'),
('General Surgery', 'GSUR', 'Inpatient elective and trauma surgical interventions'),
('Obstetrics & Gynecology', 'OBGY', 'Maternal health, prenatal care, delivery, and gynecological medicine'),
('Emergency & Trauma', 'EMER', '24/7 urgent medical stabilization and trauma resuscitation')
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. DIAGNOSES (ICD-10 Aligned)
-- ----------------------------------------------------------------------------
INSERT INTO diagnoses (icd_code, diagnosis_name, description) VALUES
('I10', 'Essential (Primary) Hypertension', 'High blood pressure without identifiable secondary cause'),
('E11.9', 'Type 2 Diabetes Mellitus', 'Non-insulin dependent chronic metabolic disorder'),
('J45.909', 'Unspecified Asthma', 'Chronic airway inflammation characterized by wheezing'),
('J06.9', 'Acute Upper Respiratory Infection', 'Common acute viral inflammation of nasal passages and throat'),
('K21.9', 'Gastro-Esophageal Reflux Disease (GERD)', 'Chronic reflux of stomach acids into esophagus'),
('M54.5', 'Low Back Pain', 'Acute or chronic musculoskeletal pain in lumbar region'),
('N39.0', 'Urinary Tract Infection (UTI)', 'Bacterial infection of urinary bladder and urethra'),
('A09', 'Infectious Gastroenteritis and Colitis', 'Acute gastrointestinal inflammation with diarrhea and vomiting'),
('E78.5', 'Hyperlipidemia, Unspecified', 'Elevated levels of cholesterol and triglycerides in blood'),
('I20.9', 'Angina Pectoris, Unspecified', 'Chest pain caused by reduced blood flow to heart muscle'),
('K29.70', 'Gastritis, Unspecified', 'Inflammation of gastric mucosal lining'),
('M17.9', 'Osteoarthritis of Knee, Unspecified', 'Degenerative joint disease of the knee cartilage'),
('R51', 'Headache', 'Acute or tension-type cephalalgia'),
('G43.909', 'Migraine, Unspecified', 'Recurrent throbbing unilateral headache with sensory sensitivity'),
('J18.9', 'Pneumonia, Unspecified Organism', 'Infection of lung parenchyma causing alveolar consolidation'),
('J02.9', 'Acute Pharyngitis', 'Infection and inflammation of the pharynx/throat'),
('L30.9', 'Dermatitis, Unspecified', 'Superficial skin inflammation with erythema and pruritus'),
('K80.20', 'Calculus of Gallbladder (Gallstones)', 'Cholelithiasis without cholecystitis'),
('B34.9', 'Viral Infection, Unspecified', 'Systemic acute viral febrile illness'),
('D64.9', 'Anemia, Unspecified', 'Reduction in red blood cell concentration or hemoglobin levels')
ON CONFLICT (icd_code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. LAB TEST CATEGORIES & TESTS CATALOG
-- ----------------------------------------------------------------------------
INSERT INTO lab_test_categories (category_name, description) VALUES
('Hematology', 'Blood cell counts, coagulation profiling, and hemoglobin assessment'),
('Biochemistry', 'Serum electrolytes, blood sugar, kidney and liver enzymes'),
('Microbiology', 'Pathogen culture, urine analysis, and antimicrobial susceptibility'),
('Radiology', 'Diagnostic imaging, computerized radiography, and ultrasonography'),
('Pathology & Histology', 'Tissue examination and cytological fluid analysis')
ON CONFLICT (category_name) DO NOTHING;

INSERT INTO lab_tests (category_id, test_code, test_name, description, standard_fee, normal_range, units, sample_type) VALUES
((SELECT category_id FROM lab_test_categories WHERE category_name = 'Hematology'), 'CBC', 'Complete Blood Count (CBC & ESR)', 'Hemoglobin, RBC, WBC count, and platelet differentiation', 400.00, '4.5 - 11.0', '10^3/mcL', 'Blood'),
((SELECT category_id FROM lab_test_categories WHERE category_name = 'Hematology'), 'ESR', 'Erythrocyte Sedimentation Rate', 'Non-specific marker for systemic inflammation', 250.00, '0 - 20', 'mm/hr', 'Blood'),
((SELECT category_id FROM lab_test_categories WHERE category_name = 'Biochemistry'), 'FBS', 'Fasting Blood Sugar (FBS)', 'Serum glucose concentration after 8-hour fasting', 200.00, '70 - 99', 'mg/dL', 'Serum'),
((SELECT category_id FROM lab_test_categories WHERE category_name = 'Biochemistry'), 'HBA1C', 'Glycated Hemoglobin (HbA1c)', 'Three-month average blood glucose control marker', 1000.00, '4.0 - 5.6', '%', 'Blood'),
((SELECT category_id FROM lab_test_categories WHERE category_name = 'Biochemistry'), 'LIPID', 'Lipid Profile Panel', 'Total cholesterol, HDL, LDL, and triglycerides', 1200.00, 'Total < 200', 'mg/dL', 'Serum'),
((SELECT category_id FROM lab_test_categories WHERE category_name = 'Biochemistry'), 'LFT', 'Liver Function Test (LFT)', 'Bilirubin, SGOT/AST, SGPT/ALT, and alkaline phosphatase', 1400.00, 'ALT: 7 - 56', 'U/L', 'Serum'),
((SELECT category_id FROM lab_test_categories WHERE category_name = 'Biochemistry'), 'KFT', 'Kidney Function Test (Serum Creatinine)', 'Serum Creatinine, Blood Urea Nitrogen (BUN), and Uric Acid', 1000.00, 'Creat: 0.7 - 1.3', 'mg/dL', 'Serum'),
((SELECT category_id FROM lab_test_categories WHERE category_name = 'Biochemistry'), 'TSH', 'Thyroid Stimulating Hormone (TSH)', 'Assessment of thyroid glandular hyperactivity or insufficiency', 800.00, '0.4 - 4.0', 'mIU/L', 'Serum'),
((SELECT category_id FROM lab_test_categories WHERE category_name = 'Microbiology'), 'URINE_RE', 'Urine Routine Examination (R/E)', 'Physical, chemical, and microscopic urine analysis', 300.00, 'Clear / Pale Yellow', 'Qualitative', 'Urine'),
((SELECT category_id FROM lab_test_categories WHERE category_name = 'Radiology'), 'CXR', 'Chest X-Ray Posteroanterior (PA)', 'Plain radiographic view of thoracic cavity and cardiopulmonary structures', 800.00, 'Normal lung fields', 'Visual', 'None'),
((SELECT category_id FROM lab_test_categories WHERE category_name = 'Radiology'), 'ECG', 'Electrocardiogram 12-Lead (ECG)', 'Electro-cardiac rhythm tracing and ischemic changes', 500.00, 'Normal Sinus Rhythm', 'Visual', 'None'),
((SELECT category_id FROM lab_test_categories WHERE category_name = 'Radiology'), 'USG_ABD', 'Ultrasonography of Whole Abdomen (USG)', 'High-frequency acoustic imaging of liver, spleen, kidneys, and pelvis', 2200.00, 'Unremarkable scan', 'Visual', 'None')
ON CONFLICT (test_code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. MEDICINE CATEGORIES
-- ----------------------------------------------------------------------------
INSERT INTO medicine_categories (category_name, description) VALUES
('Antibiotics', 'Antimicrobial medications for bacterial infections'),
('Analgesics & Antipyretics', 'Pain alleviation and fever reduction medications'),
('Antihypertensives', 'Cardiovascular medications for systemic blood pressure reduction'),
('Antidiabetics', 'Hypoglycemic agents and insulin sensitizers'),
('Antacids & Gastroprotectants', 'Proton pump inhibitors and gastric acid neutralizers'),
('Antihistamines', 'Allergy, rhinitis, and histamine-receptor blockers'),
('Respiratory & Bronchodilators', 'Inhalers and broncho-spasmolytic agents for asthma and COPD'),
('Cardiovascular & Statins', 'Cholesterol lowering, anticoagulants, and antiplatelet drugs'),
('Vitamins & Dietary Supplements', 'Nutritional micronutrients, minerals, and restorative tonics')
ON CONFLICT (category_name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. SERVICES CATALOG
-- ----------------------------------------------------------------------------
INSERT INTO services (service_code, service_name, category, standard_fee) VALUES
('CNS-GEN', 'General Outpatient Medical Consultation', 'Consultation', 500.00),
('CNS-SPC', 'Specialist / Senior Consultant Consultation', 'Consultation', 1000.00),
('CNS-EMER', 'Emergency & Critical Care Consultation', 'Consultation', 1500.00),
('BED-GEN', 'General Inpatient Ward Bed Charge (Per Day)', 'Bed', 500.00),
('BED-SEMI', 'Semi-Private Room Bed Charge (Per Day)', 'Bed', 1500.00),
('BED-DELUXE', 'Deluxe Private Suite Bed Charge (Per Day)', 'Bed', 3500.00),
('BED-ICU', 'Intensive Care Unit (ICU) Bed Charge (Per Day)', 'Bed', 8000.00),
('LAB-CBC', 'Complete Blood Count Laboratory Service', 'Lab', 400.00),
('LAB-LIPID', 'Lipid Profile Panel Laboratory Service', 'Lab', 1200.00),
('LAB-LFT', 'Liver Function Panel Laboratory Service', 'Lab', 1400.00),
('LAB-KFT', 'Kidney Function Panel Laboratory Service', 'Lab', 1000.00),
('RAD-CXR', 'Chest X-Ray Diagnostic Service', 'Procedure', 800.00),
('RAD-ECG', 'Electrocardiogram 12-Lead Diagnostic Service', 'Procedure', 500.00),
('NUR-INJ', 'Nursing Intravenous / Intramuscular Administration', 'Nursing', 100.00),
('NUR-DRESS', 'Surgical Wound Dressing & Cleansing', 'Nursing', 300.00),
('PROC-NEB', 'Nebulization Therapy Session', 'Procedure', 200.00)
ON CONFLICT (service_code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7. HOSPITAL SYSTEM SETTINGS
-- ----------------------------------------------------------------------------
INSERT INTO hospital_settings (setting_key, setting_value, description) VALUES
('hospital_name', 'Apex Specialised Hospital & Medical Centre, Dhaka', 'Official registered healthcare facility name'),
('hospital_code', 'APEX-BD-2026', 'National DGHS accreditation code'),
('address', 'Plot 15, Road 27, Block A, Dhanmondi, Dhaka-1209, Bangladesh', 'Facility physical address'),
('currency', 'BDT', 'Operational financial transaction currency'),
('currency_symbol', '৳', 'Financial display symbol'),
('tax_rate_percent', '5.0', 'Applicable value-added tax percentage on hospital services'),
('emergency_phone', '+880-2-9660011', '24/7 Rapid Emergency Response Helpline'),
('inpatient_checkout_time', '12:00:00', 'Standard daily bed billing cutoff time'),
('version', '2.0.0', 'Hospital Management System Release Version')
ON CONFLICT (setting_key) DO UPDATE 
SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP;
