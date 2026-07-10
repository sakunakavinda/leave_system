-- 1. Branches Table
CREATE TABLE branches (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    location VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Departments Table
CREATE TABLE departments (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Roles Table
CREATE TABLE roles (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    department_id VARCHAR(36),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    UNIQUE (title, department_id)
);

-- 4. Employees Table
CREATE TABLE employees (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    secret_code VARCHAR(255) UNIQUE NOT NULL,
    role_id VARCHAR(36),
    branch_id VARCHAR(36),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT
);

-- 5. Managers Table
CREATE TABLE managers (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'manager',
    branch_id VARCHAR(36),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- 6. Leave Rules Table
CREATE TABLE leave_rules (
    id VARCHAR(36) PRIMARY KEY,
    role_id VARCHAR(36),
    branch_id VARCHAR(36),
    annual_leave INT DEFAULT 14,
    sick_leave INT DEFAULT 10,
    casual_leave INT DEFAULT 7,
    max_per_day INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    UNIQUE (role_id, branch_id)
);

-- 7. Leave Applications Table
CREATE TABLE leave_applications (
    id VARCHAR(36) PRIMARY KEY,
    employee_id VARCHAR(36),
    substitute_employee_id VARCHAR(36),
    leave_type VARCHAR(50) NOT NULL,
    applied_date DATE NOT NULL,
    returning_date DATE NOT NULL,
    substitute_confirmed BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (substitute_employee_id) REFERENCES employees(id) ON DELETE SET NULL
);

-- 8. Leave Application Dates Table
CREATE TABLE leave_application_dates (
    id VARCHAR(36) PRIMARY KEY,
    leave_application_id VARCHAR(36),
    leave_date DATE NOT NULL,
    FOREIGN KEY (leave_application_id) REFERENCES leave_applications(id) ON DELETE CASCADE,
    UNIQUE (leave_application_id, leave_date)
);

-- 9. Leave Balances Table
CREATE TABLE leave_balances (
    id VARCHAR(36) PRIMARY KEY,
    employee_id VARCHAR(36),
    year INT NOT NULL,
    annual_taken INT DEFAULT 0,
    sick_taken INT DEFAULT 0,
    casual_taken INT DEFAULT 0,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE (employee_id, year)
);

-- 10. Settings Table
CREATE TABLE settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value MEDIUMTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
