#!/bin/bash
# quick-commit.sh - Quick commit with conventional commit format

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Quick Commit Helper${NC}"
echo ""

# Check if there are changes to commit
if git diff-index --quiet HEAD -- 2>/dev/null && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    echo -e "${YELLOW}No changes to commit${NC}"
    exit 0
fi

# Show current changes
echo -e "${GREEN}Changes to be committed:${NC}"
git status --short
echo ""

# Commit types with emojis
echo -e "${BLUE}Select commit type:${NC}"
echo "  1) feat     - New feature"
echo "  2) fix      - Bug fix"
echo "  3) docs     - Documentation changes"
echo "  4) style    - Code style changes (formatting, etc)"
echo "  5) refactor - Code refactoring"
echo "  6) perf     - Performance improvements"
echo "  7) test     - Test changes"
echo "  8) chore    - Maintenance tasks"
echo "  9) build    - Build system changes"
echo "  10) deploy  - Deployment changes"
echo ""

read -p "Enter number (1-10): " type_num

case $type_num in
    1) type="feat";;
    2) type="fix";;
    3) type="docs";;
    4) type="style";;
    5) type="refactor";;
    6) type="perf";;
    7) type="test";;
    8) type="chore";;
    9) type="build";;
    10) type="deploy";;
    *) echo -e "${RED}Invalid selection${NC}"; exit 1;;
esac

echo ""
# Get scope (optional)
echo -e "${BLUE}Enter scope (optional)${NC}"
echo -e "${YELLOW}Examples: convex, web, agent, twilio, auth, etc.${NC}"
echo -e "${YELLOW}Press Enter to skip${NC}"
read -p "> " scope

echo ""
# Get commit description
echo -e "${BLUE}Enter commit description (what did you do?):${NC}"
echo -e "${YELLOW}Be concise but descriptive${NC}"
read -p "> " description

if [ -z "$description" ]; then
    echo -e "${RED}Description is required!${NC}"
    exit 1
fi

# Build commit message
if [ -z "$scope" ]; then
    commit_msg="$type: $description"
else
    commit_msg="$type($scope): $description"
fi

echo ""
# Get detailed description (optional)
echo -e "${BLUE}Enter detailed description (optional)${NC}"
echo -e "${YELLOW}Press Enter to skip${NC}"
read -p "> " body

# Add breaking change note if needed
echo ""
read -p "Is this a BREAKING CHANGE? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Describe the breaking change:${NC}"
    read -p "> " breaking
    if [ -n "$body" ]; then
        body="$body\n\nBREAKING CHANGE: $breaking"
    else
        body="BREAKING CHANGE: $breaking"
    fi
fi

# Stage all changes
echo ""
echo -e "${GREEN}Staging all changes...${NC}"
git add .

# Show what will be committed
echo ""
echo -e "${BLUE}Commit message preview:${NC}"
echo -e "${YELLOW}$commit_msg${NC}"
if [ -n "$body" ]; then
    echo -e "${YELLOW}$body${NC}"
fi

echo ""
read -p "Proceed with commit? (Y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    # Commit with or without body
    if [ -n "$body" ]; then
        git commit -m "$commit_msg" -m "$body"
    else
        git commit -m "$commit_msg"
    fi

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}Successfully committed!${NC}"
        echo ""

        # Show recent commits
        echo -e "${BLUE}Recent commits:${NC}"
        git log --oneline -5

        echo ""
        echo -e "${GREEN}Next steps:${NC}"
        echo -e "  - Continue working and commit more changes"
        echo -e "  - Sync with main: ${YELLOW}./sync-branch.sh${NC}"
        echo -e "  - Create a PR: ${YELLOW}./create-pr.sh${NC}"
    else
        echo -e "${RED}Commit failed!${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}Commit cancelled${NC}"
    git reset HEAD
fi
