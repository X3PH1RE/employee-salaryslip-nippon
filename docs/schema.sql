-- Employee Salary Slip Automation — PostgreSQL Schema

CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    designation VARCHAR(255),
    birth_year INTEGER,
    department VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employees_employee_id ON employees(employee_id);

CREATE TABLE payroll_batches (
    id SERIAL PRIMARY KEY,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    filename VARCHAR(512),
    status VARCHAR(50) DEFAULT 'uploaded',
    record_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payroll_records (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER NOT NULL REFERENCES payroll_batches(id) ON DELETE CASCADE,
    employee_id_fk INTEGER NOT NULL REFERENCES employees(id),
    employee_code VARCHAR(50) NOT NULL,
    base_salary NUMERIC(12, 2) NOT NULL,
    hra NUMERIC(12, 2) DEFAULT 0,
    allowances NUMERIC(12, 2) DEFAULT 0,
    deductions NUMERIC(12, 2) DEFAULT 0,
    net_salary NUMERIC(12, 2) NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL
);

CREATE INDEX idx_payroll_records_batch ON payroll_records(batch_id);
CREATE INDEX idx_payroll_records_code ON payroll_records(employee_code);

CREATE TABLE payslip_jobs (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER NOT NULL REFERENCES payroll_batches(id),
    status VARCHAR(50) DEFAULT 'pending',
    total INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    failed INTEGER DEFAULT 0,
    celery_task_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP
);

CREATE TABLE payslip_documents (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES payslip_jobs(id) ON DELETE CASCADE,
    payroll_record_id INTEGER NOT NULL REFERENCES payroll_records(id),
    file_path VARCHAR(1024) NOT NULL,
    status VARCHAR(50) DEFAULT 'generated',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE email_deliveries (
    id SERIAL PRIMARY KEY,
    payslip_document_id INTEGER NOT NULL REFERENCES payslip_documents(id),
    employee_email VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    details TEXT,
    admin_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
