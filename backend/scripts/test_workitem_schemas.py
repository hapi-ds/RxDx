#!/usr/bin/env python3
"""
Quick test runner for WorkItem schemas.
This script can be used for continuous integration or quick validation.
"""

import sys
import subprocess
from pathlib import Path

def run_workitem_schema_tests():
    """Run all WorkItem schema tests and return success status"""
    
    # Change to backend directory
    backend_dir = Path(__file__).parent.parent
    
    print("🧪 Running WorkItem Schema Tests...")
    print("=" * 50)
    
    try:
        # Run the specific WorkItem schema tests
        result = subprocess.run([
            "uv", "run", "python", "-m", "pytest", 
            "tests/test_workitem_schemas.py",
            "-v",
            "--tb=short"
        ], 
        cwd=backend_dir,
        capture_output=True,
        text=True,
        timeout=60
        )
        
        print("STDOUT:")
        print(result.stdout)
        
        if result.stderr:
            print("STDERR:")
            print(result.stderr)
        
        if result.returncode == 0:
            print("\n✅ All WorkItem schema tests passed!")
            return True
        else:
            print(f"\n❌ Tests failed with return code: {result.returncode}")
            return False
            
    except subprocess.TimeoutExpired:
        print("\n⏰ Tests timed out after 60 seconds")
        return False
    except Exception as e:
        print(f"\n💥 Error running tests: {e}")
        return False

def run_comprehensive_validation():
    """Run the comprehensive validation test specifically"""
    
    backend_dir = Path(__file__).parent.parent
    
    print("\n🔍 Running Comprehensive Validation Tests...")
    print("=" * 50)
    
    try:
        result = subprocess.run([
            "uv", "run", "python", "-m", "pytest", 
            "tests/test_workitem_schemas.py::TestComprehensiveWorkItemValidation",
            "-v"
        ], 
        cwd=backend_dir,
        capture_output=True,
        text=True,
        timeout=30
        )
        
        if result.returncode == 0:
            print("✅ Comprehensive validation tests passed!")
            return True
        else:
            print("❌ Comprehensive validation tests failed!")
            print(result.stdout)
            if result.stderr:
                print(result.stderr)
            return False
            
    except Exception as e:
        print(f"💥 Error running comprehensive tests: {e}")
        return False

if __name__ == "__main__":
    print("RxDx WorkItem Schema Test Runner")
    print("================================")
    
    # Run all tests
    all_tests_passed = run_workitem_schema_tests()
    
    # Run comprehensive validation
    comprehensive_passed = run_comprehensive_validation()
    
    # Summary
    print("\n📊 Test Summary:")
    print(f"   All WorkItem Tests: {'✅ PASSED' if all_tests_passed else '❌ FAILED'}")
    print(f"   Comprehensive Tests: {'✅ PASSED' if comprehensive_passed else '❌ FAILED'}")
    
    if all_tests_passed and comprehensive_passed:
        print("\n🎉 All WorkItem schema tests are working correctly!")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed. Please check the output above.")
        sys.exit(1)