-- Meridian Student Operations - Database Schema
-- Run this file in your PostgreSQL database to create the structure

CREATE TABLE employees (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL, -- 'admin' or 'employee'
    title VARCHAR(100),
    department VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Active',
    password_hash VARCHAR(255),
    last_active TIMESTAMP,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    avatar_hue INT DEFAULT 0
);

CREATE TABLE students (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone1 VARCHAR(50),
    phone2 VARCHAR(50),
    country VARCHAR(100) NOT NULL,
    intake VARCHAR(50) NOT NULL,
    branch VARCHAR(100),
    college VARCHAR(255),
    employee_id VARCHAR(50) REFERENCES employees(id),
    status VARCHAR(100) NOT NULL,
    payment_status VARCHAR(50) NOT NULL,
    cgpa DECIMAL(4,2),
    ielts DECIMAL(3,1),
    toefl INT,
    duolingo INT,
    german_grade DECIMAL(3,1),
    gre INT,
    german_language VARCHAR(50),
    gmail_id VARCHAR(255),
    gmail_password VARCHAR(255),
    recovery_number VARCHAR(50),
    device VARCHAR(100),
    two_step BOOLEAN DEFAULT FALSE,
    aps_username VARCHAR(100),
    aps_password VARCHAR(100),
    uni_assist_id VARCHAR(100),
    uni_assist_password VARCHAR(100),
    total_fee INT DEFAULT 0,
    paid_amount INT DEFAULT 0,
    discount INT DEFAULT 0,
    lead_type VARCHAR(50),
    b2b_org VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE universities (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    country VARCHAR(100) NOT NULL,
    course VARCHAR(255) NOT NULL,
    branch VARCHAR(100) NOT NULL,
    intake VARCHAR(50) NOT NULL,
    ielts DECIMAL(3,1),
    toefl INT,
    german_language VARCHAR(50),
    gre VARCHAR(50),
    german_grade DECIMAL(3,1),
    application_via VARCHAR(100),
    application_fee INT,
    deadline TIMESTAMP,
    tuition_fees INT,
    moi BOOLEAN DEFAULT FALSE,
    documents_courier VARCHAR(100),
    aptitude_test VARCHAR(100),
    archived BOOLEAN DEFAULT FALSE
);

CREATE TABLE applications (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) REFERENCES students(id) ON DELETE CASCADE,
    university_id VARCHAR(50) REFERENCES universities(id) ON DELETE CASCADE,
    course VARCHAR(255) NOT NULL,
    country VARCHAR(100) NOT NULL,
    status VARCHAR(100) NOT NULL,
    offer_received BOOLEAN DEFAULT FALSE,
    deadline TIMESTAMP,
    employee_id VARCHAR(50) REFERENCES employees(id),
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) REFERENCES students(id) ON DELETE CASCADE,
    total_fee INT NOT NULL,
    initial_payment INT NOT NULL,
    remaining INT NOT NULL,
    discount INT DEFAULT 0,
    status VARCHAR(50) NOT NULL,
    method VARCHAR(100),
    last_payment TIMESTAMP
);

CREATE TABLE leads (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    country VARCHAR(100) NOT NULL,
    intake VARCHAR(50) NOT NULL,
    employee_id VARCHAR(50) REFERENCES employees(id),
    type VARCHAR(50) NOT NULL,
    b2b_org VARCHAR(255),
    pipeline VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_events (
    id VARCHAR(50) PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_name VARCHAR(100),
    user_id VARCHAR(50),
    role VARCHAR(50),
    action VARCHAR(50) NOT NULL,
    module VARCHAR(50) NOT NULL,
    record_id VARCHAR(50),
    before_state TEXT,
    after_state TEXT,
    details TEXT,
    severity VARCHAR(20),
    ip_address VARCHAR(50),
    user_agent TEXT
);

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix VARCHAR(30) NOT NULL,
    type VARCHAR(30) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NULL,
    last_used_at TIMESTAMP NULL,
    revoked_at TIMESTAMP NULL,
    scopes JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
