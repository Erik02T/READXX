#!/bin/bash
# Quick start script for READXX local development

set -e

echo "🚀 READXX Local Development Setup"
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}1. Starting Docker containers (PostgreSQL, Redis)...${NC}"
docker-compose -f docker-compose.dev.yml up -d

echo -e "${BLUE}2. Waiting for services to be healthy...${NC}"
sleep 5

echo -e "${BLUE}3. Installing npm dependencies...${NC}"
npm install --silent

echo -e "${BLUE}4. Building extension for development...${NC}"
VITE_API_BASE_URL=http://localhost:8080 npm run build

echo -e "${GREEN}✅ Local Setup Complete!${NC}"
echo ""
echo "📖 Next Steps:"
echo "1. Open Chrome and go to: chrome://extensions"
echo "2. Enable 'Developer mode' (top right)"
echo "3. Click 'Load unpacked'"
echo "4. Select: $(pwd)/dist"
echo ""
echo "🖥️  Backend: http://localhost:8080"
echo "📦 Extension: dist/"
echo "🗄️  DB: PostgreSQL on localhost:5432"
echo "⚡ Cache: Redis on localhost:6379"
echo ""
echo "📚 See LOCAL_TESTING.md for detailed testing guide"
echo ""
echo "💡 Useful commands:"
echo "   npm run build              # Rebuild extension"
echo "   docker-compose logs backend # View backend logs"
echo "   docker-compose down -v     # Stop and cleanup"
