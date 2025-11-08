# GitHub Actions Workflow Troubleshooting

If your workflow isn't running or showing up, follow these steps:

## 1. Verify Workflow File is Committed

Make sure the workflow file is committed and pushed to GitHub:

```bash
# Check if file exists locally
ls -la .github/workflows/daily-reel.yml

# Check git status
git status

# If not committed, add and commit:
git add .github/workflows/daily-reel.yml
git commit -m "Add GitHub Actions workflow"
git push
```

## 2. Check GitHub Actions is Enabled

1. Go to your repository on GitHub
2. Click **Settings** (top menu)
3. Click **Actions** → **General**
4. Under "Actions permissions", make sure:
   - ✅ "Allow all actions and reusable workflows" is selected
   - OR
   - ✅ "Allow local actions and reusable workflows" is selected

## 3. Verify Workflow Appears in Actions Tab

1. Go to **Actions** tab in your repository
2. You should see "Daily Reel Generation" in the left sidebar
3. If you don't see it:
   - Make sure the file is in `.github/workflows/` directory
   - Check the file is named `daily-reel.yml` (not `.yaml` or different name)
   - Verify the YAML syntax is correct (no indentation errors)

## 4. Check Workflow File Location

The workflow file MUST be in:
```
.github/workflows/daily-reel.yml
```

NOT in:
- `.github/daily-reel.yml` ❌
- `workflows/daily-reel.yml` ❌
- `.github/workflows/daily-reel.yaml` ❌ (wrong extension)

## 5. Verify YAML Syntax

Common YAML errors:
- Wrong indentation (must use spaces, not tabs)
- Missing colons after keys
- Incorrect list formatting

You can validate YAML online at: https://www.yamllint.com/

## 6. Check Repository Permissions

If you're in an organization:
1. Go to repository **Settings** → **Actions** → **General**
2. Check "Workflow permissions"
3. Make sure "Read and write permissions" is selected

## 7. Manual Trigger Steps

To manually trigger:
1. Go to **Actions** tab
2. Click **Daily Reel Generation** in the left sidebar
3. Click **Run workflow** button (top right)
4. Select branch (usually `main` or `master`)
5. Click green **Run workflow** button

## 8. Check Workflow Runs

After triggering:
1. You should see a new run appear in the workflow list
2. Click on the run to see progress
3. If it shows "Queued" or "In progress", it's working
4. If it shows "Failed", click to see error logs

## 9. Common Errors

### "Workflow not found"
- File not committed/pushed
- Wrong file location
- YAML syntax error

### "Permission denied"
- GitHub Actions not enabled
- Repository permissions issue

### "Secrets not found"
- Secrets not added in repository settings
- Secret names don't match exactly (case-sensitive)

### "npm ci failed"
- Missing `package-lock.json`
- Run `npm install` locally and commit `package-lock.json`

## 10. Debug Workflow

Add this step at the beginning to debug:

```yaml
- name: Debug info
  run: |
    echo "Workflow triggered by: ${{ github.event_name }}"
    echo "Branch: ${{ github.ref }}"
    echo "Commit: ${{ github.sha }}"
    ls -la
    pwd
```

## 11. Test with Minimal Workflow

If nothing works, try this minimal test workflow:

Create `.github/workflows/test.yml`:
```yaml
name: Test Workflow

on:
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Test
        run: echo "Workflow is working!"
```

If this runs, the issue is with the main workflow file.

## 12. Still Not Working?

1. **Check GitHub Status**: https://www.githubstatus.com/
2. **Check Repository Settings**: Make sure Actions are enabled
3. **Verify File Path**: The workflow file must be in `.github/workflows/`
4. **Check Branch**: Make sure you're on the default branch (usually `main`)
5. **Try Different Trigger**: Add `push` trigger temporarily:
   ```yaml
   on:
     push:
       branches: [ main ]
     workflow_dispatch:
   ```
   Then push a commit to trigger it.

## Quick Checklist

- [ ] Workflow file exists at `.github/workflows/daily-reel.yml`
- [ ] File is committed and pushed to GitHub
- [ ] GitHub Actions is enabled in repository settings
- [ ] You can see the workflow in the Actions tab
- [ ] "Run workflow" button is visible
- [ ] All required secrets are added
- [ ] YAML syntax is valid (no errors)

