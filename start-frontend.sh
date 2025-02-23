#!/bin/bash

# Get the local IP address and set both web and API hosts
export RTR_WEB_HOST=$(ifconfig | grep 'inet ' | grep -v 127.0.0.1 | awk '{print $2}')
export RTR_API_HOST=$RTR_WEB_HOST

# Set other environment variables if not already set
export RTR_WEB_PORT=${RTR_WEB_PORT:-4200}
export RTR_API_PORT=${RTR_API_PORT:-3000}
export RTR_WEB_PROTOCOL=${RTR_WEB_PROTOCOL:-http}
export RTR_API_PROTOCOL=${RTR_API_PROTOCOL:-http}

echo "Frontend Configuration:"
echo "- Web Host: $RTR_WEB_HOST"
echo "- Web Port: $RTR_WEB_PORT"
echo "- Web URL: $RTR_WEB_PROTOCOL://$RTR_WEB_HOST:$RTR_WEB_PORT"
echo "- API Host: $RTR_API_HOST"
echo "- API Port: $RTR_API_PORT"
echo "- API URL: $RTR_API_PROTOCOL://$RTR_API_HOST:$RTR_API_PORT"

# Change to web directory
cd web

# Start the frontend using nx serve with explicit host and port
npx nx serve web --configuration=development --host=$RTR_WEB_HOST --port=$RTR_WEB_PORT
