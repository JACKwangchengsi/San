# 🏯 天玄江湖 — AI 驱动的武侠文字冒险游戏

> **Tianxuan Jianghu** — An AI-powered Wuxia text-adventure game system

React 18 + TypeScript + Vite 5 + Tailwind CSS 3 构建的沉浸式武侠世界，集成 LLM 大模型自动生成剧情，支持 ComfyUI 本地 AI 绘图，拥有完整的 NPC 生态、门派修炼、物品合成、世界模拟等子系统。

---

## ✨ 核心特性

### 🤖 AI 深度集成
- **LLM 剧情生成**：支持 OpenAI / Anthropic / SiliconFlow 等多家模型服务商，AI 实时生成江湖故事
- **智能解析引擎**：`aiSmartParser.ts` 自动解析 AI 输出中的物品、NPC 状态、属性变化、金钱变动、声望影响等数十种游戏数据
- **编排器**：`Orchestrator.ts` 校验 AI 响应的合法性，规范化名称、合并 NPC 更新、防止注入
- **自动 AI 交互**：一键开启自动请求 AI 生成，无需手动操作

### 🎨 ComfyUI 本地生图
- **场景图生成**：根据当前场景自动构建提示词，调用本地 ComfyUI 工作流生成场景图
- **角色立绘生成**：NPC 出场 / 玩家角色自动生成立绘头像
- **智能轮询**：含 10 秒容错回退机制，ComfyUI 完成生成后自动获取图片
- **IndexedDB 本地缓存**：图片持久化存储，避免重复生成

### ⚔️ 武侠世界系统
- **修炼体系**：炼气 → 筑基 → 金丹 → 元婴 → 化神 → 大乘，完整的修仙境界突破
- **武学系统**：多种武学招式，可修炼、突破、战斗中使用
- **门派江湖**：蜀山派、少林寺、丐帮、魔教等势力，声望与好感度双向联动
- **社交关系**：NPC 好感度、信任度、恋爱系统（送礼/表白/关怀）
- **物品合成**：材料采集 + 配方合成，产出武器/丹药/护甲

### 🌍 世界模拟
- **实时天气系统**：晴/雨/雪/雾/风/雷，影响战斗和移动
- **昼夜时辰**：十二时辰制（子丑寅卯…），NPC 有作息规律
- **市场经济**：物品价格随供需波动，可打工赚钱
- **随机遭遇**：探索中触发战斗、寻宝、NPC 事件

### 📱 多端适配
- **响应式设计**：桌面端 / 移动端自适应布局
- **PWA 离线可用**：Service Worker 缓存，可添加到手机主屏幕
- **触屏手势**：移动端优化交互

---

## 🛠 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 5 |
| CSS 框架 | Tailwind CSS 3 |
| 状态管理 | useReducer + Context API |
| 测试 | Vitest (40 个用例全部通过) |
| 图片缓存 | IndexedDB |
| 音效 | Web Audio API |
| PWA | Service Worker + Web Manifest |

---

## 📁 项目结构

```
├── src/
│   ├── components/        # 29 个 UI 组件
│   │   ├── AIConsole.tsx          # AI 控制台（核心交互）
│   │   ├── GameLayout.tsx         # 主布局 + AI 响应处理器
│   │   ├── NarrativeLog.tsx       # 叙事日志 + 对话渲染
│   │   ├── SceneImagePanel.tsx    # ComfyUI 生图面板
│   │   ├── StatsPanel.tsx         # 玩家状态面板 (Moodles 系统)
│   │   ├── NPCPanel.tsx           # NPC 面板 + 立绘管理
│   │   ├── ShopPanel.tsx          # 店铺面板 (食物/茶/客栈/打工)
│   │   ├── CultivationPanel.tsx   # 修炼面板
│   │   ├── CraftingPanel.tsx      # 合成面板
│   │   ├── WorldDetailPanel.tsx   # 世界详情 (声望/势力/物价)
│   │   ├── VisualMap.tsx          # 可视化地图
│   │   ├── Inventory.tsx          # 物品栏
│   │   ├── AdminPanel.tsx         # 后台管理 (存档/调试)
│   │   └── ...                   # 更多组件
│   ├── context/
│   │   └── GameContext.tsx        # 全局游戏状态 + Reducer (1000+ 行)
│   ├── systems/
│   │   ├── CultivationSystem.ts   # 修炼/武学数值计算
│   │   ├── RealisticWorld.ts      # 身体状态/市场/声望/遭遇
│   │   ├── WorldSimulation.ts     # 世界时间/NPC行为/天气
│   │   ├── Orchestrator.ts        # AI 响应编排校验
│   │   └── NPCPortraitProfile.ts  # NPC 立绘配置
│   ├── utils/
│   │   ├── aiSmartParser.ts       # AI 输出智能解析 (1000+ 行)
│   │   ├── aiHandler.ts           # AI 请求构造
│   │   ├── imageStore.ts          # IndexedDB 图片缓存
│   │   ├── portraitStorage.ts     # 立绘持久化
│   │   ├── itemVisuals.ts         # 物品视觉映射
│   │   └── ...
│   ├── hooks/
│   │   ├── useWorldTick.ts        # 世界时钟 Hook
│   │   └── useOrchestration.ts    # 编排器 Hook
│   ├── types/
│   │   └── game.ts                # 完整类型定义 (700+ 行)
│   └── __tests__/                 # 单元测试
├── public/
│   ├── icons/items/               # 物品 SVG 图标 (20+)
│   ├── sw.js                      # Service Worker
│   └── manifest.webmanifest       # PWA 清单
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 🚀 快速开始

### 前提条件
- Node.js >= 18
- (可选) ComfyUI 本地服务 — 用于 AI 生图

### 安装运行

```bash
# 克隆仓库
git clone https://github.com/JACKwangchengsi/San.git
cd San

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 运行测试
npm run test
```

### AI 配置

1. 启动游戏后进入右侧 **AI 标签**
2. 选择模型服务商 (SiliconFlow / OpenAI / Anthropic)
3. 填入 API 密钥 → 点击 **测试连接**
4. 勾选 **启用自动生成** → 保存
5. 打开 **🤖 自动AI交互** 开关即可开始

### ComfyUI 配置 (可选)

1. 启动 ComfyUI 服务，默认地址 `http://127.0.0.1:8188`
2. 在 **场景/立绘** 面板中填入工作流 JSON
3. 点击测试连接，成功后即可 AI 生图

---

## 🔧 优化记录

### 阶段 0-7：AI ↔ 子系统双向联动集成

| 阶段 | 内容 | 涉及文件 |
|------|------|----------|
| 0 | 全局架构审视与差距分析 | — |
| 1 | 增强 AI Context Prompt，注入修炼/合成/世界/社交完整上下文 | `AIConsole.tsx` |
| 2 | 扩展 `AIResponse` 类型 (11 个新字段) | `game.ts` |
| 3 | 增强 `aiSmartParser` 提取函数 (声望/食谱/关系/经济等) | `aiSmartParser.ts` |
| 4 | 完善 `handleAIUpdate` 处理所有新字段 | `GameLayout.tsx` |
| 5 | 子系统面板双向联动 (修炼/合成/世界/NPC/状态/店铺) | 6 个面板组件 |
| 6 | AI 指令模板增强 | `aiHandler.ts` |
| 7 | `tsc --noEmit` (0 错误) + `vitest run` (40/40 通过) | — |

### Bug 修复

| 问题 | 修复 |
|------|------|
| 盘缠与物品栏碎银数量不一致 | 移除初始物品栏中的货币物品，改为从 `player.currency` 单向同步 |
| ComfyUI 立绘生成后程序一直等待 | 移除 `Range: bytes=0-0` 探测头，增加 5s 超时 + 10s 容错回退 |

---

## 📄 许可证

MIT License — 详见 [LICENSE](LICENSE)

---

## 👤 作者

**JACKwangchengsi** — [GitHub](https://github.com/JACKwangchengsi)

