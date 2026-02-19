#!/bin/bash
# sync-branch.sh - Sync current feature branch with latest main

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get current branch
current_branch=$(git rev-parse --abbrev-ref HEAD)

echo -e "${BLUE}Syncing branch: $current_branch${NC}"

# Check if on main
if [ "$current_branch" = "main" ]; then
    echo -e "${YELLOW}You're on main branch. Pulling latest...${NC}"
    git pull origin main
    echo -e "${GREEN}Main branch updated!${NC}"
    exit 0
fi

# Check for uncommitted changes
has_changes=false
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    has_changes=true
    echo -e "${YELLOW}Stashing uncommitted changes...${NC}"
    git stash push -m "Auto-stash before syncing with main"
fi

# Fetch latest from remote
echo -e "${GREEN}Fetching latest from remote...${NC}"
git fetch origin

# Show how far behind we are
behind_count=$(git rev-list --count HEAD..origin/main)
if [ "$behind_count" -eq 0 ]; then
    echo -e "${GREEN}Your branch is already up to date with main!${NC}"

    # Pop stashed changes if any
    if [ "$has_changes" = true ]; then
        echo -e "${YELLOW}Restoring stashed changes...${NC}"
        git stash pop
    fi
    exit 0
fi

echo -e "${YELLOW}Your branch is $behind_count commits behind main${NC}"
echo ""

# Ask user for sync method
echo "How would you like to sync with main?"
echo -e "${BLUE}  r)${NC} Rebase - Cleaner history (recommended)"
echo -e "${BLUE}  m)${NC} Merge - Preserves branch history"
echo -e "${BLUE}  s)${NC} Skip - Don't sync now"
echo ""
read -p "Choice [r/m/s]: " -n 1 -r sync_method
echo ""

case "$sync_method" in
    r|R)
        echo -e "${GREEN}Rebasing on main...${NC}"
        if git rebase origin/main; then
            echo -e "${GREEN}Successfully rebased on main!${NC}"
            echo -e "${YELLOW}Note: You'll need to force push with: git push --force-with-lease${NC}"
        else
            echo -e "${RED}Rebase conflicts detected!${NC}"
            echo ""
            echo "To resolve:"
            echo -e "${YELLOW}  1. Fix conflicts in the marked files${NC}"
            echo -e "${YELLOW}  2. Stage resolved files: git add <file>${NC}"
            echo -e "${YELLOW}  3. Continue rebase: git rebase --continue${NC}"
            echo ""
            echo "Or abort with:"
            echo -e "${YELLOW}  git rebase --abort${NC}"
            exit 1
        fi
        ;;
    m|M)
        echo -e "${GREEN}Merging main...${NC}"
        if git merge origin/main; then
            echo -e "${GREEN}Successfully merged main!${NC}"
        else
            echo -e "${RED}Merge conflicts detected!${NC}"
            echo ""
            echo "To resolve:"
            echo -e "${YELLOW}  1. Fix conflicts in the marked files${NC}"
            echo -e "${YELLOW}  2. Stage resolved files: git add <file>${NC}"
            echo -e "${YELLOW}  3. Complete merge: git commit${NC}"
            echo ""
            echo "Or abort with:"
            echo -e "${YELLOW}  git merge --abort${NC}"
            exit 1
        fi
        ;;
    s|S)
        echo -e "${YELLOW}Skipping sync${NC}"
        # Pop stashed changes if any
        if [ "$has_changes" = true ]; then
            echo -e "${YELLOW}Restoring stashed changes...${NC}"
            git stash pop
        fi
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        # Pop stashed changes if any
        if [ "$has_changes" = true ]; then
            echo -e "${YELLOW}Restoring stashed changes...${NC}"
            git stash pop
        fi
        exit 1
        ;;
esac

# Pop stashed changes
if [ "$has_changes" = true ]; then
    echo -e "${YELLOW}Applying stashed changes...${NC}"
    if ! git stash pop; then
        echo -e "${RED}Conflicts while applying stashed changes!${NC}"
        echo -e "${YELLOW}   Resolve conflicts and run: git stash drop${NC}"
    fi
fi

echo ""
echo -e "${GREEN}Branch synced successfully!${NC}"
