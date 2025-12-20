# Production Scripts - Calendraft

Collection of scripts to manage Calendraft in production securely and efficiently.

> 📚 **Complete documentation**: See `PRODUCTION_COMMANDS.md` at the project root for the complete reference guide.

## 🚀 Quick Start

```bash
# 1. Make scripts executable
chmod +x scripts/production/*.sh

# 2. Install on server (optional)
./scripts/production/install.sh user@server

# 3. Check health
./scripts/production/health-check.sh

# 4. Deploy
./scripts/production/deploy.sh --backup
```

## 📋 Available Scripts

| Script | Description | Usage |
|--------|-------------|-------|
| `deploy.sh` | Deployment with backup and migrations | `./deploy.sh [--backup] [--migrate] [--service=SERVICE]` |
| `backup.sh` | Database backup and restoration | `./backup.sh [--list] [--restore=FILE]` |
| `rollback.sh` | Revert to a previous version | `./rollback.sh [--commit=HASH] [--no-backup] [--no-db]` |
| `monitor.sh` | Service and resource monitoring | `./monitor.sh [--all\|--health\|--stats\|--logs\|--errors]` |
| `health-check.sh` | Complete health check | `./health-check.sh [--verbose]` |
| `security-audit.sh` | Complete security audit | `./security-audit.sh [--verbose]` |
| `verify-backup.sh` | Backup integrity verification | `./verify-backup.sh [FILE]` |
| `report.sh` | Status report (text or JSON) | `./report.sh [--format=text\|json] [--output=FILE]` |
| `cleanup.sh` | Docker resource cleanup | `./cleanup.sh [--all\|--images\|--volumes\|--build-cache\|--logs\|--system]` |
| `quick-commands.sh` | Frequent Docker commands | `./quick-commands.sh [command] [service]` |
| `install.sh` | Installation on remote server | `./install.sh user@server` |
| `help.sh` | Built-in help | `./help.sh [script]` |

## 🔧 Configuration

Scripts use environment variables with default values:

```bash
PROJECT_DIR=~/calendraft      # Auto-detected if docker-compose.yml present
BACKUP_DIR=~/backups          # Backup directory
LOG_FILE=~/deploy.log         # Log file for deploy.sh
RETENTION_DAYS=30             # Backup retention (days)
```

You can override them before running scripts:

```bash
export BACKUP_DIR=/mnt/backups
export RETENTION_DAYS=60
./backup.sh
```

## 🎯 Common Use Cases

### Regular Deployment

```bash
# Deployment with automatic backup
./deploy.sh --backup --migrate
```

### Daily Backup

```bash
# Create a backup (automatic rotation after 30 days)
./backup.sh

# Verify integrity
./verify-backup.sh
```

### Daily Monitoring

```bash
# Complete overview
./monitor.sh --all

# Quick health check
./health-check.sh
```

### In Case of Problem

```bash
# 1. Diagnose
./monitor.sh --errors
./health-check.sh --verbose

# 2. Rollback if necessary
./rollback.sh --commit=HEAD~1

# 3. Restore from backup if necessary
./backup.sh --restore=~/backups/db-backup-20251213-120000.sql.gz

# Note: Rollback does not automatically restore the database
# for security reasons. Use --no-db if you only want
# to revert to previous code without touching the DB.
```

### Security Audit

```bash
# Complete audit
./security-audit.sh --verbose

# Status report for documentation
./report.sh --format=json --output=status-report.json
```

## 🛠️ Prerequisites

- Docker and Docker Compose v2
- Git
- Bash 4.0+
- `curl` (for health checks)
- `gzip` (for backups)

Scripts automatically check these prerequisites before execution.

## 🔒 Security

All scripts include:

- ✅ User input validation
- ✅ Prerequisites check (Docker, Git, etc.)
- ✅ Protection against command injection
- ✅ Robust error handling
- ✅ Confirmations for destructive operations

## 📝 Notes

- All scripts are designed to be run from the project directory
- Scripts automatically detect the directory if `docker-compose.yml` is present
- Logs are saved in `LOG_FILE` (default `~/deploy.log` for `deploy.sh`)
- Backups are automatically compressed and rotated after `RETENTION_DAYS`

## 🆘 Support

To get help on a specific script:

```bash
./help.sh deploy
./help.sh backup
# etc.
```

For complete documentation with all examples and detailed use cases, see `PRODUCTION_COMMANDS.md` at the project root.
