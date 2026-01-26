#!/usr/bin/env python3
"""
Test runner script for digital signature tests.

This script provides an easy way to run just the digital signature model tests
with various options.
"""

import subprocess
import sys
from pathlib import Path


def run_signature_tests(verbose: bool = True, coverage: bool = False, markers: str = None):
    """Run digital signature tests with specified options"""

    # Base command
    cmd = ["uv", "run", "pytest", "tests/test_signature_model.py"]

    # Add verbosity
    if verbose:
        cmd.append("-v")

    # Add markers if specified
    if markers:
        cmd.extend(["-m", markers])

    # Add coverage if requested (requires pytest-cov)
    if coverage:
        cmd.extend([
            "--cov=app.models.signature",
            "--cov=app.schemas.signature",
            "--cov-report=term-missing"
        ])

    # Add short traceback for cleaner output
    cmd.append("--tb=short")

    print(f"Running command: {' '.join(cmd)}")
    print("-" * 60)

    # Run the tests
    result = subprocess.run(cmd, cwd=Path(__file__).parent.parent)
    return result.returncode


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Run digital signature tests")
    parser.add_argument("-q", "--quiet", action="store_true", help="Run with minimal output")
    parser.add_argument("-c", "--coverage", action="store_true", help="Run with coverage report")
    parser.add_argument("-m", "--markers", help="Run tests with specific markers (e.g., 'unit')")

    args = parser.parse_args()

    exit_code = run_signature_tests(
        verbose=not args.quiet,
        coverage=args.coverage,
        markers=args.markers
    )

    sys.exit(exit_code)
