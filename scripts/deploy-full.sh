#!/bin/bash
# 完整部署脚本：静态演示 + Vite 应用构建

set -e

echo "🚀 WebGeoDB GitHub Pages 部署脚本"
echo "=================================="
echo ""

# 确保在项目根目录
cd "$(dirname "$0")/.."

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    pnpm install
fi

# 第一步：准备静态演示
echo ""
echo "📋 第一步：准备静态演示..."
rm -rf docs/demos
mkdir -p docs/demos
cp -r examples/tutorial-02/demos docs/demos/spatial
cp -r examples/tutorial-04/demos docs/demos/offline
cp -r examples/projects/demos docs/demos/projects
echo "✅ 静态演示已复制到 /docs/demos/"

# 第二步：构建核心包
echo ""
echo "📦 第二步：构建核心包..."
pnpm --filter @webgeodb/core build
echo "✅ 核心包构建完成"

# 第三步：构建 Vite 应用
echo ""
echo "🔨 第三步：构建 Vite 应用..."
echo "构建离线地图应用..."
cd examples/tutorial-04/01-offline-map
pnpm build
cd ../../..

echo "构建位置追踪应用..."
cd examples/tutorial-04/02-location-tracking
pnpm build
cd ../../..

echo "构建健身追踪应用..."
cd examples/tutorial-04/03-fitness-tracker
pnpm build
cd ../../..

echo "构建地理围栏应用..."
cd examples/projects/geo-fencing
pnpm build
cd ../../..

echo "构建环境监测应用..."
cd examples/projects/environmental-monitoring
pnpm build
cd ../../..

echo "✅ 所有 Vite 应用构建完成"

# 第四步：准备部署目录
echo ""
echo "📁 第四步：准备部署目录..."
rm -rf dist
mkdir -p dist

# 复制静态演示
cp -r examples/tutorial-02/demos dist/demos-spatial
cp -r examples/tutorial-04/demos dist/demos-offline
cp -r examples/projects/demos dist/demos-projects

# 复制 Vite 应用
cp -r examples/tutorial-04/01-offline-map/dist dist/apps/offline-map
cp -r examples/tutorial-04/02-location-tracking/dist dist/apps/location-tracking
cp -r examples/tutorial-04/03-fitness-tracker/dist dist/apps/fitness-tracker
cp -r examples/projects/geo-fencing/dist dist/apps/geo-fencing
cp -r examples/projects/environmental-monitoring/dist dist/apps/environmental

# 复制主页
cp docs/index.html dist/index.html

echo "✅ 部署目录准备完成："
echo "   - 静态演示: dist/demos-*/"
echo "   - Vite 应用: dist/apps/*/"
echo "   - 主页: dist/index.html"

# 第五步：本地测试（可选）
echo ""
echo "🧪 第五步：本地测试预览..."
echo "运行以下命令启动本地服务器："
echo "  python3 -m http.server 8000 --directory dist"
echo "然后访问: http://localhost:8000"
echo ""
echo "或使用 npx serve:"
echo "  npx serve dist"
echo ""

# 完成
echo "✅ 部署准备完成！"
echo ""
echo "📝 下一步："
echo "   1. 本地测试：python3 -m http.server 8000 --directory dist"
echo "   2. 测试通过后，提交更改："
echo "      git add ."
echo "      git commit -m 'feat: 准备 GitHub Pages 部署'"
echo "      git push origin main"
echo "   3. GitHub Actions 将自动构建并部署"
echo ""
