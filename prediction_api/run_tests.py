#!/usr/bin/env python3
"""
Test runner for BudgetMe Prophet Prediction Service
Runs unit tests, integration tests, and generates coverage reports
"""

import sys
import os
import subprocess
import argparse
from pathlib import Path

def run_command(command, description=""):
    """Run a command and handle errors"""
    print(f"\n{'=' * 60}")
    print(f"Running: {description or command}")
    print(f"{'=' * 60}")
    
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            check=True, 
            capture_output=False,
            text=True
        )
        print(f"✅ Success: {description or command}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed: {description or command}")
        print(f"Error code: {e.returncode}")
        return False

def install_test_dependencies():
    """Install test dependencies"""
    print("Installing test dependencies...")
    
    commands = [
        "pip install -r test-requirements.txt",
        "pip install -e ."  # Install package in development mode
    ]
    
    for cmd in commands:
        if not run_command(cmd, f"Installing: {cmd}"):
            return False
    
    return True

def run_unit_tests():
    """Run unit tests"""
    cmd = "pytest tests/test_units.py -v --tb=short"
    return run_command(cmd, "Unit Tests")

def run_integration_tests():
    """Run integration tests"""
    cmd = "pytest tests/test_integration.py -v --tb=short"
    return run_command(cmd, "Integration Tests")

def run_all_tests():
    """Run all tests with coverage"""
    cmd = "pytest tests/ -v --tb=short --cov=prediction_api --cov-report=html --cov-report=term-missing"
    return run_command(cmd, "All Tests with Coverage")

def run_specific_test(test_pattern):
    """Run specific test pattern"""
    cmd = f"pytest -k '{test_pattern}' -v --tb=short"
    return run_command(cmd, f"Tests matching: {test_pattern}")

def run_performance_tests():
    """Run performance/benchmark tests"""
    cmd = "pytest tests/ -v --benchmark-only --benchmark-sort=mean"
    return run_command(cmd, "Performance Tests")

def run_with_markers(marker):
    """Run tests with specific markers"""
    cmd = f"pytest tests/ -v -m '{marker}' --tb=short"
    return run_command(cmd, f"Tests with marker: {marker}")

def generate_coverage_report():
    """Generate detailed coverage report"""
    commands = [
        "coverage html",
        "coverage report --show-missing",
        "coverage xml"  # For CI/CD systems
    ]
    
    print("\nGenerating coverage reports...")
    for cmd in commands:
        run_command(cmd, f"Coverage: {cmd}")

def lint_and_format():
    """Run linting and formatting tools"""
    commands = [
        "flake8 prediction_api/ tests/ --max-line-length=100",
        "mypy prediction_api/ --ignore-missing-imports",
        "black --check prediction_api/ tests/",
        "isort --check-only prediction_api/ tests/"
    ]
    
    print("Running code quality checks...")
    results = []
    for cmd in commands:
        results.append(run_command(cmd, f"Linting: {cmd}"))
    
    return all(results)

def clean_cache():
    """Clean test cache and temporary files"""
    import shutil
    
    cache_dirs = [
        ".pytest_cache",
        "__pycache__",
        ".coverage",
        "htmlcov",
        ".mypy_cache",
        "tests/__pycache__",
        "prediction_api/__pycache__"
    ]
    
    print("Cleaning cache and temporary files...")
    for cache_dir in cache_dirs:
        if os.path.exists(cache_dir):
            if os.path.isdir(cache_dir):
                shutil.rmtree(cache_dir)
                print(f"Removed directory: {cache_dir}")
            else:
                os.remove(cache_dir)
                print(f"Removed file: {cache_dir}")

def main():
    """Main test runner function"""
    parser = argparse.ArgumentParser(description="Prophet Prediction Service Test Runner")
    parser.add_argument(
        "test_type",
        choices=["unit", "integration", "all", "install", "clean", "lint", "coverage", "performance"],
        nargs="?",
        default="all",
        help="Type of tests to run"
    )
    parser.add_argument(
        "-k", "--keyword",
        help="Run tests matching keyword pattern"
    )
    parser.add_argument(
        "-m", "--marker", 
        help="Run tests with specific marker"
    )
    parser.add_argument(
        "--no-install",
        action="store_true",
        help="Skip dependency installation"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Verbose output"
    )
    
    args = parser.parse_args()
    
    # Change to project directory
    project_dir = Path(__file__).parent
    os.chdir(project_dir)
    
    print(f"Prophet Prediction Service Test Runner")
    print(f"Working directory: {os.getcwd()}")
    print(f"Python version: {sys.version}")
    
    # Install dependencies if requested
    if not args.no_install and args.test_type != "clean":
        if not install_test_dependencies():
            print("❌ Failed to install dependencies")
            sys.exit(1)
    
    # Set environment variables for testing
    os.environ["TESTING"] = "1"
    os.environ["LOG_LEVEL"] = "DEBUG" if args.verbose else "INFO"
    
    # Run tests based on type
    success = True
    
    if args.test_type == "clean":
        clean_cache()
    elif args.test_type == "install":
        success = install_test_dependencies()
    elif args.test_type == "lint":
        success = lint_and_format()
    elif args.test_type == "unit":
        success = run_unit_tests()
    elif args.test_type == "integration":
        success = run_integration_tests()
    elif args.test_type == "performance":
        success = run_performance_tests()
    elif args.test_type == "coverage":
        success = run_all_tests()
        generate_coverage_report()
    elif args.test_type == "all":
        success = run_all_tests()
    elif args.keyword:
        success = run_specific_test(args.keyword)
    elif args.marker:
        success = run_with_markers(args.marker)
    
    # Print summary
    print(f"\n{'=' * 60}")
    if success:
        print("✅ All tests completed successfully!")
        print("Coverage report available in htmlcov/index.html")
    else:
        print("❌ Some tests failed!")
        sys.exit(1)
    print(f"{'=' * 60}")

if __name__ == "__main__":
    main()