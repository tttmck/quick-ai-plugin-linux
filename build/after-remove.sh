#!/bin/bash
# After remove: update desktop database to remove stale entries
if command -v update-desktop-database &>/dev/null; then
    update-desktop-database -f /usr/share/applications 2>/dev/null || true
fi
