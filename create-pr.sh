#!/bin/bash
# create-pr.sh - Push current branch and create a pull request

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}GitHub CLI (gh) is not installed!${NC}"
    echo ""
    echo "Install it with one of these methods:"
    echo -e "${YELLOW}  macOS:${NC} brew install gh"
    echo -e "${YELLOW}  Ubuntu/Debian:${NC} sudo apt install gh"
    echo -e "${YELLOW}  Arch:${NC} sudo pacman -S github-cli"
    echo -e "${YELLOW}  Other:${NC} https://cli.github.com/manual/installation"
    echo ""
    echo "After installing, authenticate with:"
    echo -e "${YELLOW}  gh auth login${NC}"
    exit 1
fi

# Check if gh is authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}GitHub CLI is not authenticated!${NC}"
    echo -e "${YELLOW}Run: gh auth login${NC}"
    exit 1
fi

# Get current branch
current_branch=$(git rev-parse --abbrev-ref HEAD)

# Prevent PR from main
if [ "$current_branch" = "main" ]; then
    echo -e "${RED}Cannot create PR from main branch!${NC}"
    echo -e "${YELLOW}Please create a feature branch first:${NC}"
    echo -e "${YELLOW}  ./create-feature.sh your-feature-name${NC}"
    exit 1
fi

echo -e "${BLUE}Creating PR for branch: $current_branch${NC}"

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}You have uncommitted changes${NC}"
    read -p "Would you like to commit them now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./quick-commit.sh
        if [ $? -ne 0 ]; then
            echo -e "${RED}Commit failed. Please fix and try again.${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}Proceeding without committing changes...${NC}"
    fi
fi

# Push to origin
echo -e "${GREEN}Pushing $current_branch to origin...${NC}"
git push -u origin "$current_branch"

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to push branch. Please check and try again.${NC}"
    exit 1
fi

# Check if PR already exists
existing_pr=$(gh pr list --head "$current_branch" --json number --jq '.[0].number' 2>/dev/null)

if [ -n "$existing_pr" ]; then
    echo -e "${YELLOW}PR #$existing_pr already exists for this branch${NC}"
    read -p "Would you like to view it in the browser? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        gh pr view "$existing_pr" --web
    fi
    exit 0
fi

# Create PR interactively
echo -e "${GREEN}Creating pull request...${NC}"
echo ""

# Extract feature name from branch for default title
feature_name=$(echo "$current_branch" | sed 's/feature\///' | sed 's/-/ /g' | sed 's/\b\(.\)/\u\1/g')

echo "PR Title (press Enter for default):"
echo -e "${YELLOW}  Default: $feature_name${NC}"
read -p "> " pr_title
pr_title=${pr_title:-$feature_name}

echo ""
echo "PR Description (optional, press Enter to skip):"
echo -e "${YELLOW}  Tip: Describe what this PR does and why${NC}"
read -p "> " pr_description

echo ""
echo "Target branch (press Enter for 'main'):"
read -p "> " target_branch
target_branch=${target_branch:-main}

# Create PR using GitHub CLI
echo ""
echo -e "${GREEN}Creating PR...${NC}"

if [ -z "$pr_description" ]; then
    gh pr create \
        --title "$pr_title" \
        --base "$target_branch" \
        --head "$current_branch" \
        --web
else
    gh pr create \
        --title "$pr_title" \
        --body "$pr_description" \
        --base "$target_branch" \
        --head "$current_branch" \
        --web
fi

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}Pull request created successfully!${NC}"
    echo -e "${GREEN}The PR has been opened in your browser${NC}"
else
    echo -e "${RED}Failed to create PR. Please check and try again.${NC}"
    exit 1
fi
