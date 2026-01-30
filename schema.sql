-- ===============================
-- WorkOS Database Schema (PostgreSQL)
-- Run this in pgAdmin to create all tables
-- ===============================

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS custom_field_values CASCADE;
DROP TABLE IF EXISTS custom_field_meta_data CASCADE;
DROP TABLE IF EXISTS category_followers CASCADE;
DROP TABLE IF EXISTS work_item_logs CASCADE;
DROP TABLE IF EXISTS work_items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Drop existing types (both old snake_case and new PascalCase)
DROP TYPE IF EXISTS work_item_status CASCADE;
DROP TYPE IF EXISTS work_item_priority CASCADE;
DROP TYPE IF EXISTS log_type CASCADE;
DROP TYPE IF EXISTS data_type CASCADE;
DROP TYPE IF EXISTS calculated_by CASCADE;
DROP TYPE IF EXISTS "WorkItemStatus" CASCADE;
DROP TYPE IF EXISTS "WorkItemPriority" CASCADE;
DROP TYPE IF EXISTS "LogType" CASCADE;
DROP TYPE IF EXISTS "DataType" CASCADE;
DROP TYPE IF EXISTS "CalculatedBy" CASCADE;

-- Create enums with PascalCase names (Prisma expects these exact names)
CREATE TYPE "WorkItemStatus" AS ENUM ('CAPTURED', 'THINKING', 'DECIDED', 'IN_PROGRESS', 'IN_REVIEW', 'CLOSED', 'ARCHIVED');
CREATE TYPE "WorkItemPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "LogType" AS ENUM ('status_change', 'comment', 'sync', 'ai_analysis', 'field_update');
CREATE TYPE "DataType" AS ENUM ('number', 'text', 'boolean', 'json');
CREATE TYPE "CalculatedBy" AS ENUM ('ai', 'user', 'system');

-- ===============================
-- 1. ORGANIZATIONS
-- ===============================
CREATE TABLE organizations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================
-- 2. CATEGORIES
-- ===============================
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    org_id BIGINT NOT NULL,
    key_name VARCHAR(255) NOT NULL,
    external_tool VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    created_by BIGINT,
    updated_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (org_id, key_name),
    FOREIGN KEY (org_id) REFERENCES organizations(id)
);

-- ===============================
-- 3. WORK ITEMS (TASKS / DOCS / ISSUES)
-- ===============================
CREATE TABLE work_items (
    id BIGSERIAL PRIMARY KEY,
    external_id VARCHAR(255),
    category_id BIGINT NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,

    status "WorkItemStatus" DEFAULT 'CAPTURED',
    priority "WorkItemPriority",

    assignee_id BIGINT,
    created_by BIGINT,
    updated_by BIGINT,

    start_date DATE,
    due_date DATE,

    parent_id BIGINT,
    root_parent_id BIGINT,
    doc_id VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (parent_id) REFERENCES work_items(id),
    FOREIGN KEY (root_parent_id) REFERENCES work_items(id)
);

-- ===============================
-- 4. WORK ITEM LOGS (AUDIT / AI / SYNC)
-- ===============================
CREATE TABLE work_item_logs (
    id BIGSERIAL PRIMARY KEY,
    work_item_id BIGINT NOT NULL,

    log_type "LogType",
    old_value TEXT,
    new_value TEXT,
    message TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (work_item_id) REFERENCES work_items(id)
);

-- ===============================
-- 5. CATEGORY FOLLOWERS
-- ===============================
CREATE TABLE category_followers (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (category_id, user_id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- ===============================
-- 6. CUSTOM FIELD METADATA (FIELD DEFINITIONS)
-- ===============================
CREATE TABLE custom_field_meta_data (
    id BIGSERIAL PRIMARY KEY,
    org_id BIGINT NOT NULL,
    category_id BIGINT NOT NULL,

    name VARCHAR(255) NOT NULL,
    key_name VARCHAR(255) NOT NULL,
    data_type "DataType" NOT NULL,
    enums TEXT,
    description TEXT,
    meta JSONB,

    created_by BIGINT,
    updated_by BIGINT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (org_id , category_id, key_name),
    FOREIGN KEY (org_id) REFERENCES organizations(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- ===============================
-- 7. CUSTOM FIELD VALUES (PER WORK ITEM)
-- ===============================
CREATE TABLE custom_field_values (
    id BIGSERIAL PRIMARY KEY,
    work_item_id BIGINT NOT NULL,
    custom_field_meta_data_id BIGINT NOT NULL,

    value_number DECIMAL(15,4),
    value_text TEXT,
    value_boolean BOOLEAN,
    value_json JSONB,

    calculated_by "CalculatedBy" DEFAULT 'ai',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (work_item_id, custom_field_meta_data_id),
    FOREIGN KEY (work_item_id) REFERENCES work_items(id),
    FOREIGN KEY (custom_field_meta_data_id) REFERENCES custom_field_meta_data(id)
);

-- ===============================
-- INDEXES FOR PERFORMANCE
-- ===============================
CREATE INDEX idx_work_items_category ON work_items(category_id);
CREATE INDEX idx_work_items_status ON work_items(status);
CREATE INDEX idx_work_items_assignee ON work_items(assignee_id);
CREATE INDEX idx_work_items_parent ON work_items(parent_id);
CREATE INDEX idx_work_items_root_parent ON work_items(root_parent_id);
CREATE INDEX idx_work_items_doc ON work_items(doc_id);

CREATE INDEX idx_custom_field_values_field ON custom_field_values(custom_field_meta_data_id);
CREATE INDEX idx_custom_field_values_work_item ON custom_field_values(work_item_id);

-- ===============================
-- DEMO DATA
-- ===============================
INSERT INTO organizations (id, name) VALUES (1, 'Demo Organization');

INSERT INTO categories (org_id, key_name, name) VALUES 
(1, 'general', 'General Tasks'),
(1, 'bugs', 'Bug Reports'),
(1, 'features', 'Feature Requests');

INSERT INTO work_items (category_id, title, description, status, priority) VALUES
(1, 'Setup project infrastructure', 'Initialize the project with proper folder structure and dependencies', 'IN_PROGRESS', 'HIGH'),
(1, 'Implement authentication', 'Add user authentication and authorization', 'CAPTURED', 'MEDIUM'),
(1, 'Design database schema', 'Create comprehensive database schema for work management', 'CLOSED', 'HIGH'),
(2, 'Fix login redirect issue', 'Users are not being redirected after successful login', 'CAPTURED', 'URGENT'),
(3, 'Add dark mode support', 'Implement dark mode theme for the application', 'THINKING', 'LOW');

-- ===============================
-- SUCCESS VERIFICATION
-- ===============================
SELECT 'Database schema created successfully!' AS status;
SELECT COUNT(*) AS organizations FROM organizations;
SELECT COUNT(*) AS categories FROM categories;
SELECT COUNT(*) AS work_items FROM work_items;
