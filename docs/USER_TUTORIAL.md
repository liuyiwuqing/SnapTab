# SnapTab 使用教程 / User Tutorial

## 1) 安装 / Install

1. 运行 `pnpm build`
2. 打开 `chrome://extensions`
3. 开启开发者模式并加载 `dist` 目录

---

## 2) 快速截图 / Capture Quickly

点击扩展图标后可选：

- 标签页截图 (Tab)
- 全页面截图 (Full page)
- 区域截图 (Region)
- 元素截图 (Element)

截图完成后会自动打开编辑器。

---

## 3) 编辑截图 / Edit

编辑器支持：

- 裁剪
- 矩形标注
- 箭头标注
- 画笔自由标注
- 文字添加
- 撤销/重做

---

## 4) 套壳功能 / Frame Styles

### 内置套壳

- 设备壳（4 套）
- 浏览器壳（4 套）
- 边框壳（4 套）

### 自定义套壳

1. 上传 PNG/WebP 壳图
2. 调整安全区（x/y/width/height）
3. 导出时勾选应用套壳

---

## 5) 导出与分享 / Export & Share

- 保存本地：PNG/JPG
- 复制图片：直接贴到聊天工具
- 浏览器分享：系统支持时可一键分享
- 微信/QQ：扫描二维码分享页面链接

---

## 6) 常见问题 / FAQ

### Q1: 全页面截图为什么需要额外权限？

A: SnapTab 使用 Chrome DevTools Protocol 获取高保真整页截图，因此需要 `debugger` 权限。

### Q2: 图片是否上传到服务器？

A: 默认不会。SnapTab 按本地处理模式工作。

### Q3: 无法复制到剪贴板怎么办？

A: 扩展会先尝试标准 Clipboard API，失败时自动走 offscreen 兜底复制。
