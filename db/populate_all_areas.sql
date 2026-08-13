-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Optionally, clear existing data if we want a fresh start, 
-- but let's keep branch-1 as it might be used by default admin.
-- Let's just insert new data.

-- 1. Insert Branches
INSERT IGNORE INTO branches (id, name, location, status) VALUES
('branch-2', 'Colombo', 'Western Province', 'active'),
('branch-3', 'Kandy', 'Central Province', 'active'),
('branch-4', 'Galle', 'Southern Province', 'active'),
('branch-5', 'Jaffna', 'Northern Province', 'active');

-- 2. Insert Departments
INSERT IGNORE INTO departments (id, name, description, status) VALUES
('dept-1', 'Engineering', 'Software and systems engineering', 'active'),
('dept-2', 'Finance', 'Financial management and accounting', 'active'),
('dept-3', 'HR', 'Human resources management', 'active'),
('dept-4', 'Operations', 'Business operations and logistics', 'active'),
('dept-5', 'Marketing', 'Marketing and communications', 'active');

-- 3. Insert Roles
INSERT IGNORE INTO roles (id, title, department_id, description, status) VALUES
('role-1', 'Software Engineer', 'dept-1', 'Mid-level software development', 'active'),
('role-2', 'QA Engineer', 'dept-1', 'Quality assurance and testing', 'active'),
('role-3', 'Accountant', 'dept-2', 'Handles financial records', 'active'),
('role-4', 'HR Manager', 'dept-3', 'Manages HR operations', 'active'),
('role-5', 'Operations Lead', 'dept-4', 'Leads operational activities', 'active'),
('role-6', 'Marketing Specialist', 'dept-5', 'Handles marketing campaigns', 'active');

-- 4. Insert Employees (Covering all Branches and Roles)
-- We will add one employee for each role in each branch (4 new branches + 1 default branch * 6 roles = 30 employees)

-- Branch 1 (Headquarters)
INSERT IGNORE INTO employees (id, name, secret_code, role_id, branch_id, status) VALUES
('emp-101', 'Alice HqEng', 'SEC101', 'role-1', 'branch-1', 'active'),
('emp-107', 'David Miller', 'SEC107', 'role-1', 'branch-1', 'active'),
('emp-102', 'Bob HqQA', 'SEC102', 'role-2', 'branch-1', 'active'),
('emp-103', 'Charlie HqFin', 'SEC103', 'role-3', 'branch-1', 'active'),
('emp-104', 'Diana HqHR', 'SEC104', 'role-4', 'branch-1', 'active'),
('emp-105', 'Eve HqOps', 'SEC105', 'role-5', 'branch-1', 'active'),
('emp-106', 'Frank HqMkt', 'SEC106', 'role-6', 'branch-1', 'active');

-- Branch 2 (Colombo)
INSERT IGNORE INTO employees (id, name, secret_code, role_id, branch_id, status) VALUES
('emp-201', 'Grace ColEng', 'SEC201', 'role-1', 'branch-2', 'active'),
('emp-202', 'Hank ColQA', 'SEC202', 'role-2', 'branch-2', 'active'),
('emp-203', 'Ivy ColFin', 'SEC203', 'role-3', 'branch-2', 'active'),
('emp-204', 'Jack ColHR', 'SEC204', 'role-4', 'branch-2', 'active'),
('emp-205', 'Karen ColOps', 'SEC205', 'role-5', 'branch-2', 'active'),
('emp-206', 'Leo ColMkt', 'SEC206', 'role-6', 'branch-2', 'active');

-- Branch 3 (Kandy)
INSERT IGNORE INTO employees (id, name, secret_code, role_id, branch_id, status) VALUES
('emp-301', 'Mia KanEng', 'SEC301', 'role-1', 'branch-3', 'active'),
('emp-302', 'Noah KanQA', 'SEC302', 'role-2', 'branch-3', 'active'),
('emp-303', 'Olivia KanFin', 'SEC303', 'role-3', 'branch-3', 'active'),
('emp-304', 'Paul KanHR', 'SEC304', 'role-4', 'branch-3', 'active'),
('emp-305', 'Quinn KanOps', 'SEC305', 'role-5', 'branch-3', 'active'),
('emp-306', 'Ryan KanMkt', 'SEC306', 'role-6', 'branch-3', 'active');

-- Branch 4 (Galle)
INSERT IGNORE INTO employees (id, name, secret_code, role_id, branch_id, status) VALUES
('emp-401', 'Sophia GalEng', 'SEC401', 'role-1', 'branch-4', 'active'),
('emp-402', 'Tom GalQA', 'SEC402', 'role-2', 'branch-4', 'active'),
('emp-403', 'Uma GalFin', 'SEC403', 'role-3', 'branch-4', 'active'),
('emp-404', 'Victor GalHR', 'SEC404', 'role-4', 'branch-4', 'active'),
('emp-405', 'Wendy GalOps', 'SEC405', 'role-5', 'branch-4', 'active'),
('emp-406', 'Xander GalMkt', 'SEC406', 'role-6', 'branch-4', 'active');

-- Branch 5 (Jaffna)
INSERT IGNORE INTO employees (id, name, secret_code, role_id, branch_id, status) VALUES
('emp-501', 'Yara JafEng', 'SEC501', 'role-1', 'branch-5', 'active'),
('emp-502', 'Zack JafQA', 'SEC502', 'role-2', 'branch-5', 'active'),
('emp-503', 'Amy JafFin', 'SEC503', 'role-3', 'branch-5', 'active'),
('emp-504', 'Brian JafHR', 'SEC504', 'role-4', 'branch-5', 'active'),
('emp-505', 'Chloe JafOps', 'SEC505', 'role-5', 'branch-5', 'active'),
('emp-506', 'Daniel JafMkt', 'SEC506', 'role-6', 'branch-5', 'active');

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
