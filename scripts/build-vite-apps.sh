#!/bin/bash
# 构建 Vite 应用（用于 CI/CD）

set -e

echo "🔨 构建 Vite 应用..."

# 构建核心包
echo "构建 @webgeodb/core..."
cd "$(dirname "$0")/.."
pnpm --filter @webgeodb/core build

# 构建各个 Vite 应用
echo ""
echo "构建 offline-map..."
cd examples/tutorial-04/01-offline-map
pnpm install
npx vite build

cd ../../..
echo "构建 location-tracking..."
cd examples/tutorial-04/02-location-tracking
pnpm install
npx vite build

cd ../../..
echo "构建 fitness-tracker..."
cd examples/tutorial-04/03-fitness-tracker
pnpm install
npx vite build

cd ../../..
echo "构建 geo-fencing..."
cd examples/projects/geo-fencing
pnpm install
npx vite build

cd ../..
echo "构建 environmental-monitoring..."
cd examples/projects/environmental-monitoring
pnpm install
npx vite build

cd ../..
echo ""
echo "✅ 所有应用构建完成！"
