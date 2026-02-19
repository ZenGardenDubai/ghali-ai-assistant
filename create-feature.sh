#!/bin/bash
# create-feature.sh - Create a new feature branch from latest main

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get feature name from user
if [ -z "$1" ]; then
    read -p "Enter feature name (e.g., add-payment-gateway): " feature_name
else
    feature_name=$1
fi

# Validate feature name
if [[ ! "$feature_name" =~ ^[a-z0-9-]+$ ]]; then
    echo -e "${YELLOW}Feature name should only contain lowercase letters, numbers, and hyphens${NC}"
    echo -e "${YELLOW}   Example: add-payment-gateway, fix-login-bug, update-readme${NC}"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "${YELLOW}Stashing uncommitted changes...${NC}"
    git stash push -m "Auto-stash before creating feature/$feature_name"
    stashed=true
else
    stashed=false
fi

# Get current branch for reference
current_branch=$(git rev-parse --abbrev-ref HEAD)

# Switch to main and pull latest
echo -e "${GREEN}Updating main branch...${NC}"
git checkout main
if ! git pull origin main; then
    echo -e "${RED}Failed to pull latest main. Please check your connection and try again.${NC}"
    # Restore stashed changes if any
    if [ "$stashed" = true ]; then
        git checkout "$current_branch"
        git stash pop
    fi
    exit 1
fi

# Create and checkout new feature branch
branch_name="feature/$feature_name"
echo -e "${GREEN}Creating new branch: $branch_name${NC}"

# Check if branch already exists
if git show-ref --verify --quiet refs/heads/"$branch_name"; then
    echo -e "${RED}Branch $branch_name already exists!${NC}"
    echo -e "${YELLOW}   Try: git checkout $branch_name${NC}"
    git checkout "$current_branch"
    # Restore stashed changes if any
    if [ "$stashed" = true ]; then
        git stash pop
    fi
    exit 1
fi

git checkout -b "$branch_name"

# Pop stashed changes if any
if [ "$stashed" = true ]; then
    echo -e "${YELLOW}Applying stashed changes to new branch...${NC}"
    git stash pop
fi

echo ""
echo -e "${GREEN}Successfully created branch: $branch_name${NC}"
echo -e "${GREEN}You can now start working on your feature!${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. Make your changes"
echo -e "  2. Commit with: ${YELLOW}./quick-commit.sh${NC}"
echo -e "  3. Create PR with: ${YELLOW}./create-pr.sh${NC}"
