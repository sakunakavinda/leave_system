-- Database Seed Script for Leave Management System
-- This script inserts mock data into the database for testing and development.
-- Note: In a real system, passwords and secret codes should be properly hashed (e.g., using bcrypt).

-- Disable foreign key checks for truncation
SET FOREIGN_KEY_CHECKS = 0;

-- Clear existing data
TRUNCATE TABLE leave_balances;
TRUNCATE TABLE leave_application_dates;
TRUNCATE TABLE leave_applications;
TRUNCATE TABLE leave_rules;
TRUNCATE TABLE managers;
TRUNCATE TABLE employees;
TRUNCATE TABLE roles;
TRUNCATE TABLE departments;
TRUNCATE TABLE branches;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Insert Branches
INSERT INTO branches (id, name, location, status) VALUES
(1, 'Colombo', 'Western Province', 'active'),
(2, 'Kandy', 'Central Province', 'active'),
(3, 'Galle', 'Southern Province', 'active'),
(4, 'Jaffna', 'Northern Province', 'inactive'),
(5, 'Negombo', 'Western Province', 'active');

-- 2. Insert Departments
INSERT INTO departments (id, name, description, status) VALUES
(1, 'Engineering', 'Software and systems engineering', 'active'),
(2, 'Finance', 'Financial management and accounting', 'active'),
(3, 'HR', 'Human resources management', 'active'),
(4, 'Operations', 'Business operations and logistics', 'active'),
(5, 'Marketing', 'Marketing and communications', 'inactive');

-- 3. Insert Roles
INSERT INTO roles (id, title, department_id, description, status) VALUES
(1, 'Senior Engineer', 1, 'Leads engineering projects and mentors juniors', 'active'),
(2, 'Junior Developer', 1, 'Entry-level development role', 'active'),
(3, 'Software Engineer', 1, 'Mid-level software development', 'active'),
(4, 'Accountant', 2, 'Handles financial records and reporting', 'active'),
(5, 'HR Manager', 3, 'Manages HR operations and staff welfare', 'active'),
(6, 'Operations Lead', 4, 'Leads operational activities and team coordination', 'active'),
(7, 'Marketing Specialist', 5, 'Handles marketing campaigns and brand strategy', 'inactive');

-- 4. Insert Employees
INSERT INTO employees (id, name, secret_code_hash, role_id, branch_id, status) VALUES
(1, 'John Doe', '12345678', 1, 1, 'active'),
(2, 'Jane Smith', '23456789', 4, 2, 'active'),
(3, 'Alex Johnson', '34567890', 5, 3, 'active'),
(4, 'Sarah Williams', '45678901', 6, 5, 'active'),
(5, 'Michael Brown', '56789012', 2, 4, 'inactive');

-- 5. Insert Managers
INSERT INTO managers (id, username, password_hash, role, branch_id, status) VALUES
(1, 'johndoe', 'password', 'manager', 1, 'active'),
(2, 'janesmith', 'password', 'super manager', 2, 'active'),
(3, 'alexj', 'password', 'manager', 3, 'active'),
(4, 'sarahw', 'password', 'super manager', 5, 'active'),
(5, 'michaelb', 'password', 'manager', 4, 'inactive');

-- 6. Insert Leave Rules (Example for Senior Engineer in Colombo)
INSERT INTO leave_rules (role_id, branch_id, annual_leave, sick_leave, casual_leave, max_per_day, status) VALUES
(1, 1, 20, 10, 7, 1, 'active'),
(2, 1, 14, 10, 7, 2, 'active'),
(4, 2, 16, 10, 7, 1, 'active');

-- 7. Insert Sample Leave Application (John Doe in Colombo)
INSERT INTO leave_applications (id, employee_id, substitute_employee_id, leave_type, applied_date, returning_date, substitute_confirmed, status) VALUES
(1, 1, 3, 'annual', CURRENT_DATE(), DATE_ADD(CURRENT_DATE(), INTERVAL 3 DAY), true, 'approved');

-- 8. Insert Leave Application Dates
INSERT INTO leave_application_dates (leave_application_id, leave_date) VALUES
(1, DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY)),
(1, DATE_ADD(CURRENT_DATE(), INTERVAL 2 DAY));

-- 9. Insert Leave Balances (John Doe)
INSERT INTO leave_balances (employee_id, year, annual_taken, sick_taken, casual_taken) VALUES
(1, 2026, 2, 0, 0);

-- 10. Insert Settings
INSERT INTO settings (setting_key, setting_value) VALUES
('companyName', 'My Company'),
('allowCasualLeave', 'true');
