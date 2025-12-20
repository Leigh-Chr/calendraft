# Production Commands Guide - Calendraft

Guide to production scripts for managing Calendraft in production.

> 💡 **Quick start**: See `scripts/production/README.md` for a quick introduction.  
> 📖 **Basic Docker commands**: See [DEPLOYMENT.md](./DEPLOYMENT.md) for standard Docker commands.

---

## 📋 Table of Contents

1. [Production Scripts](#production-scripts)
2. [Monitoring](#monitoring)
3. [Automation](#automation)
4. [Troubleshooting](#troubleshooting)

---

## 🚀 Production Scripts

All scripts are located in `scripts/production/`. Make them executable:

```bash
chmod +x scripts/production/*.sh
```

### Deployment

```bash
# Simple deployment
./scripts/production/deploy.sh

# Deployment with backup
./scripts/production/deploy.sh --backup

# Deployment with migrations
./scripts/production/deploy.sh --migrate

# Deploy a specific service
./scripts/production/deploy.sh --service=web

# Complete deployment
./scripts/production/deploy.sh --backup --migrate
```

### Backup

```bash
# Create a backup
./scripts/production/backup.sh

# List backups
./scripts/production/backup.sh --list

# Restore a backup
./scripts/production/backup.sh --restore=~/backups/db-backup-20251213-120000.sql.gz
```

### Monitoring

```bash
# Complete monitoring
./scripts/production/monitor.sh --all

# Service health
./scripts/production/monitor.sh --health

# Resource statistics
./scripts/production/monitor.sh --stats

# Recent logs
./scripts/production/monitor.sh --logs

# Recent errors
./scripts/production/monitor.sh --errors
```

### Health Check

```bash
# Quick check
./scripts/production/health-check.sh

# Detailed check
./scripts/production/health-check.sh --verbose
```

### Cleanup

```bash
# Complete cleanup (without volumes)
./scripts/production/cleanup.sh --all

# Clean unused images
./scripts/production/cleanup.sh --images

# Clean build cache
./scripts/production/cleanup.sh --build-cache

# Clean logs
./scripts/production/cleanup.sh --logs

# ⚠️ Complete system cleanup (destructive)
./scripts/production/cleanup.sh --system
```

### Quick Commands

```bash
# Service status
./scripts/production/quick-commands.sh status

# Real-time logs
./scripts/production/quick-commands.sh logs
./scripts/production/quick-commands.sh logs server

# Restart a service
./scripts/production/quick-commands.sh restart web

# Access PostgreSQL
./scripts/production/quick-commands.sh shell-db

# Statistics
./scripts/production/quick-commands.sh stats
```

### Rollback

```bash
# Interactive rollback (asks for commit)
./scripts/production/rollback.sh

# Rollback to a specific commit
./scripts/production/rollback.sh --commit=abc123

# Rollback without backup
./scripts/production/rollback.sh --commit=HEAD~1 --no-backup

# Rollback without restoring database
./scripts/production/rollback.sh --commit=HEAD~1 --no-db
```

### Backup Verification

```bash
# Verify all backups
./scripts/production/verify-backup.sh

# Verify a specific file
./scripts/production/verify-backup.sh ~/backups/db-backup-20251213.sql.gz
```

### Security Audit

```bash
# Quick audit
./scripts/production/security-audit.sh

# Detailed audit
./scripts/production/security-audit.sh --verbose
```

### Status Report

```bash
# Text report (displayed)
./scripts/production/report.sh

# JSON report
./scripts/production/report.sh --format=json

# Report saved to file
./scripts/production/report.sh --format=text --output=report.txt
```

---

> 📖 **Note**: For basic Docker commands (logs, restart, stats, etc.) and database management, see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## 🔄 Automation

### Cron Configuration

To automate recurring tasks, add entries to your crontab:

```bash
# Edit crontab
crontab -e
```

### Complete Crontab Example

```bash
# Calendraft - Automated tasks
# Daily backup at 2 AM
0 2 * * * cd ~/calendraft && ./scripts/production/backup.sh >> ~/backup.log 2>&1

# Daily health check at 8 AM
0 8 * * * cd ~/calendraft && ./scripts/production/health-check.sh >> ~/health.log 2>&1

# Daily report at midnight
0 0 * * * cd ~/calendraft && ./scripts/production/report.sh --format=json --output=~/reports/status-$(date +\%Y\%m\%d).json

# Weekly security audit (Monday 6 AM)
0 6 * * 1 cd ~/calendraft && ./scripts/production/security-audit.sh >> ~/security-audit.log 2>&1

# Weekly cleanup (Sunday 3 AM)
0 3 * * 0 cd ~/calendraft && ./scripts/production/cleanup.sh --images --build-cache >> ~/cleanup.log 2>&1
```

---

## 🐛 Troubleshooting

### Troubleshooting Workflow

1. **Diagnose the problem**
   ```bash
   ./scripts/production/monitor.sh --all
   ./scripts/production/health-check.sh --verbose
   ```

2. **Check logs**
   ```bash
   ./scripts/production/monitor.sh --errors
   ./scripts/production/quick-commands.sh logs
   ```

3. **Corrective actions**
   - Restart a service: `./scripts/production/quick-commands.sh restart [service]`
   - Rollback: `./scripts/production/rollback.sh`
   - Restore from backup: `./scripts/production/backup.sh --restore=FILE`

> 📖 **For more details**: See [DEPLOYMENT.md](./DEPLOYMENT.md) for Docker and system troubleshooting.

---

## 📚 Resources

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide with Docker commands
- [VPS_DEPLOYMENT.md](./VPS_DEPLOYMENT.md) - VPS deployment guide
- [SECURITY.md](./SECURITY.md) - Security documentation
- [scripts/production/README.md](./scripts/production/README.md) - Quick script documentation
