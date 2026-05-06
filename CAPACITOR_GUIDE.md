# 使用 Capacitor 打包为安卓 APK（本地操作指南）

> 说明：当前项目是纯前端/PWA，需要在你本地执行打包步骤生成 APK。以下步骤不需要改动项目源码。

## 1. 安装依赖（只需一次）

```bash
npm install -D @capacitor/cli
npm install -S @capacitor/core @capacitor/android
```

## 2. 初始化 Capacitor

```bash
npx cap init
```

初始化时建议填写：
- **App name**：江湖侠影录
- **App ID**：com.jianghu.adventure

## 3. 构建 Web 产物

```bash
npm run build
```

构建产物会输出到 `dist/`。

## 4. 添加 Android 平台

```bash
npx cap add android
```

## 5. 拷贝 Web 到 Android

```bash
npx cap copy android
```

## 6. 打开 Android Studio 生成 APK

```bash
npx cap open android
```

在 Android Studio 中：
1. **Build > Build Bundle(s) / APK(s) > Build APK(s)**
2. 等待完成，在提示中点击 **Locate** 找到 APK。

## 7. 安装 APK 到手机

将 APK 传到手机后安装即可。

---

## 常见问题

### 1) 真机安装失败
请确认开启了“未知来源”安装权限。

### 2) App 启动白屏
确保每次改动后执行：
```bash
npm run build
npx cap copy android
```

### 3) 图标/名称修改
如需自定义图标，请替换 `public/icon.svg`，然后重新构建与拷贝。

---

如需我继续帮你接入 Capacitor 配置文件或生成 Android Studio 项目结构，请告诉我。