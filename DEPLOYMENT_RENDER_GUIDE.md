# 🚀 Guia de Deployment - READXX Backend no Render

## Pré-requisitos

- Conta no [Render](https://render.com)
- Repositório GitHub conectado ao Render
- [PostgreSQL Database no Render](#1-criar-postgresql-database)
- [Redis no Upstash](#2-criar-redis-upstash) (ou outro provedor)

---

## 1️⃣ Criar PostgreSQL Database

1. No [Render Dashboard](https://dashboard.render.com):
   - Clique em **"New +"** → **"PostgreSQL Database"**
   - Nome: `readxx-db`
   - Region: escolha uma região próxima
   - Clique em **"Create Database"**

2. Copie as credenciais fornecidas:
   - **Internal Database URL**: `postgresql://...` (use isso para `POSTGRES_URL`)
   - **User**: `readxx_user` (ou o nome fornecido)
   - **Password**: senha gerada (salve em local seguro)

---

## 2️⃣ Criar Redis (Upstash)

1. Acesse [Upstash Console](https://console.upstash.com)
2. Crie um novo Redis Database:
   - Nome: `readxx-redis`
   - Region: mesma região do Render se possível
   - Clique em **"Create"**

3. Copie as credenciais:
   - **Endpoint**: URL do Redis (ex: `redis-xxx.upstash.io`)
   - **Port**: `6379` (padrão)
   - **Password**: token de acesso fornecido

---

## 3️⃣ Configurar Variáveis de Ambiente no Render

Na página do serviço no Render Dashboard, adicione as seguintes variáveis de ambiente:

### Banco de Dados PostgreSQL
```
POSTGRES_URL = postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=require
POSTGRES_USER = readxx_user
POSTGRES_PASSWORD = [seu_password_do_banco]
```

### Redis (Upstash)
```
REDIS_HOST = redis-[region].upstash.io
REDIS_PORT = 6379
REDIS_PASSWORD = [seu_token_upstash]
REDIS_SSL = true
```

### Spring Boot
```
SPRING_PROFILES_ACTIVE = prod
HIBERNATE_DDL_AUTO = validate
JAVA_OPTS = -Xmx512M
```

### Segurança & APIs
```
JWT_SECRET = [gere uma string aleatória de 64+ caracteres]
OPENAI_API_KEY = [sua_chave_openai]
ALLOWED_ORIGINS = chrome-extension://[SEU_ID_EXTENSAO]
```

---

## 4️⃣ Conectar Repositório GitHub

1. No Render Dashboard, clique em **"New +"** → **"Web Service"**
2. Selecione seu repositório `READXX`
3. Preencha:
   - **Name**: `readxx-backend`
   - **Region**: mesma dos outros serviços
   - **Runtime**: Docker
   - **Build Command**: (deixe em branco)
   - **Start Command**: (deixe em branco)

4. Clique em **"Deploy"**

---

## 5️⃣ Monitorar o Deployment

- Acesse **Logs** para ver se há erros
- Aguarde o build completar
- Verifique o health check: `https://[seu_url].render.com/actuator/health`

---

## ⚠️ Troubleshooting

### Erro: `UnknownHostException: postgres`
- Verifique se `POSTGRES_URL` está configurada corretamente
- Use o **Internal Database URL** fornecido pelo Render

### Erro: `Failed to connect to Redis`
- Verifique credenciais do Upstash
- Certifique-se que `REDIS_SSL` está como `true`

### Erro: `JWT_SECRET not found`
- Gere um novo JWT_SECRET com: `openssl rand -base64 48`
- Adicione a variável no Render Dashboard

---

## 🔗 URLs Úteis

- [Render Dashboard](https://dashboard.render.com)
- [Upstash Console](https://console.upstash.com)
- [Seu Backend](https://readxx-backend.render.com) (após deploy)
