# Backend 部署操作文档（Docker + Caddy，同域名路径）

本文档面向：服务器上已有一个 Node 服务（端口 7001），并使用 Caddy 作为反向代理；希望把本项目后端再部署一份，通过同域名的路径访问（例如 `/api2`）。

---

## 1. 服务器准备

1) 安装 Docker 与 Docker Compose  
确保 `docker` 与 `docker compose` 可用。

2) 放通端口  
只需对外开放 80/443（Caddy 使用）。后端容器对外不直暴露端口也可以。

---

## 2. 拉取代码

```bash
git clone <你的仓库地址>
cd 0g
```

---

## 3. 配置环境变量

```bash
cp backend/.env.example backend/.env
```

然后编辑 `backend/.env`，重点字段：
- `DATABASE_URL`（即使在 compose 中会覆盖，也建议改成正确的值）
- `OG_COMPUTE_API_KEY`
- `STORAGE_PRIVATE_KEY`
- `OG_KV_STREAM_ID`
- `OG_KV_NODE_RPC`
- `ORACLE_PRIVATE_KEY`

---

## 4. 启动后端 + PostgreSQL

项目根目录执行：

```bash
docker compose up -d --build
```

首次启动后，同步数据库结构（一次性操作）：

```bash
docker compose exec backend npx prisma db push
```

检查日志：

```bash
docker compose logs -f backend
```

---

## 5. 配置 Caddy（同域名路径）

假设：
- 现有 Node 服务端口：`7001`
- 新后端容器端口映射：`3001`（docker-compose 已配置）
- 想用路径：`/api2`

将以下内容加入 Caddyfile（替换域名）：

```
example.com {
  @api2 path /api2/*
  handle @api2 {
    uri strip_prefix /api2
    reverse_proxy 127.0.0.1:3001
  }

  handle {
    reverse_proxy 127.0.0.1:7001
  }
}
```

重载 Caddy：

```bash
sudo caddy reload --config /etc/caddy/Caddyfile
```

---

## 6. 验证

```bash
curl -i https://example.com/api2/api/v1/health
```

如果返回 200/OK，则说明代理成功。

---

## 7. 常见问题

1) 数据库连接失败  
确保 `docker compose logs postgres` 没有报错，并且 `DATABASE_URL` 指向 `postgres:5432`。

2) 500 错误，Prisma denied access  
通常是数据库用户/权限问题。  
在 compose 中已经使用：
`postgresql://postgres:postgres@postgres:5432/og_prediction_market`
只要容器和数据库都在同一个 compose 网络里就没问题。

3) 同域名路径不生效  
检查 Caddyfile 是否使用了 `uri strip_prefix /api2`，否则后端会收到带前缀的路径。

---

## 8. 常用命令

```bash
# 重建并重启
docker compose up -d --build

# 仅重启后端
docker compose restart backend

# 查看后端日志
docker compose logs -f backend
```
