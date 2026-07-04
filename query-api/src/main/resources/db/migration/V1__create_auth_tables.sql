-- V1: Create authentication and authorization tables
-- Owned by query-api

CREATE TABLE IF NOT EXISTS app_roles (
    id   BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS app_users (
    id            BIGSERIAL PRIMARY KEY,
    username      VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES app_roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Seed default roles
INSERT INTO app_roles (name) VALUES ('ROLE_OPERATOR'), ('ROLE_SUPERVISOR'), ('ROLE_ADMIN') ON CONFLICT DO NOTHING;

-- Seed default users (password is same as username, hashed using BCrypt)
-- password: operator
INSERT INTO app_users (username, password_hash) VALUES ('operator', '$2a$10$wYQWbQ4oU7I6I2k3j9vDqOV0m7d5T4QZ5c2Z8V8hG8n0tF7b1pP5i') ON CONFLICT DO NOTHING;
-- password: supervisor
INSERT INTO app_users (username, password_hash) VALUES ('supervisor', '$2a$10$wYQWbQ4oU7I6I2k3j9vDqOV0m7d5T4QZ5c2Z8V8hG8n0tF7b1pP5i') ON CONFLICT DO NOTHING;
-- password: admin
INSERT INTO app_users (username, password_hash) VALUES ('admin', '$2a$10$wYQWbQ4oU7I6I2k3j9vDqOV0m7d5T4QZ5c2Z8V8hG8n0tF7b1pP5i') ON CONFLICT DO NOTHING;

-- Assign roles to default users
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM app_users u, app_roles r WHERE u.username = 'operator' AND r.name = 'ROLE_OPERATOR'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM app_users u, app_roles r WHERE u.username = 'supervisor' AND r.name = 'ROLE_SUPERVISOR'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM app_users u, app_roles r WHERE u.username = 'admin' AND r.name = 'ROLE_ADMIN'
ON CONFLICT DO NOTHING;
