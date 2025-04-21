#!/bin/bash

# 檢查 Python 版本
if command -v python3 &>/dev/null; then
    echo "使用 Python 3 啟動伺服器..."
    python3 -m http.server 8000
elif command -v python &>/dev/null; then
    echo "使用 Python 啟動伺服器..."
    python -m http.server 8000
else
    echo "錯誤: 未找到 Python"
    exit 1
fi 