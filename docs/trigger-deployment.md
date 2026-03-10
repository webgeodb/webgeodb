# 手动触发 GitHub Actions 部署

## 方法 1：通过 GitHub 网页界面（最简单）

1. 访问 Actions 页面：
   ```
   https://github.com/webgeodb/webgeodb/actions
   ```

2. 在左侧选择 "Deploy to GitHub Pages" 工作流

3. 点击右侧的 "Run workflow" 按钮

4. 选择 "main" 分支

5. 点击绿色的 "Run workflow" 按钮

6. 等待部署完成（5-10 分钟）

---

## 方法 2：通过命令行（需要认证）

```bash
# 如果 gh CLI 已认证
gh workflow run deploy.yml

# 或者使用 API
gh api -X POST \
  repos/webgeodb/webgeodb/actions/workflows/deploy.yml/dispatches \
  -f ref=main
```

---

## 方法 3：创建空提交触发（推荐备选）

如果上面方法不行，创建一个空提交：

```bash
git commit --allow-empty -m "chore: 触发 GitHub Pages 部署"
git push origin main
```

---

## 验证部署状态

1. 查看 Actions 运行状态：
   ```
   https://github.com/webgeodb/webgeodb/actions
   ```

2. 查看部署历史：
   ```
   https://github.com/webgeodb/webgeodb/deployments
   ```

3. 部署完成后访问：
   ```
   https://zhyt1985.github.io/webgeodb/
   ```
