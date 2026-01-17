-- Initialize Apache AGE extension for PostgreSQL
-- This script runs automatically when the PostgreSQL container starts

-- Create the AGE extension
CREATE EXTENSION IF NOT EXISTS age;

-- Load the AGE extension into the current database
LOAD 'age';

-- Set the search path to include the ag_catalog schema
SET search_path = ag_catalog, "$user", public;

-- Create the graph for RxDx
SELECT create_graph('rxdx_graph');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA ag_catalog TO rxdx;
GRANT ALL ON ALL TABLES IN SCHEMA ag_catalog TO rxdx;
GRANT ALL ON ALL SEQUENCES IN SCHEMA ag_catalog TO rxdx;

-- Create indexes for better performance
-- Note: AGE automatically creates indexes on vertex and edge IDs
-- Additional indexes can be added here as needed

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Apache AGE extension initialized successfully';
    RAISE NOTICE 'Graph "rxdx_graph" created';
END $$;
