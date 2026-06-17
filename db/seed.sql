-- Database Seed Script for Leave Management System
-- This script inserts mock data into the database for testing and development.
-- Note: In a real system, passwords and secret codes should be properly hashed (e.g., using bcrypt).

-- Clear existing data (Cascade deletes dependents)
TRUNCATE TABLE leave_balances, leave_application_dates, leave_applications, leave_rules, managers, employees, roles, departments, branches RESTART IDENTITY CASCADE;

-- 1. Insert Branches
INSERT INTO branches (id, name, location, status) VALUES
('a1111111-1111-1111-1111-111111111111', 'Colombo', 'Western Province', 'active'),
('a1111111-1111-1111-1111-111111111112', 'Kandy', 'Central Province', 'active'),
('a1111111-1111-1111-1111-111111111113', 'Galle', 'Southern Province', 'active'),
('a1111111-1111-1111-1111-111111111114', 'Jaffna', 'Northern Province', 'inactive'),
('a1111111-1111-1111-1111-111111111115', 'Negombo', 'Western Province', 'active');

-- 2. Insert Departments
INSERT INTO departments (id, name, description, status) VALUES
('b2222222-2222-2222-2222-222222222221', 'Engineering', 'Software and systems engineering', 'active'),
('b2222222-2222-2222-2222-222222222222', 'Finance', 'Financial management and accounting', 'active'),
('b2222222-2222-2222-2222-222222222223', 'HR', 'Human resources management', 'active'),
('b2222222-2222-2222-2222-222222222224', 'Operations', 'Business operations and logistics', 'active'),
('b2222222-2222-2222-2222-222222222225', 'Marketing', 'Marketing and communications', 'inactive');

-- 3. Insert Roles
INSERT INTO roles (id, title, department_id, description, status) VALUES
('c3333333-3333-3333-3333-333333333331', 'Senior Engineer', 'b2222222-2222-2222-2222-222222222221', 'Leads engineering projects and mentors juniors', 'active'),
('c3333333-3333-3333-3333-333333333332', 'Junior Developer', 'b2222222-2222-2222-2222-222222222221', 'Entry-level development role', 'active'),
('c3333333-3333-3333-3333-333333333333', 'Software Engineer', 'b2222222-2222-2222-2222-222222222221', 'Mid-level software development', 'active'),
('c3333333-3333-3333-3333-333333333334', 'Accountant', 'b2222222-2222-2222-2222-222222222222', 'Handles financial records and reporting', 'active'),
('c3333333-3333-3333-3333-333333333335', 'HR Manager', 'b2222222-2222-2222-2222-222222222223', 'Manages HR operations and staff welfare', 'active'),
('c3333333-3333-3333-3333-333333333336', 'Operations Lead', 'b2222222-2222-2222-2222-222222222224', 'Leads operational activities and team coordination', 'active'),
('c3333333-3333-3333-3333-333333333337', 'Marketing Specialist', 'b2222222-2222-2222-2222-222222222225', 'Handles marketing campaigns and brand strategy', 'inactive');

-- 4. Insert Employees
INSERT INTO employees (id, name, secret_code_hash, role_id, branch_id, status) VALUES
('d4444444-4444-4444-4444-444444444441', 'John Doe', '12345678', 'c3333333-3333-3333-3333-333333333331', 'a1111111-1111-1111-1111-111111111111', 'active'),
('d4444444-4444-4444-4444-444444444442', 'Jane Smith', '23456789', 'c3333333-3333-3333-3333-333333333334', 'a1111111-1111-1111-1111-111111111112', 'active'),
('d4444444-4444-4444-4444-444444444443', 'Alex Johnson', '34567890', 'c3333333-3333-3333-3333-333333333335', 'a1111111-1111-1111-1111-111111111113', 'active'),
('d4444444-4444-4444-4444-444444444444', 'Sarah Williams', '45678901', 'c3333333-3333-3333-3333-333333333336', 'a1111111-1111-1111-1111-111111111115', 'active'),
('d4444444-4444-4444-4444-444444444445', 'Michael Brown', '56789012', 'c3333333-3333-3333-3333-333333333332', 'a1111111-1111-1111-1111-111111111114', 'inactive');

-- 5. Insert Managers
INSERT INTO managers (id, username, password_hash, role, branch_id, status) VALUES
('e5555555-5555-5555-5555-555555555551', 'johndoe', 'password', 'manager', 'a1111111-1111-1111-1111-111111111111', 'active'),
('e5555555-5555-5555-5555-555555555552', 'janesmith', 'password', 'super manager', 'a1111111-1111-1111-1111-111111111112', 'active'),
('e5555555-5555-5555-5555-555555555553', 'alexj', 'password', 'manager', 'a1111111-1111-1111-1111-111111111113', 'active'),
('e5555555-5555-5555-5555-555555555554', 'sarahw', 'password', 'super manager', 'a1111111-1111-1111-1111-111111111115', 'active'),
('e5555555-5555-5555-5555-555555555555', 'michaelb', 'password', 'manager', 'a1111111-1111-1111-1111-111111111114', 'inactive');

-- 6. Insert Leave Rules (Example for Senior Engineer in Colombo)
INSERT INTO leave_rules (role_id, branch_id, annual_leave, sick_leave, casual_leave, max_per_day, status) VALUES
('c3333333-3333-3333-3333-333333333331', 'a1111111-1111-1111-1111-111111111111', 20, 10, 7, 1, 'active'),
('c3333333-3333-3333-3333-333333333332', 'a1111111-1111-1111-1111-111111111111', 14, 10, 7, 2, 'active'),
('c3333333-3333-3333-3333-333333333334', 'a1111111-1111-1111-1111-111111111112', 16, 10, 7, 1, 'active');

-- 7. Insert Sample Leave Application (John Doe in Colombo)
INSERT INTO leave_applications (id, employee_id, substitute_employee_id, leave_type, applied_date, returning_date, substitute_confirmed, status) VALUES
('f6666666-6666-6666-6666-666666666661', 'd4444444-4444-4444-4444-444444444441', 'd4444444-4444-4444-4444-444444444443', 'annual', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 days', true, 'approved');

-- 8. Insert Leave Application Dates
INSERT INTO leave_application_dates (leave_application_id, leave_date) VALUES
('f6666666-6666-6666-6666-666666666661', CURRENT_DATE + INTERVAL '1 day'),
('f6666666-6666-6666-6666-666666666661', CURRENT_DATE + INTERVAL '2 days');

-- 9. Insert Leave Balances (John Doe)
INSERT INTO leave_balances (employee_id, year, annual_taken, sick_taken, casual_taken) VALUES
('d4444444-4444-4444-4444-444444444441', 2026, 2, 0, 0);

-- Query test outputs
-- SELECT name, location FROM branches;
-- SELECT e.name, r.title, b.name as branch FROM employees e JOIN roles r ON e.role_id = r.id JOIN branches b ON e.branch_id = b.id;
