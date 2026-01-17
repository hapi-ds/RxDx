-- Create test database for running tests
-- This ensures tests have a separate database from development

-- Create test database
CREATE DATABASE test_rxdx;

-- Connect to test database and initialize AGE
\c test_rxdx

-- Load the AGE extension
CREATE EXTENSION IF NOT EXISTS age;

-- Load the AGE extension into the search path
LOAD 'age';

-- Set the search path to include the ag_catalog schema
SET search_path = ag_catalog, "$user", public;

-- Create the graph for test database
SELECT create_graph('rxdx_graph');

-- Grant necessary permissions to the rxdx user
GRANT USAGE ON SCHEMA ag_catalog TO rxdx;
GRANT SELECT ON ALL TABLES IN SCHEMA ag_catalog TO rxdx;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA ag_catalog TO rxdx;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Test database initialized with Apache AGE extension';
    RAISE NOTICE 'Graph "rxdx_graph" created in test_rxdx database';
END $$;
