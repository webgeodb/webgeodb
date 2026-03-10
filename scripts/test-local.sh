#!/bin/bash
# 本地测试 GitHub Pages 部署内容

echo "🧪 本地测试 GitHub Pages 部署"
echo "================================"
echo ""

# 检查 Python 是否安装
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 未安装，请先安装 Python3"
    exit 1
fi

# 使用 docs 目录测试（对应方式一）
echo "📁 测试方式一：/docs 目录（静态演示）"
echo "启动服务器：http://localhost:8000"
echo ""
echo "测试页面："
echo "  - 主页: http://localhost:8000/"
echo "  - 空间谓词: http://localhost:8000/demos/spatial/"
echo "  - 离线地图: http://localhost:8000/demos/offline/"
echo "  - 专题应用: http://localhost:8000/demos/projects/"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

cd "$(dirname "$0")/.."
python3 -m http.server 8000 --directory docs
