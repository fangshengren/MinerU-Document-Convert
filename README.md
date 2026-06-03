# Document Rule Manager

基于 MinerU 的文档规则管理系统 — 支持多种文档格式解析、Markdown 转换、云端存储与规则查询。

---

## 项目架构

```
project/
├── app.py                  # Flask API 后端 (端口 5000)
├── minerU.py               # MinerU v1 单文件解析模块
├── mixOperation.py         # 转换 + 存储组合工作流
├── documentsOperation.py   # Appwrite Storage 文件操作
├── databaseOperation.py    # Appwrite TablesDB 数据存取
├── gradio_app.py           # Gradio 前端 (旧版，端口 7860)
├── requirements.txt        # Python 依赖
├── .env                    # 环境变量 (密钥、配置)
├── file/                   # 源文件目录
├── markdownResult/         # 转换结果目录
│
└── front/                  # Next.js 前端 (新版)
    ├── src/app/            # 页面路由
    │   ├── convert/        # 转换与存储
    │   ├── query/          # 规则查询
    │   ├── documents/      # 文档管理
    │   └── info/           # 系统信息
    ├── src/components/     # UI 组件
    ├── src/lib/            # API 客户端 & 工具
    └── src/types/          # TypeScript 类型定义
```

---

## 功能概览

| 功能 | 说明 |
|---|---|
| **文件转换** | 通过 MinerU API 将 PDF/Word/PPT/Excel/图片/HTML 转换为 Markdown |
| **云端存储** | 源文件与 Markdown 结果上传至 Appwrite Storage |
| **规则录入** | 文件 + 票据类型 + 公司名称 → 自动转换并入库 |
| **规则查询** | 按票据类型 + 公司名称检索，支持 Markdown 预览 |
| **文档管理** | 浏览、上传、下载、删除 Appwrite 中的文件 |
| **暗色模式** | 支持明/暗主题切换，跟随系统设置 |

### 支持的文档格式

| 格式 | 扩展名 |
|---|---|
| PDF | `.pdf` |
| Word | `.doc`, `.docx` |
| PowerPoint | `.ppt`, `.pptx` |
| Excel | `.xls`, `.xlsx` |
| 图片 | `.png`, `.jpg`, `.jpeg`, `.jp2`, `.webp`, `.gif`, `.bmp` |
| HTML | `.html`, `.htm` |
| 纯文本 | `.txt`, `.md` |

---

## 快速开始

### 1. 环境准备

- **Python 3.10+** (推荐使用 Conda 环境)
- **Node.js 18+** (前端需要)
- **MinerU API Token** — 注册获取: [https://mineru.net](https://mineru.net)
- **Appwrite 账号** — 用于云端存储: [https://appwrite.io](https://appwrite.io)

### 2. 克隆项目

```bash
git clone <repo-url>
cd Document_Recall
```

### 3. 配置环境变量

复制并编辑 `.env` 文件：

```bash
# MinerU 文档解析
MINERU_TOKEN=your_mineru_token_here

# Appwrite 存储
APPWRITE_KEY=your_appwrite_api_key
PROJECT_ID=your_project_id
DATABASE_ID=your_database_id
TABLE_FILE_STORE_ID=your_table_id
BUCKET_ID=your_bucket_id
```

### 4. 安装 Python 依赖

```bash
pip install -r requirements.txt
```

### 5. 启动后端

```bash
python app.py
# Flask 运行在 http://localhost:5000
```

### 6. 启动前端 (新版)

```bash
cd front
npm install
npm run dev
# Next.js 运行在 http://localhost:3000
```

打开浏览器访问 `http://localhost:3000`。

> **旧版 Gradio 前端** (可选):
> ```bash
> python gradio_app.py
> # 运行在 http://localhost:7860
> ```

---

## API 接口

### 文件转换

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/api/convert-and-store` | 上传文件 → 转换 → 存储 Appwrite → 入库 |
| `POST` | `/api/convert-upload` | 上传文件并同步转换 |
| `POST` | `/api/convert` | 异步批量转换 (file/ 目录) |
| `GET` | `/api/status/<task_id>` | 查询异步任务状态 |
| `GET` | `/api/tasks` | 列出所有任务 |

### 规则查询

| 方法 | 路径 | 参数 |
|---|---|---|
| `GET` | `/api/query-rules` | `?billType=发票&companyName=某公司` |

### 文档存储 (Appwrite)

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/documents` | 列出所有文档 |
| `POST` | `/api/documents/upload` | 上传文档 (`multipart: file`) |
| `GET` | `/api/documents/<id>` | 下载文档 |
| `GET` | `/api/documents/<id>/info` | 文档元数据 |
| `DELETE` | `/api/documents/<id>` | 删除文档 |
| `GET` | `/api/documents/<id>/preview` | 文档预览缩略图 |

### 本地文件

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/files` | 列出源文件 |
| `GET` | `/api/results` | 列出转换结果 |
| `POST` | `/api/upload` | 上传文件至 file/ 目录 |
| `GET` | `/api/download/<filename>` | 下载转换后的文件 |

---

## 前端技术栈

| 技术 | 用途 |
|---|---|
| Next.js 16 (App Router) | 框架 |
| TypeScript | 类型安全 |
| Tailwind CSS v4 | 样式 |
| shadcn/ui | UI 组件库 |
| framer-motion | 动画 |
| next-themes | 暗色模式 |
| react-markdown | Markdown 渲染 |
| react-dropzone | 拖拽上传 |

### 前端页面

| 路由 | 页面 | 功能 |
|---|---|---|
| `/convert` | 转换与存储 | 上传文件、配置规则类型和公司、执行转换 |
| `/query` | 规则查询 | 按类型和公司搜索、Markdown 内容预览 |
| `/documents` | 文档管理 | 浏览/上传/下载/删除 Appwrite 文件 |
| `/info` | 系统信息 | API 端点列表、配置状态、支持的格式 |

---

## 项目工作流

### 转换与存储流程

```
用户上传文件(多选) → 填写规则类型 + 公司名称
                        ↓
              *.txt / *.md → 直接读取内容
              其他格式 → MinerU API 转换 → Markdown
                        ↓
              上传 Markdown 至 Appwrite Storage
              上传源文件至 Appwrite Storage
              写入元数据至 Appwrite TablesDB
                        ↓
                    返回处理结果
```

### 规则查询流程

```
输入规则类型 + 公司名称
        ↓
  查询 Appwrite TablesDB (billType + companyName)
        ↓
  获取匹配的 fileId → 从 Storage 下载 Markdown 内容
        ↓
  返回文件列表 → 用户选择 → 渲染 Markdown 预览
```

---

## 依赖项

### Python (requirements.txt)

```
flask>=3.0
flask-cors>=4.0
requests>=2.31
python-dotenv>=1.0
gradio>=4.0          # 旧版前端 (可选)
```

### Node.js (front/package.json)

```
next, react, react-dom
tailwindcss, @tailwindcss/postcss
class-variance-authority, clsx, tailwind-merge
framer-motion, next-themes
lucide-react, react-markdown, remark-gfm, react-dropzone
```

---

## 环境变量参考

| 变量 | 必填 | 说明 |
|---|---|---|
| `MINERU_TOKEN` | 是 | MinerU API 密钥 |
| `APPWRITE_KEY` | 是 | Appwrite API Key |
| `PROJECT_ID` | 是 | Appwrite 项目 ID |
| `DATABASE_ID` | 是 | Appwrite 数据库 ID |
| `TABLE_FILE_STORE_ID` | 是 | 文件元数据表 ID |
| `BUCKET_ID` | 是 | Appwrite 存储桶 ID |

---

## License

MIT
