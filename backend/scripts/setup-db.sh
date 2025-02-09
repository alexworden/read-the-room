#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Drop and recreate the development database
psql -U postgres -c "DROP DATABASE IF EXISTS readtheroom_dev;"
psql -U postgres -c "CREATE DATABASE readtheroom_dev;"

# Apply the schema to development database
psql -U postgres -d readtheroom_dev -f "${SCRIPT_DIR}/../src/app/schema.sql"

# Drop and recreate the production database
psql -U postgres -c "DROP DATABASE IF EXISTS readtheroom;"
psql -U postgres -c "CREATE DATABASE readtheroom;"

# Apply the schema to production database
psql -U postgres -d readtheroom -f "${SCRIPT_DIR}/../src/app/schema.sql"
