# READXX

A powerful Chrome extension for vocabulary learning with spaced repetition, text-to-speech, automatic translation, OCR, and reading history tracking.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-beta-orange)

## Features

- 📚 **Spaced Repetition Learning** - Scientifically-backed SRS algorithm for long-term vocabulary retention
- 🔊 **Text-to-Speech** - Listen to pronunciation of words and phrases
- 🌐 **Auto Translation** - Instant translations and definitions powered by LLM
- 📸 **OCR Support** - Extract text from images with optical character recognition
- 📖 **Reading History** - Track articles you've read and your learning progress
- 💾 **Offline-First** - Works offline with automatic sync to server when connected
- 🔐 **Privacy-Focused** - End-to-end encrypted authentication, zero API keys in extension
- ⚡ **Fast & Lightweight** - Minimal performance impact on browsing

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Docker & Docker Compose (for backend)
- Java 21 and Maven 3.9+ (for backend build)
- Chrome browser (Manifest V3 compatible)

### Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Erik02T/READXX.git
   cd READXX
   ```

2. **Start backend services (PostgreSQL, Redis):**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **Build and run the backend:**
   ```bash
   cd backend
   mvn clean package
   java -jar target/readxx-backend-0.0.1-SNAPSHOT.jar
   ```
   Backend will run on `http://localhost:8080`

4. **Build the extension (development mode):**
   ```bash
   npm install
   npm run build:dev
   ```

5. **Load extension in Chrome:**
   - Open Chrome and navigate to `chrome://extensions`
   - Enable **Developer mode** (top-right toggle)
   - Click **Load unpacked**
   - Select the `dist/` directory
   - Extension appears in your toolbar

6. **Run smoke tests:**
   See [TESTING.md](./TESTING.md) for the full test checklist.

## Architecture

### Frontend (Chrome Extension)
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite with Web Extension Plugin
- **Styling:** Tailwind CSS
- **Storage:** IndexedDB with Dexie ORM
- **UI Components:** Lucide React icons

| Component | Purpose |
|-----------|---------|
| **Popup** | Quick access panel for authentication & settings |
| **Side Panel** | Main UI - saved words, study mode, history |
| **Content Script** | DOM extraction, floating toolbar, text selection |
| **Background Worker** | Authentication, sync, API communication |

### Backend (Spring Boot)
- **Framework:** Spring Boot 3.3
- **Language:** Java 21
- **Security:** Spring Security + JWT (HS256)
- **Rate Limiting:** Distributed Redis-based rate limiting
- **Database:** PostgreSQL 16 with Flyway migrations
- **Caching:** Redis
- **Monitoring:** Spring Actuator + Prometheus metrics

## Project Structure

```
READXX/
├── src/                          # Frontend extension
│   ├── popup/                    # Popup component
│   ├── sidepanel/                # Side panel UI
│   ├── content/                  # Content script
│   ├── background/               # Service worker
│   ├── shared/                   # Shared utilities
│   └── styles/                   # Global styles
│
├── backend/                      # Spring Boot backend
│   ├── src/main/java/com/readxx/
│   │   ├── auth/                 # Authentication & JWT
│   │   ├── words/                # Vocabulary management
│   │   ├── tts/                  # Text-to-speech proxy
│   │   ├── translate/            # LLM translation
│   │   ├── ocr/                  # Image OCR
│   │   ├── history/              # Reading history
│   │   ├── security/             # Security config
│   │   ├── audit/                # Audit logging
│   │   └── sync/                 # Client-server sync
│   ├── src/main/resources/
│   │   └── db/migration/         # Flyway SQL migrations
│   └── Dockerfile                # Multi-stage production image
│
├── docker-compose.dev.yml        # Local development stack
├── railway.json                  # Railway.app deployment config
├── SECURITY_IMPLEMENTATION.md    # Security hardening details
├── SETUP.md                      # Detailed setup guide
├── TESTING.md                    # Manual test checklist
└── README.md                     # This file
```

## Security

READXX implements comprehensive security hardening:

- ✅ **Zero API Keys in Extension** - All AI calls proxied through backend
- ✅ **JWT Authentication** - 15-minute expiry with refresh token rotation
- ✅ **Rate Limiting** - Distributed rate limiting with Redis (200 req/min global, 5 login attempts/15min)
- ✅ **DOMPurify Sanitization** - All extracted text sanitized to prevent XSS
- ✅ **CSP Hardening** - Manifest V3 Content Security Policy enforcement
- ✅ **Input Validation** - Comprehensive DTO validation with size limits
- ✅ **OCR Security** - Magic byte validation, image dimension checks, decompression bomb prevention
- ✅ **HTTPS Enforcement** - HSTS (31536000s) + preload enabled
- ✅ **Audit Logging** - Immutable event logging for security monitoring

**See [SECURITY_IMPLEMENTATION.md](./SECURITY_IMPLEMENTATION.md) for complete details.**

## API Endpoints

### Authentication
- `POST /auth/register` - Create new account
- `POST /auth/login` - Login and receive tokens
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Invalidate refresh token

### Vocabulary
- `GET /words` - Get user's saved words
- `POST /words` - Save new word
- `POST /words/{id}/review` - Log spaced repetition review
- `DELETE /words/{id}` - Remove word

### Features
- `POST /tts/speak` - Generate speech audio
- `POST /translate` - Translate text via LLM
- `POST /ocr/extract` - Extract text from image
- `GET /history` - Get reading history

### Sync
- `POST /sync/push` - Upload changes
- `GET /sync/pull` - Download changes

## Environment Variables

### Frontend (.env at build time)
```bash
VITE_API_BASE_URL=https://api.readxx.app  # Production API URL
```

### Backend (Production)
```bash
# Database
SPRING_DATASOURCE_URL=jdbc:postgresql://host/db?sslmode=require
SPRING_DATASOURCE_USERNAME=readxx_user
SPRING_DATASOURCE_PASSWORD=<strong-password>

# Redis
SPRING_REDIS_HOST=redis.internal
SPRING_REDIS_PORT=6379
SPRING_REDIS_PASSWORD=<strong-password>
SPRING_REDIS_SSL=true

# JWT
JWT_SECRET=<base64-256-bit-key>
JWT_EXPIRY_MINUTES=15
JWT_REFRESH_EXPIRY_DAYS=7

# OpenAI (Proxy)
OPENAI_API_KEY=<secret-key>

# CORS
ALLOWED_ORIGINS=chrome-extension://YOUR_EXTENSION_ID

# Spring
SPRING_PROFILES_ACTIVE=prod
HIBERNATE_DDL_AUTO=validate
```

## Deployment

### Railway.app (Recommended)

1. Connect your GitHub repository to Railway
2. Railway automatically detects `railway.json` and builds from `backend/Dockerfile`
3. Set environment variables in Railway dashboard
4. Deploy!

**See [SETUP.md](./SETUP.md) for detailed deployment instructions.**

### Docker (Local)

```bash
# Build backend image
docker build -f backend/Dockerfile -t readxx-backend:latest .

# Run with docker-compose
docker-compose -f docker-compose.dev.yml up
```

## Testing

Manual smoke test checklist available in [TESTING.md](./TESTING.md).

**Key test areas:**
- Authentication flow
- Word saving & syncing
- Study mode (spaced repetition)
- Translation & TTS
- Image OCR
- Offline persistence
- Browser consistency

## Roadmap

- [ ] RS256 JWT upgrade (from HS256)
- [ ] Refresh token family revocation
- [ ] Advanced quiz modes
- [ ] Vocabulary statistics dashboard
- [ ] Multi-language support
- [ ] Community word lists
- [ ] Browser sync (Firefox, Safari)
- [ ] Mobile app (React Native)

## Contributing

Contributions welcome! Please follow these guidelines:

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Open a Pull Request with a description of changes

## Issues & Bugs

Found a bug? Have a feature request? [Open an issue](https://github.com/Erik02T/READXX/issues)

## License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) file for details.

## Author

Built with ❤️ by Erik02T

## Acknowledgments

- [Mozilla Readability](https://github.com/mozilla/readability) - Article extraction
- [DOMPurify](https://github.com/cure53/DOMPurify) - XSS sanitization
- [Dexie](https://dexie.org/) - IndexedDB wrapper
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Spring Security](https://spring.io/projects/spring-security) - Backend auth

---

**Happy learning! 📚**
