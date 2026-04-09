# Contributing to READXX

Thank you for your interest in contributing to READXX! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Report security issues privately (don't open public issues)
- Follow project conventions and best practices

## How to Contribute

### Reporting Bugs

1. **Check existing issues** to avoid duplicates
2. **Create a detailed bug report** with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment (OS, browser, extension version)
   - Console errors (if any)

### Suggesting Features

1. **Check discussions** to see if it's already been suggested
2. **Provide clear use cases** for the feature
3. **Include implementation ideas** (if you have them)

### Pull Requests

#### Before Starting

1. Fork the repository
2. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make sure your feature aligns with the roadmap

#### Development

**Frontend (Extension):**
```bash
# Install dependencies
npm install

# Development build (with local API at http://localhost:8080)
npm run build:dev

# Load extension in Chrome DevTools
# chrome://extensions -> Load unpacked -> select dist/
```

**Backend (Spring Boot):**
```bash
# Start services
docker-compose -f docker-compose.dev.yml up -d

# Build
cd backend
mvn clean package

# Run
java -jar target/readxx-backend-0.0.1-SNAPSHOT.jar
```

#### Code Style

**Frontend (TypeScript/React):**
- Use Arrow functions: `const foo = () => {}`
- Prefer functional components with hooks
- Use TypeScript interfaces for props
- File names: `PascalCase.tsx` (components), `camelCase.ts` (utils)
- Avoid `any` types - use proper TypeScript

**Backend (Java):**
- Follow Spring conventions
- Use descriptive method names
- Add Javadoc for public methods
- Place DTOs in `*/request` and `*/response` packages
- Use `@Validated` for input validation

#### Security Checklist

Before submitting a PR, verify:

- ❌ No API keys or secrets in code
- ❌ No `eval()` or `Function()` constructors
- ❌ No `dangerouslySetInnerHTML` in React
- ✅ DOMPurify used for user input
- ✅ Input validation for all user data
- ✅ HTTPS-only connections
- ✅ CORS limited to necessary origins

#### Testing Checklist

Manual tests you should run:

1. **Authentication**
   - Register new account
   - Login/logout flow
   - Token refresh

2. **Core Features**
   - Save words in articles
   - Study mode works
   - Translation generates correctly
   - TTS plays audio
   - OCR extracts text accurately

3. **Edge Cases**
   - Test offline behavior
   - Check error handling
   - Verify sync works after reconnection

4. **Security**
   - No console errors
   - No XSS attempts in extracted text
   - Rate limiting works (repeated requests)

#### Commit Messages

Follow conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `refactor`, `security`, `perf`, `test`, `docs`, `ci`

**Examples:**
```
feat(auth): add remember-me functionality
fix(words): prevent duplicate saves
security(ocr): add magic byte validation
docs(readme): update deployment instructions
```

#### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Security Implications
Any security considerations?

## Testing
How was this tested?

## Related Issues
Fixes #123
Related to #456
```

### Large Changes

For major features or architectural changes:

1. Open an issue first to discuss approach
2. Get feedback from maintainers
3. Break into smaller PRs if possible
4. Document decisions in PR comments

## Project Structure

### Adding a New Backend Feature

1. Create DTO in `src/main/java/com/readxx/feature/FeatureRequest.java`
2. Add validation annotations (`@NotNull`, `@Size`, etc)
3. Create controller: `FeatureController.java`
4. Create service: `FeatureService.java`
5. Add repository if needed: `FeatureRepository.java`
6. Update database migration in `db/migration/V*.sql`
7. Add audit logging in `AuditService`
8. Add rate limiting if needed

### Adding a New Frontend Feature

1. Create component: `src/sidepanel/components/FeatureName.tsx`
2. Add TypeScript types in `src/shared/types.ts`
3. Create custom hook if needed: `src/sidepanel/hooks/useFeature.ts`
4. Add API client method in background worker
5. Add tests/verification steps
6. Update `TESTING.md` with new test cases

## Deployment

### Before Release

1. Update version in `package.json` and `backend/pom.xml`
2. Update `CHANGELOG.md` (if it exists)
3. Verify all tests pass
4. Create GitHub release with notes

### Staging Deploy

1. Push to `develop` branch
2. GitHub Actions runs CI/CD
3. Verify in staging environment
4. Create PR to `master`

### Production Deploy

1. Merge PR to `master`
2. Tag release: `git tag v1.2.3`
3. GitHub Actions auto-deploys to Railway
4. Monitor health checks

## Getting Help

- 💬 **Discussions**: GitHub Discussions for questions
- 🐛 **Bugs**: GitHub Issues for bug reports
- 📚 **Documentation**: Check SETUP.md and TESTING.md
- 🔐 **Security**: Email security concerns privately

## Recognition

Contributors are recognized in:
- CONTRIBUTORS.md (maintained)
- GitHub contributors graph
- Release notes

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Happy contributing! 🚀**
