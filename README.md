# 心晴地图 Xinqing Map

心晴地图是一个面向校园场景的情绪记录与地点社交平台。它把「地图」「心情日记」「地点动态」「信件互动」组合在一起，让用户围绕校园空间表达情绪、记录生活、发现同伴。

## 项目定位

这个项目不是通用地图应用，而是一个服务于校园心理与情绪表达的产品原型：

- 用校园地图承载地点内容与地标信息
- 用心情日历和趋势图记录情绪变化
- 用动态、帖子和信件建立轻量社交关系
- 用匿名或半匿名互动降低表达门槛

## 主要功能

### 地图主页

- 百度地图校园底图展示
- 校园边界裁切与遮罩处理
- 校园地标点位展示与详情卡片
- 主页顶部导航、个人入口、心情胶囊入口

### 心情记录

- 心情日历打卡
- 指定日期补卡与编辑
- 心情趋势统计页面

### 内容发布

- 按地点发布动态
- 支持图片上传
- 动态列表、详情、点赞等交互

### 社交互动

- 登录与注册
- 个人资料管理
- 萤火虫信件与 WebSocket 实时收信
- 小伴匹配、聊天等社交入口

## 技术栈

### 前端

- Vue 3 + TypeScript + Vite
- Vue Router
- Pinia
- Element Plus
- ECharts
- 百度地图 GL JSAPI

### 后端

- Spring Boot 3
- MyBatis
- MySQL
- Redis
- WebSocket
- Knife4j / SpringDoc
- 阿里云 OSS

## 目录结构

```text
xinqing_map/               # 前端项目
├─ src/
│  ├─ api/                 # 接口封装
│  ├─ components/          # 可复用组件
│  │  ├─ common/           # 全局通用组件（启动动画、全局通知层）
│  │  ├─ map/              # 地图相关组件
│  │  └─ modal/            # 弹窗类组件
│  ├─ router/              # 路由配置
│  ├─ stores/              # Pinia 状态
│  ├─ views/               # 路由页面（按领域分组）
│  │  ├─ auth/
│  │  ├─ map/
│  │  ├─ social/
│  │  ├─ profile/
│  │  ├─ chat/
│  │  ├─ mood/
│  │  └─ special/
│  └─ assets/              # 全局样式与静态资源
├─ mock/                   # 本地 mock 服务
└─ public/data/            # 地图边界等静态数据

xinqing_map_backend/       # 后端项目
├─ src/main/java/          # Spring Boot 业务代码
├─ src/main/resources/     # 配置文件与 MyBatis Mapper
└─ src/test/java/          # 测试代码
```

## 本地运行

### 1. 启动后端

进入后端目录并启动 Spring Boot 服务：

```sh
cd xinqing_map_backend
mvn spring-boot:run
```

后端默认端口为 `8080`，前端开发环境会通过 Vite 代理把 `/api` 转发到该地址。

### 2. 启动前端

进入前端目录并安装依赖：

```sh
cd xinqing_map
npm install
npm run dev
```

前端默认运行在 Vite 开发服务器地址。

### 3. 可选：启动 mock 服务

如果你只想快速查看接口返回或本地演示，可以单独启动 mock 服务：

```sh
npm run mock:server
```

mock 服务默认监听 `3001` 端口。

## 环境配置

### 前端

前端需要配置百度地图 AK。项目里使用 `.env.local`：

```env
VITE_BMAP_AK=你的百度地图AK
```

### 后端

后端配置位于 `xinqing_map_backend/src/main/resources/application.properties`，需要按你的本地环境修改：

- MySQL 连接信息
- Redis 连接信息
- 阿里云 OSS 配置
- AI 接口配置

## 常用脚本

在前端目录下：

```sh
npm run dev         # 启动开发服务
npm run build       # 类型检查并打包
npm run preview     # 预览生产构建结果
npm run mock:server # 启动 mock 接口服务
```

## 说明

- 首页地图使用百度地图 GL JSAPI，校园区域外内容通过边界遮罩完全隐藏。
- 首页做了缓存与并行加载优化，返回地图页时会比首次进入更快。
- 如果后端接口已启动，建议优先走真实接口；mock 仅用于演示或调试。

## 开发建议

- 推荐使用 VS Code + Vue Official(Volar)
- 需要 TypeScript 对 `.vue` 文件的支持时，请使用 `vue-tsc` 进行类型检查
