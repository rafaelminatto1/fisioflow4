# 📊 FisioFlow - Monitoring & Health Checks Setup

## 🎯 Overview

Sistema completo de monitoramento para produção incluindo health checks, logging, alertas e backup automático.

## 🏥 Health Checks

### Backend Health Check

Já implementado em `backend/app/routes/health.py`:

```python
@health_bp.route('/health')
def health_check():
    return {
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0',
        'database': check_database_health(),
        'redis': check_redis_health(),
        'services': check_external_services()
    }
```

### Frontend Health Check

```javascript
// frontend/pages/api/health.js
export default function handler(req, res) {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV,
    api_connectivity: 'checking...'
  };

  // Test API connectivity
  fetch(process.env.NEXT_PUBLIC_API_URL + '/health')
    .then(response => {
      healthCheck.api_connectivity = response.ok ? 'healthy' : 'degraded';
    })
    .catch(() => {
      healthCheck.api_connectivity = 'unhealthy';
    })
    .finally(() => {
      res.status(200).json(healthCheck);
    });
}
```

### Database Health Monitoring

```python
# backend/app/utils/health_checks.py
def check_database_health():
    try:
        # Test database connection
        db.session.execute(text('SELECT 1'))
        
        # Check connection pool
        pool_status = db.engine.pool.status()
        
        return {
            'status': 'healthy',
            'connections': {
                'active': pool_status.split()[0],
                'total': pool_status.split()[2]
            },
            'response_time_ms': measure_query_time()
        }
    except Exception as e:
        return {
            'status': 'unhealthy',
            'error': str(e)
        }

def measure_query_time():
    start = time.time()
    db.session.execute(text('SELECT 1'))
    return round((time.time() - start) * 1000, 2)
```

## 📋 Logging Setup

### Structured Logging (Backend)

```python
# backend/app/utils/logger.py
import logging
import json
from datetime import datetime

class StructuredLogger:
    def __init__(self):
        self.logger = logging.getLogger('fisioflow')
        self.logger.setLevel(logging.INFO)
        
        handler = logging.StreamHandler()
        handler.setFormatter(JsonFormatter())
        self.logger.addHandler(handler)
    
    def info(self, message, **kwargs):
        self.logger.info(json.dumps({
            'timestamp': datetime.utcnow().isoformat(),
            'level': 'INFO',
            'message': message,
            'metadata': kwargs
        }))
    
    def error(self, message, **kwargs):
        self.logger.error(json.dumps({
            'timestamp': datetime.utcnow().isoformat(),
            'level': 'ERROR',
            'message': message,
            'metadata': kwargs
        }))

# Usage
logger = StructuredLogger()
logger.info('User logged in', user_id=123, ip='192.168.1.1')
```

### Request Logging Middleware

```python
# backend/app/middleware/logging.py
@app.before_request
def log_request():
    logger.info('Request started', 
        method=request.method,
        url=request.url,
        ip=request.remote_addr,
        user_agent=request.user_agent.string
    )

@app.after_request
def log_response(response):
    logger.info('Request completed',
        status_code=response.status_code,
        response_time_ms=g.get('request_time', 0)
    )
    return response
```

### Frontend Logging

```javascript
// frontend/lib/logger.js
class Logger {
  constructor() {
    this.environment = process.env.NODE_ENV;
    this.apiUrl = process.env.NEXT_PUBLIC_API_URL;
  }

  log(level, message, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata: {
        ...metadata,
        url: window.location.href,
        userAgent: navigator.userAgent,
        environment: this.environment
      }
    };

    // Console logging
    console[level.toLowerCase()](logEntry);

    // Send to backend for persistent logging
    if (this.environment === 'production') {
      this.sendToBackend(logEntry);
    }
  }

  info(message, metadata) {
    this.log('INFO', message, metadata);
  }

  error(message, metadata) {
    this.log('ERROR', message, metadata);
  }

  sendToBackend(logEntry) {
    fetch(`${this.apiUrl}/api/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logEntry)
    }).catch(() => {
      // Fail silently to avoid infinite loops
    });
  }
}

export const logger = new Logger();
```

## 🚨 Alerting System

### Railway Alerts

Configure no Railway Dashboard:
```yaml
# railway.toml
[deploy.healthcheck]
path = "/health"
timeout = 30
interval = 60
unhealthy_threshold = 3

[alerts]
  [[alerts.metric]]
  type = "cpu"
  threshold = 80
  duration = "5m"
  
  [[alerts.metric]]
  type = "memory"
  threshold = 85
  duration = "3m"
  
  [[alerts.metric]]
  type = "response_time"
  threshold = 2000  # 2 seconds
  duration = "2m"
```

### Sentry Integration

```python
# backend/app/__init__.py
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

sentry_sdk.init(
    dsn=os.getenv('SENTRY_DSN'),
    integrations=[
        FlaskIntegration(transaction_style='endpoint'),
        SqlalchemyIntegration(),
    ],
    traces_sample_rate=0.1,
    profiles_sample_rate=0.1,
    environment=os.getenv('FLASK_ENV', 'development')
)
```

```javascript
// frontend/lib/sentry.js
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### Custom Alerts

```python
# backend/app/utils/alerts.py
import requests
from datetime import datetime

class AlertManager:
    def __init__(self):
        self.webhook_url = os.getenv('SLACK_WEBHOOK_URL')
        self.email_api = os.getenv('EMAIL_API_URL')
    
    def send_alert(self, severity, title, message, metadata={}):
        alert = {
            'timestamp': datetime.utcnow().isoformat(),
            'severity': severity,  # 'critical', 'warning', 'info'
            'title': title,
            'message': message,
            'metadata': metadata,
            'service': 'fisioflow-backend'
        }
        
        if severity == 'critical':
            self.send_slack_alert(alert)
            self.send_email_alert(alert)
        elif severity == 'warning':
            self.send_slack_alert(alert)
    
    def send_slack_alert(self, alert):
        payload = {
            'text': f"🚨 {alert['title']}",
            'attachments': [{
                'color': 'danger' if alert['severity'] == 'critical' else 'warning',
                'fields': [
                    {'title': 'Message', 'value': alert['message'], 'short': False},
                    {'title': 'Severity', 'value': alert['severity'], 'short': True},
                    {'title': 'Time', 'value': alert['timestamp'], 'short': True}
                ]
            }]
        }
        
        requests.post(self.webhook_url, json=payload)

# Usage
alert_manager = AlertManager()
alert_manager.send_alert('critical', 'Database Connection Lost', 'Unable to connect to PostgreSQL database')
```

## 💾 Backup Automation

### Neon Automatic Backups

Neon já fornece backups automáticos, mas vamos configurar backups adicionais:

```python
# backend/app/tasks/backup.py
from celery import Celery
import subprocess
import boto3
from datetime import datetime

celery = Celery('fisioflow')

@celery.task
def create_database_backup():
    """Create and upload database backup to S3"""
    try:
        # Create backup filename
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        backup_file = f'fisioflow_backup_{timestamp}.sql'
        
        # Create database dump
        subprocess.run([
            'pg_dump',
            os.getenv('DATABASE_URL'),
            '-f', backup_file,
            '--verbose'
        ], check=True)
        
        # Upload to S3
        s3 = boto3.client('s3')
        s3.upload_file(
            backup_file, 
            os.getenv('BACKUP_BUCKET'),
            f'database/{backup_file}'
        )
        
        # Clean local file
        os.remove(backup_file)
        
        logger.info('Database backup completed', backup_file=backup_file)
        
    except Exception as e:
        alert_manager.send_alert('critical', 'Backup Failed', str(e))
        raise

# Schedule backup every 6 hours
@celery.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(
        21600.0,  # 6 hours
        create_database_backup.s(),
        name='database backup'
    )
```

### Application Data Backup

```python
# backend/app/tasks/backup.py
@celery.task
def backup_uploaded_files():
    """Backup user uploaded files"""
    try:
        # Sync uploads to S3 backup bucket
        subprocess.run([
            'aws', 's3', 'sync',
            './uploads/',
            f's3://{os.getenv("BACKUP_BUCKET")}/files/',
            '--delete'
        ], check=True)
        
        logger.info('Files backup completed')
        
    except Exception as e:
        alert_manager.send_alert('warning', 'Files Backup Failed', str(e))
```

## 📊 Performance Monitoring

### Custom Metrics Collection

```python
# backend/app/middleware/metrics.py
import time
import psutil
from flask import request, g

@app.before_request
def start_timer():
    g.start = time.time()

@app.after_request
def record_metrics(response):
    duration = time.time() - g.start
    
    # Record request metrics
    metrics.record('request_duration', duration, tags={
        'method': request.method,
        'endpoint': request.endpoint,
        'status_code': response.status_code
    })
    
    # System metrics
    metrics.record('cpu_usage', psutil.cpu_percent())
    metrics.record('memory_usage', psutil.virtual_memory().percent)
    
    return response

class MetricsCollector:
    def __init__(self):
        self.metrics = []
    
    def record(self, metric_name, value, tags={}):
        self.metrics.append({
            'name': metric_name,
            'value': value,
            'tags': tags,
            'timestamp': time.time()
        })
        
        # Send to monitoring service every 100 metrics
        if len(self.metrics) >= 100:
            self.flush()
    
    def flush(self):
        # Send to DataDog, New Relic, or custom endpoint
        self.send_to_monitoring_service(self.metrics)
        self.metrics = []
```

### Database Query Monitoring

```python
# backend/app/utils/db_monitor.py
import sqlalchemy
from sqlalchemy import event

@event.listens_for(sqlalchemy.engine.Engine, "before_cursor_execute")
def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    context._query_start_time = time.time()

@event.listens_for(sqlalchemy.engine.Engine, "after_cursor_execute")
def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    total = time.time() - context._query_start_time
    
    # Log slow queries
    if total > 1.0:  # 1 second threshold
        logger.warning('Slow query detected', 
            duration=total,
            query=statement[:100],
            parameters=str(parameters)[:100]
        )
    
    # Record metrics
    metrics.record('database_query_duration', total, tags={
        'query_type': statement.split()[0].upper()
    })
```

## 🔧 Deployment & Environment Variables

### Railway Environment Variables

```bash
# Monitoring & Logging
SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"
LOG_LEVEL="INFO"

# Alerts
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/your/slack/webhook"
ALERT_EMAIL="alerts@fisioflow.com"

# Backup
BACKUP_ENABLED="true"
BACKUP_FREQUENCY="6h"
BACKUP_RETENTION_DAYS="30"
BACKUP_BUCKET="fisioflow-backups"
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"

# Performance
ENABLE_METRICS="true"
METRICS_ENDPOINT="https://your-metrics-collector.com"
```

### Celery Configuration (Background Tasks)

```python
# backend/celery_app.py
from celery import Celery

celery = Celery('fisioflow')
celery.conf.update(
    broker_url=os.getenv('REDIS_URL'),
    result_backend=os.getenv('REDIS_URL'),
    task_routes={
        'app.tasks.backup.*': {'queue': 'backup'},
        'app.tasks.notifications.*': {'queue': 'notifications'},
        'app.tasks.reports.*': {'queue': 'reports'}
    },
    beat_schedule={
        'database-backup': {
            'task': 'app.tasks.backup.create_database_backup',
            'schedule': 21600.0,  # 6 hours
        },
        'cleanup-logs': {
            'task': 'app.tasks.maintenance.cleanup_old_logs',
            'schedule': 86400.0,  # daily
        },
        'health-check-external-services': {
            'task': 'app.tasks.monitoring.check_external_services',
            'schedule': 300.0,  # 5 minutes
        }
    }
)
```

## 📈 Monitoring Dashboard

### Grafana Dashboard Configuration

```json
{
  "dashboard": {
    "title": "FisioFlow Production Monitoring",
    "panels": [
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "avg(request_duration) by (endpoint)",
            "legendFormat": "{{endpoint}}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx Errors"
          }
        ]
      },
      {
        "title": "Database Performance",
        "type": "graph",
        "targets": [
          {
            "expr": "avg(database_query_duration)",
            "legendFormat": "Avg Query Time"
          }
        ]
      }
    ]
  }
}
```

## 🎯 Implementation Checklist

### ✅ Basic Monitoring
- [ ] Health check endpoints implemented
- [ ] Structured logging configured
- [ ] Error tracking (Sentry) setup
- [ ] Basic Railway alerts configured

### 🔄 Advanced Monitoring
- [ ] Custom metrics collection
- [ ] Performance monitoring
- [ ] Database query monitoring
- [ ] Business metrics tracking

### 🚨 Alerting
- [ ] Slack notifications setup
- [ ] Email alerts configured
- [ ] Escalation procedures defined
- [ ] On-call rotation established

### 💾 Backup & Recovery
- [ ] Automated database backups
- [ ] File backup procedures
- [ ] Backup verification tests
- [ ] Disaster recovery plan

### 📊 Dashboards
- [ ] System metrics dashboard
- [ ] Business metrics dashboard
- [ ] Error tracking dashboard
- [ ] User behavior analytics

**Next Steps**: Execute deployment and configure monitoring services