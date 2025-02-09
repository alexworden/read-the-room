#!/bin/bash

# Create the database if it doesn't exist
psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname = 'readtheroom'" | grep -q 1 || psql -U postgres -c "CREATE DATABASE readtheroom"

# Create the user if it doesn't exist
psql -U postgres -c "SELECT 1 FROM pg_roles WHERE rolname = 'postgres'" | grep -q 1 || psql -U postgres -c "CREATE USER postgres WITH PASSWORD 'postgres'"

# Grant privileges
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE readtheroom TO postgres"

# Apply schema
psql -U postgres -d readtheroom -f ../backend/src/app/schema.sql
