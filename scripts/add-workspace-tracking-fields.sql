-- Run once in the Supabase SQL editor for the shared Gleo project.
alter table workspaces add column if not exists service_location text;
alter table workspaces add column if not exists service_industry text;
