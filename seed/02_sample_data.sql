-- ============================================================================
-- HOSPITAL MANAGEMENT SYSTEM (HMS)
-- Sample Seed Data (Core Sample Set for pure SQL environments)
-- For complete massive dataset (thousands of rows), run: node seed/generate_data.js
-- ============================================================================

-- 1. Default Superuser & Clinical Accounts (Passwords are 'password123')
INSERT INTO users (username, email, password_hash, is_active) VALUES
('admin', 'admin@apex-hospital.org', '$2a$10$w82n58B0f0GZzJzGkZfVp.VpS9dZbX6qR9rS7p6Y5y6eZ9o0vN.2i', TRUE),
('dr.edward', 'dr.smith@apex-hospital.org', '$2a$10$w82n58B0f0GZzJzGkZfVp.VpS9dZbX6qR9rS7p6Y5y6eZ9o0vN.2i', TRUE),
('nurse.sarah', 'nurse.sarah@apex-hospital.org', '$2a$10$w82n58B0f0GZzJzGkZfVp.VpS9dZbX6qR9rS7p6Y5y6eZ9o0vN.2i', TRUE),
('reception.emily', 'reception@apex-hospital.org', '$2a$10$w82n58B0f0GZzJzGkZfVp.VpS9dZbX6qR9rS7p6Y5y6eZ9o0vN.2i', TRUE),
('lab.david', 'lab@apex-hospital.org', '$2a$10$w82n58B0f0GZzJzGkZfVp.VpS9dZbX6qR9rS7p6Y5y6eZ9o0vN.2i', TRUE),
('pharmacy.rachel', 'pharmacy@apex-hospital.org', '$2a$10$w82n58B0f0GZzJzGkZfVp.VpS9dZbX6qR9rS7p6Y5y6eZ9o0vN.2i', TRUE),
('finance.walter', 'finance@apex-hospital.org', '$2a$10$w82n58B0f0GZzJzGkZfVp.VpS9dZbX6qR9rS7p6Y5y6eZ9o0vN.2i', TRUE)
ON CONFLICT (username) DO NOTHING;

-- Map user roles
INSERT INTO user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM users u, roles r
WHERE (u.username = 'admin' AND r.role_name = 'Admin')
   OR (u.username = 'dr.edward' AND r.role_name = 'Doctor')
   OR (u.username = 'nurse.sarah' AND r.role_name = 'Nurse')
   OR (u.username = 'reception.emily' AND r.role_name = 'Receptionist')
   OR (u.username = 'lab.david' AND r.role_name = 'LaboratoryTechnician')
   OR (u.username = 'pharmacy.rachel' AND r.role_name = 'Pharmacist')
   OR (u.username = 'finance.walter' AND r.role_name = 'Accountant')
ON CONFLICT (user_id, role_id) DO NOTHING;
