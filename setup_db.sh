#!/bin/bash
docker exec genlayer-postgres-1 psql -U postgres -d grimoire -c "GRANT ALL ON SCHEMA public TO grimoire;"
docker exec genlayer-postgres-1 psql -U postgres -d grimoire -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO grimoire;"
echo "=== Schema grants done ==="
