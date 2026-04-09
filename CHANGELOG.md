# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- RS256 JWT upgrade (from HS256)
- Refresh token family revocation
- Quiz mode with multiple choice
- Vocabulary statistics dashboard
- Advanced filtering and search
- Firefox extension support

---

## [0.1.0] - 2026-04-08

### Added - Initial Release

#### Frontend (Chrome Extension)
- ✅ Word saving with floating toolbar
- ✅ Spaced repetition study mode
- ✅ Text-to-speech for pronunciation
- ✅ Automatic translation via LLM
- ✅ OCR image text extraction
- ✅ Reading history tracking
- ✅ IndexedDB offline persistence
- ✅ Auto-sync when reconnected
- ✅ Authentication (register/login/logout)
- ✅ Manifest V3 security hardening
- ✅ DOMPurify XSS protection
- ✅ Content script sandboxing

#### Backend (Spring Boot)
- ✅ JWT authentication (HS256)
- ✅ User account management
- ✅ Word CRUD operations
- ✅ Spaced repetition SRS algorithm
- ✅ TTS proxy (zero API keys in extension)
- ✅ LLM translation endpoint
- ✅ OCR image processing
- ✅ Reading history storage
- ✅ Client-server sync API
- ✅ Distributed rate limiting (Redis)
- ✅ Daily usage quotas
- ✅ Audit logging
- ✅ Comprehensive input validation
- ✅ CORS security
- ✅ Global exception handling
- ✅ Health checks & metrics

#### Database
- ✅ PostgreSQL 16 setup
- ✅ Flyway migrations
- ✅ User entity with BCrypt passwords
- ✅ Words table with SRS metadata
- ✅ History table for reading tracking
- ✅ Refresh tokens for session management

#### Infrastructure
- ✅ Docker multi-stage build
- ✅ Docker Compose for development
- ✅ Railway.app deployment config
- ✅ GitHub Actions CI/CD pipeline
- ✅ Security scanning with Trivy

#### Documentation
- ✅ Comprehensive README
- ✅ Setup guide (SETUP.md)
- ✅ Testing checklist (TESTING.md)
- ✅ Security implementation details
- ✅ Deployment guide
- ✅ Contributing guidelines
- ✅ This changelog

### Security
- ✅ HSTS (Strict-Transport-Security)
- ✅ CSP (Content-Security-Policy)
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ BCrypt password hashing (cost=12)
- ✅ Rate limiting (200 req/min global, 5 login/15min)
- ✅ Magic byte validation for OCR images
- ✅ Image dimension checks
- ✅ Request size limits (10MB)
- ✅ No stack traces in responses
- ✅ Audit logging of security events
- ✅ RefreshToken table for rotation support

### Known Issues & Limitations

1. **JWT Algorithm:** Currently using HS256 (symmetric)
   - ⚠️ Secret key must be kept secure (single instance)
   - ✅ Upgrade path to RS256 planned

2. **Refresh Token Family:** Partially implemented
   - Tokens rotate on refresh
   - Full family revocation in progress

3. **Rate Limiting Discovery:** Use-case discovered during security audit
   - Now implemented with distributed approach
   - Atomic Lua scripts prevent race conditions

4. **CLI Deployment:** Currently requires manual Railway/Docker setup
   - GitHub Actions ready for auto-deploy (needs RAILWAY_TOKEN)

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details on how to contribute changes.

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

**First release - Thank you for trying READXX! 🚀**
