#!/bin/bash

# RegNav.AI Frontend Setup Script
# This script will create and configure the complete frontend application

set -e  # Exit on error

echo "🚀 RegNav.AI Frontend Setup Starting..."
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_DIR="/Users/aditilakshminarayanan/Downloads/HCLTechProj./RegNav.AI"
FRONTEND_DIR="$PROJECT_DIR/frontend-app"

cd "$PROJECT_DIR"

# Step 1: Create React App
echo -e "${BLUE}📦 Step 1: Creating React App...${NC}"
if [ ! -d "$FRONTEND_DIR" ]; then
    npx create-react-app frontend-app --template typescript
    echo -e "${GREEN}✓ React app created${NC}"
else
    echo -e "${YELLOW}! Frontend directory already exists, skipping creation${NC}"
fi

cd "$FRONTEND_DIR"

# Step 2: Install Dependencies
echo -e "${BLUE}📦 Step 2: Installing dependencies...${NC}"
npm install \
    react-router-dom \
    @types/react-router-dom \
    axios \
    zustand \
    clsx \
    tailwindcss \
    postcss \
    autoprefixer

echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 3: Initialize Tailwind CSS
echo -e "${BLUE}🎨 Step 3: Configuring Tailwind CSS...${NC}"
npx tailwindcss init -p

# Step 4: Create directory structure
echo -e "${BLUE}📁 Step 4: Creating directory structure...${NC}"
mkdir -p src/components/layout
mkdir -p src/components/common
mkdir -p src/pages
mkdir -p src/store
mkdir -p src/types
mkdir -p src/data
mkdir -p src/utils

echo -e "${GREEN}✓ Directory structure created${NC}"

# Step 5: Copy files from the code repository
echo -e "${BLUE}📝 Step 5: Setting up project files...${NC}"
echo -e "${YELLOW}Note: You'll need to copy the component code from COMPLETE_FRONTEND_CODE.md${NC}"
echo -e "${YELLOW}      into the respective files in the src/ directory.${NC}"

# Step 6: Create package.json scripts
echo -e "${BLUE}⚙️  Step 6: Configuration complete${NC}"

echo ""
echo -e "${GREEN}======================================"
echo "✅ Frontend Setup Complete!"
echo "======================================${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Navigate to frontend-app: ${YELLOW}cd $FRONTEND_DIR${NC}"
echo "2. Copy component code from ${YELLOW}COMPLETE_FRONTEND_CODE.md${NC} to respective files"
echo "3. Start development server: ${YELLOW}npm start${NC}"
echo "4. Open browser at: ${YELLOW}http://localhost:3000${NC}"
echo ""
echo -e "${BLUE}File Locations:${NC}"
echo "  • Types: ${YELLOW}src/types/index.ts${NC} ✓ Already created"
echo "  • Mock Data: ${YELLOW}src/data/mockData.ts${NC} ✓ Already created"
echo "  • Store: ${YELLOW}src/store/appStore.ts${NC} ✓ Already created"
echo "  • Components: ${YELLOW}src/components/${NC} (copy from COMPLETE_FRONTEND_CODE.md)"
echo "  • Pages: ${YELLOW}src/pages/${NC} (copy from COMPLETE_FRONTEND_CODE.md)"
echo ""
echo -e "${GREEN}Happy coding! 🎉${NC}"


