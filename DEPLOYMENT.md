# Deployment Guide

Complete guide for deploying READXX to production environments.

## Overview

READXX consists of:
- **Frontend:** Chrome Extension (static distribution)
- **Backend:** Spring Boot API (containerized)
- **Database:** PostgreSQL (managed service)
- **Cache:** Redis (managed service)

## Deployment Options

### Option 1: Railway.app (Recommended - Fastest)

**Pros:**
- Simple GitHub integration
- Auto-deploys on push to master
- Managed PostgreSQL & Redis
- Free tier available

**Setup:**

1. **Create Railway Account:**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create Project:**
   - New Project → Deploy from GitHub repo
   - Select `Erik02T/READXX`

3. **Configure Services:**
   - Railway auto-creates PostgreSQL and Redis
   - Set environment variables:
     ```
     SPRING_PROFILES_ACTIVE=prod
     JWT_SECRET=<generate-strong-key>
     OPENAI_API_KEY=<your-api-key>
     ALLOWED_ORIGINS=chrome-extension://YOUR_EXTENSION_ID
     ```

4. **Build Configuration:**
   - Railway reads `railway.json`
   - Builds from `backend/Dockerfile`
   - Auto-restarts on health check failure

5. **Deploy Chrome Extension:**
   - Build with production API URL:
     ```bash
     VITE_API_BASE_URL=https://your-railway-domain.up.railway.app npm run build
     ```
   - Upload to Chrome Web Store (see below)

**Cost Estimate:** ~$20-50/month (after free credits)

---

### Option 2: Docker Compose (VPS/Server)

**Pros:**
- Full control
- Can run on any Linux server
- Cheaper than managed services

**Setup:**

1. **Server Prerequisites:**
   - Ubuntu 22.04 LTS
   - Docker & Docker Compose installed
   - 2GB RAM minimum
   - 10GB disk space
   - HTTPS certificate (Let's Encrypt)

2. **Prepare Environment File:**
   ```bash
   # Create .env.production
   SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/readxx?sslmode=require
   SPRING_DATASOURCE_USERNAME=readxx_user
   SPRING_DATASOURCE_PASSWORD=<generate-strong-password>

   SPRING_REDIS_HOST=redis
   SPRING_REDIS_PORT=6379
   SPRING_REDIS_PASSWORD=<generate-strong-password>

   JWT_SECRET=<generate-base64-256-bit-key>
   OPENAI_API_KEY=<your-api-key>
   ALLOWED_ORIGINS=chrome-extension://YOUR_EXTENSION_ID
   SPRING_PROFILES_ACTIVE=prod
   ```

3. **Create Production Docker Compose:**
   ```yaml
   # docker-compose.prod.yml
   version: '3.8'
   services:
     postgres:
       image: postgres:16-alpine
       environment:
         POSTGRES_USER: ${SPRING_DATASOURCE_USERNAME}
         POSTGRES_PASSWORD: ${SPRING_DATASOURCE_PASSWORD}
         POSTGRES_DB: readxx
       volumes:
         - postgres-data:/var/lib/postgresql/data
       ports:
         - "5432:5432"
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U ${SPRING_DATASOURCE_USERNAME}"]
         interval: 10s
         timeout: 5s
         retries: 5

     redis:
       image: redis:7-alpine
       command: redis-server --requirepass ${SPRING_REDIS_PASSWORD}
       volumes:
         - redis-data:/data
       ports:
         - "6379:6379"
       healthcheck:
         test: ["CMD", "redis-cli", "ping"]
         interval: 10s
         timeout: 5s
         retries: 5

     backend:
       build:
         context: .
         dockerfile: backend/Dockerfile
       environment:
         - SPRING_DATASOURCE_URL=${SPRING_DATASOURCE_URL}
         - SPRING_DATASOURCE_USERNAME=${SPRING_DATASOURCE_USERNAME}
         - SPRING_DATASOURCE_PASSWORD=${SPRING_DATASOURCE_PASSWORD}
         - SPRING_REDIS_HOST=${SPRING_REDIS_HOST}
         - SPRING_REDIS_PORT=${SPRING_REDIS_PORT}
         - SPRING_REDIS_PASSWORD=${SPRING_REDIS_PASSWORD}
         - JWT_SECRET=${JWT_SECRET}
         - OPENAI_API_KEY=${OPENAI_API_KEY}
         - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
         - SPRING_PROFILES_ACTIVE=${SPRING_PROFILES_ACTIVE}
       ports:
         - "8080:8080"
       depends_on:
         postgres:
           condition: service_healthy
         redis:
           condition: service_healthy
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
         interval: 30s
         timeout: 10s
         retries: 3

   volumes:
     postgres-data:
     redis-data:
   ```

4. **Deploy:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

5. **Setup Nginx Reverse Proxy:**
   ```nginx
   upstream readxx_backend {
       server backend:8080;
   }

   server {
       listen 443 ssl http2;
       server_name api.readxx.app;

       ssl_certificate /etc/letsencrypt/live/api.readxx.app/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/api.readxx.app/privkey.pem;

       # HSTS
       add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

       location / {
           proxy_pass http://readxx_backend;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

---

### Option 3: Kubernetes (Enterprise)

For large-scale deployments, see `k8s/` directory (not included in this repo).

---

## Chrome Web Store Deployment

### Prerequisites

- Google Developer Account ($5 one-time fee)
- Production API URL configured
- Privacy Policy at `https://api.readxx.app/privacy`

### Steps

1. **Prepare Production Build:**
   ```bash
   VITE_API_BASE_URL=https://api.readxx.app npm run build
   ```

2. **Create ZIP Archive:**
   ```bash
   cd dist
   zip -r ../readxx-extension.zip .
   cd ..
   ```

3. **Upload to Chrome Web Store:**
   - Go to https://chrome.google.com/webstore/developer/dashboard
   - Click "New Item"
   - Upload `readxx-extension.zip`
   - Fill in store listing:
     - Title, short description, detailed description
     - Icon (128×128px)
     - Screenshots
     - Privacy policy
     - Category: Productivity
   - Submit for review (~24-48 hours)

4. **After Approval:**
   - Share store URL with users
   - Update extension ID in backend CORS
   - Re-build and deploy

---

## Monitoring & Maintenance

### Health Checks

```bash
# Check API health
curl https://api.readxx.app/actuator/health

# Check database connection
curl https://api.readxx.app/actuator/health/db

# Check Redis connection
curl https://api.readxx.app/actuator/health/redis
```

### Logs

**Railway:**
- Dashboard → Logs tab
- Real-time log streaming

**Docker Compose:**
```bash
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f postgres
docker-compose -f docker-compose.prod.yml logs -f redis
```

### Backups

**PostgreSQL:**
```bash
# Backup
docker-compose exec postgres pg_dump -U readxx readxx > backup.sql

# Restore
docker-compose exec -T postgres psql -U readxx readxx < backup.sql
```

**Redis:**
```bash
# Trigger save
docker-compose exec redis redis-cli BGSAVE
```

### Monitoring Metrics

Available at `/actuator/prometheus`:
- `http_requests_total` - Request count
- `http_request_duration_seconds` - Request latency
- `jvm_memory_used_bytes` - Memory usage
- `jvm_threads_live` - Thread count

**Setup Prometheus:**
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'readxx'
    static_configs:
      - targets: ['api.readxx.app/actuator/prometheus']
```

---

## Rollback Plan

### If deployment fails:

1. **Check logs immediately:**
   ```bash
   docker-compose logs backend | tail -100
   ```

2. **Verify database migrations:**
   - Check Flyway table in PostgreSQL
   - Ensure all migrations completed

3. **Rollback to previous version:**
   ```bash
   # Git rollback
   git revert HEAD
   git push
   ```

4. **Contact DB Support (if needed):**
   - Railway support: https://railway.app/support
   - Document error with logs

---

## Performance Tuning

### Database

```sql
-- Create indexes for search
CREATE INDEX idx_words_user_id ON words(user_id);
CREATE INDEX idx_words_created_at ON words(created_at DESC);

-- Analyze table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Redis

```bash
# Monitor Redis memory
redis-cli INFO memory

# Set memory limit
redis-cli CONFIG SET maxmemory 256mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Application

```yaml
# application-prod.yml tuning
server:
  tomcat:
    max-threads: 200
    min-spare-threads: 50

spring:
  jpa:
    hibernate:
      jdbc:
        batch_size: 20
        fetch_size: 50
```

---

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| 502 Bad Gateway | Backend crashed | Check `docker-compose logs backend` |
| Authentication fails | JWT_SECRET mismatch | Verify secret matches in all instances |
| Slow requests | DB queries | Add indexes, check `/actuator/metrics` |
| CORS errors | Origin mismatch | Update ALLOWED_ORIGINS with extension ID |
| High memory | Memory leak | Restart container, check GC logs |

---

## Security Checklist

Before production:

- [ ] JWT_SECRET is strong (256-bit base64)
- [ ] Database password is strong
- [ ] Redis password is set
- [ ] HTTPS certificate valid (not self-signed)
- [ ] HSTS header enabled
- [ ] CSP header correct
- [ ] CORS limited to extension origin
- [ ] Database backups enabled
- [ ] Monitoring/alerts configured
- [ ] Firewall rules restricted to necessary ports
- [ ] No debug logs in production
- [ ] Rate limiting active

---

**Need help? Check GitHub Issues or CONTRIBUTING.md**
