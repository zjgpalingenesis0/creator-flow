# CreatorFlow

灵创工作台，一个 AI 内容生成与创作平台。

## 环境要求

- Docker Desktop
- nvm
- Node.js 24（项目根目录的 `.nvmrc` 已声明版本）
- pnpm 8.15.9

## 第一次启动

以下命令都从项目根目录开始执行。

### 1. 准备 Node.js

```bash
cd ~/creator-flow
nvm install
nvm use
node --version
```

`node --version` 应输出 `v24.x.x`。nvm 只切换当前终端，不会删除或覆盖本机其他 Node.js 版本。

### 2. 创建本地环境变量

```bash
cp .env.example .env
```

`.env` 只用于本地环境并已加入 `.gitignore`，不要提交其中的密码和密钥。首次创建后，除非配置发生变化，否则不需要重复复制。

### 3. 启动中间件

确保 Docker Desktop 已启动，然后执行：

```bash
docker compose up -d
docker compose ps
```

等待以下三个服务均显示 `healthy`：

- `postgres`：PostgreSQL，端口 `7311`
- `redis`：Redis，端口 `7312`
- `storage`：RustFS，S3 API 端口 `7313`，控制台端口 `7314`

### 4. 安装后端依赖

```bash
cd backend
pnpm install
```

### 5. 执行数据库迁移

```bash
pnpm db:migrate
```

该命令会执行尚未应用的 Drizzle migration。当前会创建 `users` 表；重复执行不会重复建表。

### 6. 启动开发服务

```bash
pnpm dev
```

开发服务监听 `http://127.0.0.1:7302`，源码变化后会自动重启。API 首次启动时还会自动创建 RustFS 的 `creator-flow` Bucket。

## 验证初始化结果

保持 `pnpm dev` 运行，在另一个终端执行：

```bash
curl http://127.0.0.1:7302/api
```

预期响应：

```json
{"name":"CreatorFlow API"}
```

检查 API 和中间件连通性：

```bash
curl -i http://127.0.0.1:7302/api/health
```

预期 HTTP 状态为 `200 OK`，响应为：

```json
{"api":"ok","database":"ok","redis":"ok","storage":"ok"}
```

如果任一依赖不可用，该接口会返回 HTTP 503，并在对应字段中显示错误类型。

还可以在浏览器打开 RustFS 控制台：

```text
http://localhost:7314
```

本地默认账号和密码可在 `.env` 及 `docker-compose.yml` 中查看。

## 后续启动

以后重新打开项目时，不需要重复初始化，只需执行：

```bash
cd ~/creator-flow
nvm use
docker compose up -d

cd backend
pnpm db:migrate
pnpm dev
```

如果拉取的新代码修改了 `package.json` 或 `pnpm-lock.yaml`，应在启动前补充执行：

```bash
pnpm install
```

## 运行测试

在 `backend` 目录执行：

```bash
pnpm test
pnpm typecheck
pnpm build
```

- `pnpm test`：运行单元测试。
- `pnpm typecheck`：执行 TypeScript 类型检查，不生成文件。
- `pnpm build`：将后端编译到 `backend/dist`。

验证编译产物时执行：

```bash
pnpm start
```

`pnpm dev` 和 `pnpm start` 都会占用端口 `7302`，不要同时运行。

## 修改数据库结构

修改 `backend/src/db/schema/` 下的 Drizzle Schema 后，依次执行：

```bash
cd ~/creator-flow/backend
pnpm db:generate
pnpm db:migrate
```

提交代码前应检查 `backend/migrations/` 中新生成的 SQL。

## 停止服务

在运行后端的终端按 `Ctrl+C` 停止 API，然后执行：

```bash
cd ~/creator-flow
docker compose stop
```

`docker compose stop` 只停止容器，数据库和对象存储数据仍保留。需要重新启动时再次执行 `docker compose up -d`。

如果执行：

```bash
docker compose down
```

会删除容器和网络，但仍保留具名数据卷。不要随意执行 `docker compose down -v`，因为 `-v` 会同时删除 PostgreSQL、Redis 和 RustFS 的本地数据。
