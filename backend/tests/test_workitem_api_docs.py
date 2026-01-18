"""Tests for WorkItem API documentation and OpenAPI schema"""

import pytest
from fastapi.openapi.utils import get_openapi
from fastapi.testclient import TestClient

from app.main import app


class TestWorkItemAPIDocumentation:
    """Test WorkItem API documentation and OpenAPI schema"""
    
    def test_openapi_schema_generation(self):
        """Test that OpenAPI schema can be generated without errors"""
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        
        assert schema is not None
        assert "openapi" in schema
        assert "info" in schema
        assert "paths" in schema
    
    def test_workitem_endpoints_in_openapi_schema(self):
        """Test that all WorkItem endpoints are documented in OpenAPI schema"""
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        
        paths = schema["paths"]
        
        # Check that all expected WorkItem endpoints are present
        expected_endpoints = [
            "/api/v1/workitems",
            "/api/v1/workitems/{workitem_id}",
            "/api/v1/workitems/{workitem_id}/history",
            "/api/v1/workitems/{workitem_id}/version/{version}"
        ]
        
        for endpoint in expected_endpoints:
            assert endpoint in paths, f"Endpoint {endpoint} not found in OpenAPI schema"
    
    def test_workitem_endpoints_http_methods(self):
        """Test that WorkItem endpoints have correct HTTP methods"""
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        
        paths = schema["paths"]
        
        # Test /api/v1/workitems endpoint
        workitems_path = "/api/v1/workitems"
        assert "get" in paths[workitems_path], "GET method missing from /workitems"
        assert "post" in paths[workitems_path], "POST method missing from /workitems"
        
        # Test /api/v1/workitems/{workitem_id} endpoint
        workitem_detail_path = "/api/v1/workitems/{workitem_id}"
        assert "get" in paths[workitem_detail_path], "GET method missing from /workitems/{id}"
        assert "patch" in paths[workitem_detail_path], "PATCH method missing from /workitems/{id}"
        assert "delete" in paths[workitem_detail_path], "DELETE method missing from /workitems/{id}"
        
        # Test history endpoint
        history_path = "/api/v1/workitems/{workitem_id}/history"
        assert "get" in paths[history_path], "GET method missing from /workitems/{id}/history"
        
        # Test version endpoint
        version_path = "/api/v1/workitems/{workitem_id}/version/{version}"
        assert "get" in paths[version_path], "GET method missing from /workitems/{id}/version/{version}"
    
    def test_workitem_endpoints_have_summaries(self):
        """Test that all WorkItem endpoints have proper summaries"""
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        
        paths = schema["paths"]
        
        # Check that endpoints have summaries
        endpoints_methods = [
            ("/api/v1/workitems", "get"),
            ("/api/v1/workitems", "post"),
            ("/api/v1/workitems/{workitem_id}", "get"),
            ("/api/v1/workitems/{workitem_id}", "patch"),
            ("/api/v1/workitems/{workitem_id}", "delete"),
            ("/api/v1/workitems/{workitem_id}/history", "get"),
            ("/api/v1/workitems/{workitem_id}/version/{version}", "get"),
        ]
        
        for path, method in endpoints_methods:
            endpoint_data = paths[path][method]
            assert "summary" in endpoint_data, f"Summary missing for {method.upper()} {path}"
            assert endpoint_data["summary"], f"Empty summary for {method.upper()} {path}"
    
    def test_workitem_endpoints_have_tags(self):
        """Test that WorkItem endpoints are properly tagged"""
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        
        paths = schema["paths"]
        
        # Check that WorkItem endpoints have the correct tag
        workitem_endpoints = [
            ("/api/v1/workitems", "get"),
            ("/api/v1/workitems", "post"),
            ("/api/v1/workitems/{workitem_id}", "get"),
            ("/api/v1/workitems/{workitem_id}", "patch"),
            ("/api/v1/workitems/{workitem_id}", "delete"),
            ("/api/v1/workitems/{workitem_id}/history", "get"),
            ("/api/v1/workitems/{workitem_id}/version/{version}", "get"),
        ]
        
        for path, method in workitem_endpoints:
            endpoint_data = paths[path][method]
            assert "tags" in endpoint_data, f"Tags missing for {method.upper()} {path}"
            assert "workitems" in endpoint_data["tags"], f"'workitems' tag missing for {method.upper()} {path}"
    
    def test_workitem_post_endpoint_request_body(self):
        """Test that POST /workitems has proper request body schema"""
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        
        post_endpoint = schema["paths"]["/api/v1/workitems"]["post"]
        
        # Check request body is defined
        assert "requestBody" in post_endpoint, "Request body missing for POST /workitems"
        
        request_body = post_endpoint["requestBody"]
        assert "content" in request_body
        assert "application/json" in request_body["content"]
        
        json_content = request_body["content"]["application/json"]
        assert "schema" in json_content
        
        # Check that the schema references WorkItemCreate
        schema_ref = json_content["schema"]
        assert "$ref" in schema_ref
        assert "WorkItemCreate" in schema_ref["$ref"]
    
    def test_workitem_endpoints_response_schemas(self):
        """Test that WorkItem endpoints have proper response schemas"""
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        
        paths = schema["paths"]
        
        # Test GET /workitems returns list of WorkItemResponse
        get_workitems = paths["/api/v1/workitems"]["get"]
        assert "responses" in get_workitems
        assert "200" in get_workitems["responses"]
        
        success_response = get_workitems["responses"]["200"]
        assert "content" in success_response
        assert "application/json" in success_response["content"]
        
        # Test POST /workitems returns WorkItemResponse
        post_workitems = paths["/api/v1/workitems"]["post"]
        assert "responses" in post_workitems
        assert "201" in post_workitems["responses"]
        
        # Test GET /workitems/{id} returns WorkItemResponse
        get_workitem = paths["/api/v1/workitems/{workitem_id}"]["get"]
        assert "responses" in get_workitem
        assert "200" in get_workitem["responses"]
        assert "404" in get_workitem["responses"]  # Not found response
    
    def test_workitem_endpoints_security_requirements(self):
        """Test that WorkItem endpoints have security requirements"""
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        
        paths = schema["paths"]
        
        # All WorkItem endpoints should require authentication
        workitem_endpoints = [
            ("/api/v1/workitems", "get"),
            ("/api/v1/workitems", "post"),
            ("/api/v1/workitems/{workitem_id}", "get"),
            ("/api/v1/workitems/{workitem_id}", "patch"),
            ("/api/v1/workitems/{workitem_id}", "delete"),
            ("/api/v1/workitems/{workitem_id}/history", "get"),
            ("/api/v1/workitems/{workitem_id}/version/{version}", "get"),
        ]
        
        for path, method in workitem_endpoints:
            endpoint_data = paths[path][method]
            
            # Check that endpoint has security requirements
            assert "security" in endpoint_data, f"Security requirements missing for {method.upper()} {path}"
            
            # Should have at least one security requirement
            assert len(endpoint_data["security"]) > 0, f"No security requirements for {method.upper()} {path}"
    
    def test_workitem_get_endpoint_query_parameters(self):
        """Test that GET /workitems has proper query parameters documented"""
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        
        get_endpoint = schema["paths"]["/api/v1/workitems"]["get"]
        
        # Check parameters are defined
        assert "parameters" in get_endpoint, "Parameters missing for GET /workitems"
        
        parameters = get_endpoint["parameters"]
        param_names = [param["name"] for param in parameters]
        
        # Check that expected query parameters are documented
        expected_params = ["search", "type", "status", "assigned_to", "created_by", "priority", "limit", "offset"]
        
        for param in expected_params:
            assert param in param_names, f"Query parameter '{param}' not documented"
        
        # Check that parameters have proper descriptions
        for param in parameters:
            assert "description" in param, f"Description missing for parameter '{param['name']}'"
            assert param["description"], f"Empty description for parameter '{param['name']}'"
    
    def test_api_docs_endpoint_accessible(self):
        """Test that the API documentation endpoint is accessible"""
        client = TestClient(app)
        
        # Test that /api/docs is accessible
        response = client.get("/api/docs")
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
        
        # Test that /api/redoc is accessible
        response = client.get("/api/redoc")
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
        
        # Test that /api/openapi.json is accessible
        response = client.get("/api/openapi.json")
        assert response.status_code == 200
        assert "application/json" in response.headers["content-type"]
        
        # Verify the OpenAPI JSON is valid
        openapi_data = response.json()
        assert "openapi" in openapi_data
        assert "info" in openapi_data
        assert "paths" in openapi_data
    
    def test_workitem_schemas_in_components(self):
        """Test that WorkItem schemas are properly defined in components"""
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
        )
        
        # Check that components section exists
        assert "components" in schema
        assert "schemas" in schema["components"]
        
        components = schema["components"]["schemas"]
        
        # Check that WorkItem-related schemas are defined
        expected_schemas = [
            "WorkItemCreate",
            "WorkItemUpdate", 
            "WorkItemResponse",
            "ValidationError",  # For error responses
        ]
        
        for schema_name in expected_schemas:
            assert schema_name in components, f"Schema '{schema_name}' not found in components"
        
        # Check that WorkItemResponse has required properties
        workitem_response = components["WorkItemResponse"]
        assert "properties" in workitem_response
        
        required_properties = ["id", "type", "title", "status", "version", "created_by", "created_at", "updated_at"]
        for prop in required_properties:
            assert prop in workitem_response["properties"], f"Property '{prop}' missing from WorkItemResponse"