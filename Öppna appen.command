#!/bin/bash
cd "$(dirname "$0")"
pkill -f 'http.server 8765' 2>/dev/null
python3 -m http.server 8765 &
sleep 0.5
open http://localhost:8765/index.html
