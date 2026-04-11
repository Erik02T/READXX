# READXX Backend - Configuração Local para Testes

## Problemas corrigidos:

1. ✅ **Dockerfile corrigido** - Agora copia `backend/pom.xml` e `backend/src` corretamente
2. ✅ **.dockerignore criado** - Evita copiar desnecessariamente arquivos frontend
3. ⚠️ **Variáveis de ambiente** - Precisam estar configuradas no Render

## Para testar localmente com Docker:

### Criar arquivo `.env.local` na raiz:
```bash
POSTGRES_URL=jdbc:postgresql://localhost:5432/readxx
POSTGRES_USER=readxx_user
POSTGRES_PASSWORD=your_password
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
JWT_SECRET=UAf91pVPUyIskxo5eLfLlcLZyp+leSZAR3OncAGWKNmBxW7igDJwDQ8Rg6tmAimu
SPRING_PROFILES_ACTIVE=prod
HIBERNATE_DDL_AUTO=create
REDIS_SSL=false
OPENAI_API_KEY=
ALLOWED_ORIGINS=
```

### Docker Compose (para testes locais):
```bash
# Criar docker-compose.yml na raiz do projeto
docker-compose up

# Depois testar
curl http://localhost:8080/actuator/health
```

## Próximos passos:

1. **Verificar logs no Render**: Dashboard → seu app → "Logs"
2. **Confirmar variáveis de ambiente**: Dashboard → seu app → "Environment"
3. **Testar health check**: `https://seu-app.render.com/actuator/health`

Se ainda houver erro, compartilhe os logs do Render!
