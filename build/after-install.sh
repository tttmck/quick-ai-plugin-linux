#!/bin/bash
# After install: update desktop database so the app appears in launcher
if command -v update-desktop-database &>/dev/null; then
    update-desktop-database -f /usr/share/applications 2>/dev/null || true
fi
