#!/bin/bash
# 部署静态演示到 /docs 目录

set -e

echo "📦 准备部署静态演示..."

# 确保在项目根目录
cd "$(dirname "$0")/.."

# 清理旧的演示文件
echo "🧹 清理旧的演示文件..."
rm -rf docs/demos

# 复制演示文件
echo "📋 复制演示文件..."
mkdir -p docs/demos
cp -r examples/tutorial-02/demos docs/demos/spatial
cp -r examples/tutorial-04/demos docs/demos/offline
cp -r examples/projects/demos docs/demos/projects

echo "✅ 静态演示已复制到 /docs/demos/"
echo "   - 空间谓词: docs/demos/spatial/"
echo "   - 离线地图: docs/demos/offline/"
echo "   - 专题应用: docs/demos/projects/"
echo ""
echo "📝 下一步："
echo "   1. 检查文件：ls -la docs/demos/"
echo "   2. 本地测试：python3 -m http.server 8000 --directory docs"
echo "   3. 提交更改：git add docs && git commit -m 'feat: 添加 GitHub Pages 静态演示'"
echo "   4. 推送触发部署：git push origin main"
