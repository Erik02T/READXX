# Guia Local Testing - READXX

Sucessivamente configurado e rodando localmente! ✅

## Status Atual

| Serviço | Status | URL |
|---------|--------|-----|
| **PostgreSQL** | ✅ Rodando | `localhost:5432` |
| **Redis** | ✅ Rodando | `localhost:6379` |
| **Backend API** | ✅ Rodando | `http://localhost:8080` |
| **Extension Build** | ✅ Pronta | `dist/` directory|

## Próximos Passos para Testa no Chrome

### 1. **Abra o Chrome** e vá para `chrome://extensions`

```
chrome://extensions
```

### 2. **Ative "Developer mode"**
- Clique no toggle **"Developer mode"** no canto superior direito
- Uma barra com ferramentas vão aparecer

### 3. **Carregue a extensão**
- Clique em **"Load unpacked"**
- Navegue até: `C:\Users\eriks\Documents\READXX\readxx\dist\`
- Clique em **Select Folder**

**Resultado esperado:**
- Extensão aparece na lista
- Ícone vermelho de READXX aparece na toolbar do Chrome
- Status: "Enabled"

### 4. **Verificar a Extensão**
- Clique no ícone READXX na toolbar
- Deverá aparecer um **popup**
- Console deve estar limpo (sem erros vermelhos)

---

## 🧪 Testes Manuais Completos

### Test 1: Criar Conta e Fazer Login

1. Clique no ícone READXX no toolbar
2. No popup, clique em **"Sign Up"**
3. Preencha:
   ```
   Email: test@example.com
   Password: TestPassword123!
   ```
4. Clique **Register**
5. **Esperado:** Conta criada, volta ao login
6. Faça login com mesmas credenciais
7. **Esperado:** Login bem-sucedido, token salvo

### Test 2: Abra um Artigo e Salve Palavras

1. Abra qualquer artigo (ex: Medium, Dev.to, Wikipedia)
2. Selecione uma palavra com o mouse
3. **Esperado:** Floating toolbar aparece com botões
4. Clique em **Save Word**
5. **Esperado:** Palavra aparece na sidebar do READXX
6. Repita com 3-5 palavras

### Test 3: Teste Modo Estudo

1. Clique no ícone READXX → **Study Mode**
2. **Esperado:** Карточки aparecem com palavras salvas
3. Cada card mostra:
   - Palavra
   - Definição (gerada por IA)
   - Próxima revisão
4. Clique **"Good"** para marcar
5. **Esperado:** Card sai da sequência

### Test 4: Teste Text-to-Speech

1. Selecione uma palavra no artigo
2. No floating toolbar, clique **🔊 Speak**
3. **Esperado:**
   - Áudio começa a tocar
   - Ícone de play ativa
   - Sem console errors

### Test 5: Teste Tradução

1. Selecione uma frase em inglês
2. No floating toolbar, clique **🌐 Translate**
3. **Esperado:**
   - LLM gera tradução
   - Resultado aparece em popup/sidebar
   - Sem erros de API

### Test 6: Offline Persistence

1. **Desative WiFi/Internet** (ou use DevTools para simular offline)
2. Selecione uma palavra e clique **Save**
3. **Esperado:**
   - Palavra salva localmente
   - Mensagem de "offline" aparece (ou não)
4. **Reative Internet**
5. **Esperado:**
   - Dados fazem sync com servidor
   - Palavra aparece no backend

### Test 7: Persistência entre Restarts

1. Feche a extensão completamente
2. Abra novamente (clique no ícone READXX)
3. **Esperado:**
   - Palavras salvas ainda aparecem
   - Auth token ainda ativo
   - Nenhum erro de carregamento

---

## 🔍 Verificações de Segurança

### Console DevTools

1. Clique com botão direito na extension → **Inspect**
2. Abra **Console** tab
3. **Esperado:**
   - Sem erros vermelhos
   - Sem warnings de XSS
   - Sem API keys visibles

### Network Tab

1. Em DevTools, abra **Network** tab
2. Faça ações (login, salvar palavra, etc)
3. Procure por requisições para `localhost:8080`
4. **Esperado:**
   - Requests têm Authorization header com JWT
   - Responses têm status 2xx ou 4xx (não 5xx)
   - Nenhuma API key em query parameters

### Dados Locais

1. Em DevTools → **Application** tab
2. Cheque **Storage > IndexedDB**
3. **Esperado:**
   - DB chamada "readxx" existe
   - Tabelas: words, history, etc
   - Dados aparecem após salvar recursos

---

## 🛠️ Troubleshooting

### "Cannot reach backend" ou CORS errors

**Solução:**
```bash
# Verifique se backend está rodando
curl http://localhost:8080/actuator/health

# Se não funcionar, rode:
docker-compose -f docker-compose.dev.yml logs backend
```

### "Extension not loading" ou erro na popup

**Solução:**
```bash
# Verifique se dist/ foi criado com sucesso
ls dist/

# Se não, rebuild:
VITE_API_BASE_URL=http://localhost:8080 npm run build

# Carregue novamente em chrome://extensions
```

### "Login fails" / Authentication error

**Solução:**
```bash
# Verifique DB (postgres)
docker-compose exec postgres psql -U readxx -d readxx -c "SELECT COUNT(*) FROM users;"

# Se tiver problemas com migrations:
docker-compose down -v  # Remove todos os dados
docker-compose up -d     # Recria com migrations limpas
VITE_API_BASE_URL=http://localhost:8080 npm run build
```

### Salvar palavras não funciona / No sync

**Solução:**
1. Verifique backend logs:
```bash
docker-compose logs backend | grep -i error
```

2. Verifique token foi salvo:
   - DevTools → Application → Storage > chrome.storage.session
   - Procure por `accessToken`

3. Se ainda não funcionar, limpe tudo:
```bash
docker-compose down -v
docker-compose up -d
npm run build  # ou npm run build:dev
```

---

## 📊 Checklist Completo de Testes

- [ ] Backend responde em localhost:8080
- [ ] PostgreSQL conecta (docker ps mostra healthy)
- [ ] Redis conecta (docker ps mostra healthy)
- [ ] Extension carrega sem erros
- [ ] Pode fazer signup/login
- [ ] Pode salvar palavras
- [ ] Pode visualizar palavras no Study Mode
- [ ] TTS funciona
- [ ] Tradução funciona com IA
- [ ] Offline persistence funciona
- [ ] Dados sincizam após reconectar
- [ ] DevTools console sem erros
- [ ] Network tab mostra JWT tokens
- [ ] IndexedDB mostra dados salvos

---

## 🚀 Comandos Úteis

```bash
# Ver logs em tempo real
docker-compose logs -f backend

# Verificar saúde dos containers
docker-compose ps

# Acessar PostgreSQL
docker-compose exec postgres psql -U readxx -d readxx

# Acessar Redis
docker-compose exec redis redis-cli -a devredis

# Parar todos os serviços
docker-compose down

# Parar e limpar dados
docker-compose down -v

# Rebuild da extensão
VITE_API_BASE_URL=http://localhost:8080 npm run build

# Watch mode (se suportado)
npm run dev
```

---

## 💡 Dicas

1. **Use Chrome DevTools muito:** F12 ou Ctrl+Shift+I
   - Console para debugging
   - Network para ver chamadas API
   - Application para ver localStorage/IndexedDB

2. **Check backend logs frequentemente:**
   ```bash
   docker-compose logs backend | tail -50
   ```

3. **Reload extension:** Em chrome://extensions, clique o botão reload 🔄

4. **Limpar cache:** Se tiver problema, em DevTools > Application > Clear Storage

5. **Teste em new tab:** Abra um artigo em uma aba nova para ter mais espaço

---

**Bom testing! Se tiver problemas, rode `docker-compose logs backend` e veja o erro.**
