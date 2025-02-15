#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Terminate existing connections to development database
psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'readtheroom_dev' AND pid <> pg_backend_pid();"

# Drop and recreate the development database
psql -U postgres -c "DROP DATABASE IF EXISTS readtheroom_dev WITH (FORCE);"
psql -U postgres -c "CREATE DATABASE readtheroom_dev;"

# Apply the schema to development database
psql -U postgres -d readtheroom_dev -f "${SCRIPT_DIR}/../src/app/schema.sql"

# Terminate existing connections to production database
psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'readtheroom' AND pid <> pg_backend_pid();"

# Drop and recreate the production database
psql -U postgres -c "DROP DATABASE IF EXISTS readtheroom WITH (FORCE);"
psql -U postgres -c "CREATE DATABASE readtheroom;"

# Apply the schema to production database
psql -U postgres -d readtheroom -f "${SCRIPT_DIR}/../src/app/schema.sql"
