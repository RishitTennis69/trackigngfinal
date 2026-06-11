-- Store admin-visible login password for client accounts (hashed copy remains in password_hash).
alter table dashboard_credentials add column if not exists client_password text;
