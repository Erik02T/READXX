# READXX Development & Deployment Setup

## Quick Start - Local Development

### Prerequisites
- Docker & Docker Compose installed
- Node.js 18+ and npm installed
- Java 21 and Maven 3.9+ installed
- Git installed

### 1. Start Services (PostgreSQL, Redis)

```bash
docker-compose -f docker-compose.dev.yml up -d
```

Verify all services are healthy:
```bash
docker-compose -f docker-compose.dev.yml ps
```

### 2. Build & Run Backend

```bash
cd backend
mvn clean package
java -jar target/readxx-backend-0.0.1-SNAPSHOT.jar
```

Backend will be available at `http://localhost:8080`

Check health: `http://localhost:8080/actuator/health`

### 3. Build Extension (Development)

```bash
npm run build:dev
```

This sets `VITE_API_BASE_URL=http://localhost:8080` for local API calls.

### 4. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `dist/` directory
5. Extension now appears in your toolbar

### 5. Run Smoke Tests

Follow the checklist in [TESTING.md](./TESTING.md) to verify all integrations.

---

## Stopping Services

```bash
docker-compose -f docker-compose.dev.yml down
```

To also remove volumes (clear database):
```bash
docker-compose -f docker-compose.dev.yml down -v
```

---

## Database & Redis Management

### Access PostgreSQL
```bash
docker-compose -f docker-compose.dev.yml exec postgres psql -U readxx -d readxx
```

### Access Redis
```bash
docker-compose -f docker-compose.dev.yml exec redis redis-cli -a devredis
```

---

## Production Deployment (Railway)

### Prerequisites
- Railway.app account
- Docker image pushed to registry (or connected GitHub repo)

### Deploy

1. Connect your repository to Railway
2. Railway automatically detects `railway.json` and uses it
3. Set environment variables:
   ```
   SPRING_DATASOURCE_URL=postgresql://<host>:<port>/<db>
   SPRING_DATASOURCE_USERNAME=<user>
   SPRING_DATASOURCE_PASSWORD=<password>
   SPRING_REDIS_HOST=<redis-host>
   SPRING_REDIS_PORT=6379
   SPRING_REDIS_PASSWORD=<redis-password>
   SPRING_JPA_HIBERNATE_DDL_AUTO=validate
   SPRING_PROFILES_ACTIVE=prod
   ```

4. Railway builds from `backend/Dockerfile`
   - Multi-stage build minimizes image size
   - Health checks at `/actuator/health`
   - Auto-restart on failure

---

## Docker Images

### Image Sizes (approximate)
- **postgres:16-alpine**: ~170MB
- **redis:7-alpine**: ~40MB
- **readxx-backend**: ~500MB (JRE + Spring Boot)

Total dev stack: ~700MB

### Building Backend Docker Manually

```bash
docker build -f backend/Dockerfile -t readxx-backend:latest .
docker run -p 8080:8080 readxx-backend:latest
```

---

## Troubleshooting

### "Connection refused" on backend startup
- Ensure PostgreSQL and Redis are healthy: `docker-compose ps`
- Check logs: `docker-compose logs postgres redis`

### Extension not loading data
- Verify `VITE_API_BASE_URL` is set to `http://localhost:8080`
- Check browser console for CORS errors
- Check backend logs: Spring should log incoming requests

### Port conflicts
- Change ports in `docker-compose.dev.yml` if 5432, 6379, or 8080 are in use
- Update `SPRING_DATASOURCE_URL` and `SPRING_REDIS_HOST` accordingly

### Database migrations not applied
- Ensure `flyway-database-postgresql` dependency is present (it is)
- Check `src/main/resources/db/migration` directory for SQL files

---

## Environment Variables Reference

### Backend (Spring Boot)
| Variable | Default | Purpose |
|----------|---------|---------|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/readxx` | PostgreSQL connection |
| `SPRING_DATASOURCE_USERNAME` | `readxx` | DB user |
| `SPRING_DATASOURCE_PASSWORD` | `devpassword` | DB password |
| `SPRING_REDIS_HOST` | `localhost` | Redis host |
| `SPRING_REDIS_PORT` | `6379` | Redis port |
| `SPRING_REDIS_PASSWORD` | `devredis` | Redis password |
| `SPRING_PROFILES_ACTIVE` | `dev` | Profile (dev/prod) |

### Extension (Build Time)
| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Backend API base URL |

---

## Next Steps
- [ ] Copy environment variables to `.env.local` if needed
- [ ] Run smoke tests from TESTING.md
- [ ] Set up IDE debugging (optional IntelliJ/VSCode configs)
- [ ] Configure pre-commit hooks for code quality checks
