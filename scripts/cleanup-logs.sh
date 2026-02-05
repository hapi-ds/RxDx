#!/bin/bash
#
# Log Cleanup Script for RxDx
# Removes log files older than 7 days
#
# Usage: ./scripts/cleanup-logs.sh
#
# To run automatically, add to crontab:
#   0 2 * * * /path/to/rxdx/scripts/cleanup-logs.sh
#
# This will run daily at 2:00 AM

set -e

# Configuration
LOG_RETENTION_DAYS=7
BACKEND_LOG_DIR="backend/logs"
FRONTEND_LOG_DIR="frontend/logs"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=== RxDx Log Cleanup ==="
echo "Date: $(date)"
echo "Retention: ${LOG_RETENTION_DAYS} days"
echo ""

# Function to clean logs in a directory
cleanup_logs() {
    local log_dir="$1"
    local full_path="${PROJECT_ROOT}/${log_dir}"
    
    if [ ! -d "$full_path" ]; then
        echo "⚠ Directory not found: ${log_dir}"
        return
    fi
    
    echo "Cleaning: ${log_dir}"
    
    # Find and delete log files older than retention period
    local count=$(find "$full_path" -name "*.log*" -type f -mtime +${LOG_RETENTION_DAYS} 2>/dev/null | wc -l)
    
    if [ "$count" -gt 0 ]; then
        find "$full_path" -name "*.log*" -type f -mtime +${LOG_RETENTION_DAYS} -delete
        echo "✓ Deleted ${count} old log file(s)"
    else
        echo "✓ No old log files to delete"
    fi
    
    # Show current log file count and total size
    local total_files=$(find "$full_path" -name "*.log*" -type f 2>/dev/null | wc -l)
    local total_size=$(du -sh "$full_path" 2>/dev/null | cut -f1)
    echo "  Current: ${total_files} file(s), ${total_size} total"
    echo ""
}

# Clean backend logs
cleanup_logs "$BACKEND_LOG_DIR"

# Clean frontend logs (if directory exists)
cleanup_logs "$FRONTEND_LOG_DIR"

echo "=== Cleanup Complete ==="
echo ""

# Optional: Show disk usage
echo "Disk usage:"
df -h "${PROJECT_ROOT}" | tail -1
echo ""

exit 0
