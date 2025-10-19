# DriftGuard MVP Data Models and Database Schema

## Overview
This document defines the core data models, database schema, and relationships for the DriftGuard MVP system. The schema is designed for PostgreSQL with extensions for advanced features like JSON storage and time-series data handling.

## Core Data Model Principles

### Design Principles
- **Normalized Structure**: Eliminate redundancy while maintaining query efficiency
- **Flexible JSON Fields**: Store unstructured cloud provider metadata
- **Audit Trail**: Comprehensive logging for compliance and debugging
- **Temporal Awareness**: Track change history and event sequences
- **Multi-tenancy Ready**: Environment and organization isolation fields

### Schema Organization
- **Transactional Tables**: Core business data with ACID properties
- **Analytics Tables**: Pre-computed aggregations for dashboard performance
- **Audit Tables**: Immutable event logs for compliance
- **Reference Tables**: Static data for dropdowns and classifications

## Database Schema

### 1. Environment & Organization (Reference Data)

#### Table: `organizations`
```sql
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    contact_email VARCHAR(320),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```

#### Table: `environments`
```sql
CREATE TABLE environments (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    cloud_provider VARCHAR(20) NOT NULL CHECK (cloud_provider IN ('aws', 'gcp', 'azure')),
    region VARCHAR(50),
    account_id VARCHAR(50), -- AWS Account ID, GCP Project ID, or Azure Subscription ID
    tags JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(organization_id, slug)
);
```

### 2. Infrastructure as Code (IaC) Tracking

#### Table: `iac_repositories`
```sql
CREATE TABLE iac_repositories (
    id SERIAL PRIMARY KEY,
    environment_id INTEGER REFERENCES environments(id),
    name VARCHAR(255) NOT NULL,
    repository_url VARCHAR(500),
    branch VARCHAR(100) DEFAULT 'main',
    tool VARCHAR(20) NOT NULL CHECK (tool IN ('terraform', 'cloudformation', 'kubernetes')),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    credentials_encrypted BYTEA, -- Encrypted service account keys/tokens
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(environment_id, repository_url, branch)
);
```

#### Table: `iac_resources`
```sql
CREATE TABLE iac_resources (
    id SERIAL PRIMARY KEY,
    iac_repository_id INTEGER REFERENCES iac_repositories(id),
    resource_type VARCHAR(100) NOT NULL, -- e.g., "aws_instance", "kubernetes_deployment"
    resource_id VARCHAR(255) NOT NULL, -- Terraform resource address
    declared_state JSONB NOT NULL, -- Full resource configuration
    last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(iac_repository_id, resource_id)
);
```

### 3. Drift Detection Core

#### Table: `drift_events`
```sql
CREATE TABLE drift_events (
    id SERIAL PRIMARY KEY,
    environment_id INTEGER REFERENCES environments(id),
    iac_resource_id INTEGER REFERENCES iac_resources(id),
    drift_type VARCHAR(50) NOT NULL CHECK (drift_type IN ('modified', 'deleted', 'added', 'moved')),
    actual_state JSONB, -- Current cloud resource state
    declared_state JSONB, -- IaC declared state at detection time
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_type VARCHAR(20) CHECK (resolution_type IN ('auto_revert', 'codify_iac', 'accepted', 'escalated')),
    severity_score DECIMAL(3,2) CHECK (severity_score >= 0 AND severity_score <= 1),
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    risk_assessment JSONB DEFAULT '{}', -- security, performance, cost, compliance impacts
    tags JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);
```

#### Table: `drift_changes`
```sql
CREATE TABLE drift_changes (
    id SERIAL PRIMARY KEY,
    drift_event_id INTEGER REFERENCES drift_events(id),
    property_path VARCHAR(500) NOT NULL, -- JSON path to changed property
    declared_value JSONB,
    actual_value JSONB,
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('modified', 'added', 'removed')),
    is_security_critical BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Machine Learning & Analysis

#### Table: `ml_models`
```sql
CREATE TABLE ml_models (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    version VARCHAR(50) NOT NULL,
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('classification', 'regression', 'clustering')),
    framework VARCHAR(50) NOT NULL, -- scikit-learn, xgboost, tensorflow
    artifact_path VARCHAR(500), -- Path to stored model artifacts
    features JSONB NOT NULL, -- List of input features
    target_classes JSONB, -- For classification models
    metrics JSONB DEFAULT '{}', -- accuracy, precision, recall, f1
    trained_at TIMESTAMP WITH TIME ZONE NOT NULL,
    deployed_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Table: `ml_predictions`
```sql
CREATE TABLE ml_predictions (
    id SERIAL PRIMARY KEY,
    drift_event_id INTEGER REFERENCES drift_events(id),
    ml_model_id INTEGER REFERENCES ml_models(id),
    prediction_result JSONB NOT NULL, -- Classification results, confidence scores
    prediction_metadata JSONB DEFAULT '{}', -- Model version, feature importance
    predicted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Table: `drift_cause_analysis`
```sql
CREATE TABLE drift_cause_analysis (
    id SERIAL PRIMARY KEY,
    drift_event_id INTEGER REFERENCES drift_events(id),
    cause_category VARCHAR(50) NOT NULL CHECK (
        cause_category IN (
            'emergency_fix', 'manual_troubleshooting', 'security_response',
            'configuration_error', 'automated_response', 'unknown'
        )
    ),
    confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    contributing_factors JSONB DEFAULT '[]', -- Array of factor objects with evidence
    temporal_context JSONB DEFAULT '{}', -- Time-based analysis results
    user_attribution JSONB DEFAULT '{}', -- Git commits, audit logs correlation
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 5. Recommendations & Actions

#### Table: `recommendations`
```sql
CREATE TABLE recommendations (
    id SERIAL PRIMARY KEY,
    drift_event_id INTEGER REFERENCES drift_events(id),
    recommendation_type VARCHAR(30) NOT NULL CHECK (
        recommendation_type IN (
            'auto_revert', 'codify_iac', 'escalate_review', 'accept_exception', 'manual_review'
        )
    ),
    priority VARCHAR(10) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    confidence_score DECIMAL(3,2) NOT NULL,
    rationale TEXT NOT NULL,
    implementation_steps JSONB DEFAULT '[]', -- Ordered list of action steps
    risk_assessment JSONB DEFAULT '{}', -- success_probability, potential_impacts
    estimated_effort VARCHAR(20) CHECK (estimated_effort IN ('minutes', 'hours', 'days')),
    recommended_by VARCHAR(50) NOT NULL, -- ml_model, ai_agent, human
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE, -- Auto-expire stale recommendations
    implemented_at TIMESTAMP WITH TIME ZONE,
    implementation_result JSONB -- Success/failure details
);
```

### 6. Correlation & Context

#### Table: `correlation_events`
```sql
CREATE TABLE correlation_events (
    id SERIAL PRIMARY KEY,
    drift_event_id INTEGER REFERENCES drift_events(id),
    correlation_type VARCHAR(50) NOT NULL, -- git_commit, incident_ticket, monitoring_alert
    external_id VARCHAR(255) NOT NULL, -- Commit hash, ticket number, alert ID
    external_system VARCHAR(50) NOT NULL, -- github, jira, servicenow, prometheus
    event_data JSONB NOT NULL,
    correlation_score DECIMAL(3,2), -- How closely related this event is
    temporal_offset INTERVAL, -- Time difference from drift event
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Table: `operational_context`
```sql
CREATE TABLE operational_context (
    id SERIAL PRIMARY KEY,
    drift_event_id INTEGER REFERENCES drift_events(id),
    context_type VARCHAR(30) NOT NULL CHECK (
        context_type IN ('incident', 'deployment', 'maintenance', 'security_event')
    ),
    context_data JSONB NOT NULL,
    incident_impact VARCHAR(10) CHECK (incident_impact IN ('low', 'medium', 'high')),
    time_window INTERVAL, -- Relevant time period before/after drift
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 7. Audit & Security

#### Table: `audit_log`
```sql
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER, -- NULL for system actions
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id INTEGER NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    organization_id INTEGER REFERENCES organizations(id),
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT
) PARTITION BY RANGE (timestamp);
```

#### Table: `user_sessions`
```sql
CREATE TABLE user_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    organization_id INTEGER REFERENCES organizations(id),
    ip_address INET NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```

### 8. Notifications & Workflows

#### Table: `notification_channels`
```sql
CREATE TABLE notification_channels (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    channel_type VARCHAR(30) NOT NULL CHECK (
        channel_type IN ('email', 'slack', 'webhook', 'pagerduty')
    ),
    configuration JSONB NOT NULL, -- Webhook URLs, API keys, etc.
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Table: `notifications`
```sql
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    drift_event_id INTEGER REFERENCES drift_events(id),
    channel_id INTEGER REFERENCES notification_channels(id),
    notification_type VARCHAR(30) NOT NULL, -- alert, summary, escalation
    subject VARCHAR(500),
    message TEXT,
    priority VARCHAR(10) CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);
```

### 9. Analytics & Insights

#### Table: `drift_metrics_daily`
```sql
CREATE TABLE drift_metrics_daily (
    id SERIAL PRIMARY KEY,
    environment_id INTEGER REFERENCES environments(id),
    date DATE NOT NULL,
    total_drifts INTEGER DEFAULT 0,
    resolved_drifts INTEGER DEFAULT 0,
    avg_resolution_time INTERVAL,
    top_cause_categories JSONB DEFAULT '{}',
    severity_distribution JSONB DEFAULT '{}',
    recommendation_adoption_rate DECIMAL(5,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(environment_id, date)
);
```

#### Table: `ml_performance_metrics`
```sql
CREATE TABLE ml_performance_metrics (
    id SERIAL PRIMARY KEY,
    ml_model_id INTEGER REFERENCES ml_models(id),
    evaluation_date DATE NOT NULL,
    training_data_size INTEGER,
    accuracy DECIMAL(5,4),
    precision_macro DECIMAL(5,4),
    recall_macro DECIMAL(5,4),
    f1_score_macro DECIMAL(5,4),
    confusion_matrix JSONB,
    feature_importance JSONB,
    cross_validation_scores JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Database Relationships & Constraints

### Foreign Key Relationships
- `environments → organizations` (Many-to-one)
- `iac_repositories → environments` (Many-to-one)
- `iac_resources → iac_repositories` (Many-to-one)
- `drift_events → environments, iac_resources` (Many-to-one)
- `drift_changes → drift_events` (Many-to-one)
- `ml_predictions → drift_events, ml_models` (Many-to-one)
- `drift_cause_analysis → drift_events` (One-to-one)
- `recommendations → drift_events` (Many-to-one)
- `correlation_events → drift_events` (Many-to-one)
- `operational_context → drift_events` (Many-to-one)

### Unique Constraints
- Organization-environment slug combinations
- IaC repository URL-branch combinations
- IaC resource addresses within repositories
- ML model names
- Daily metrics per environment

### Indexes for Performance

#### Primary Data Access Patterns
```sql
-- Drift events by environment and time
CREATE INDEX idx_drift_events_environment_time
ON drift_events(environment_id, detected_at DESC);

-- Active drifts for dashboard
CREATE INDEX idx_drift_events_unresolved
ON drift_events(environment_id, resolved_at)
WHERE resolved_at IS NULL;

-- ML predictions by drift event
CREATE INDEX idx_ml_predictions_drift_event
ON ml_predictions(drift_event_id);

-- Audit log by timestamp and organization
CREATE INDEX idx_audit_log_org_time
ON audit_log(organization_id, timestamp DESC);

-- Correlation events for timeline reconstruction
CREATE INDEX idx_correlation_events_drift_temporal
ON correlation_events(drift_event_id, temporal_offset);
```

## Data Lifecycle & Archiving

### Retention Policies
- **Active Data**: Last 90 days in primary tables
- **Analytics Data**: Roll up beyond 90 days to summary tables
- **Audit Data**: Retain for 7 years for compliance
- **ML Artifacts**: Keep last 5 versions actively

### Archival Strategy
- **Automated Archival**: Partition-based data movement to cold storage
- **Compression**: Use PostgreSQL table compression for historical data
- **External Storage**: Move audit logs > 1 year to object storage

## Migration Strategy

### Initial Schema
```sql
-- Step 1: Create base tables
-- Step 2: Create indexes
-- Step 3: Establish foreign keys
-- Step 4: Add check constraints
-- Step 5: Create partition triggers
```

### Schema Evolution
- **Versioned Migrations**: Sequential migration files for changes
- **Backward Compatibility**: Ensure zero-downtime deployments
- **Data Migrations**: Handle schema changes with data transformations

## Performance Characteristics

### Expected Data Volumes
- **Drift Events**: 10,000 - 50,000 per day per large organization
- **ML Predictions**: 10,000 - 100,000 per day
- **Audit Logs**: 100,000+ entries per day
- **Correlation Events**: 50,000 - 200,000 per day

### Query Performance Targets
- **Dashboard Queries**: < 500ms for aggregations
- **Drift Details**: < 200ms for detailed views
- **Search Operations**: < 2s for complex filters
- **Analytics Queries**: < 10s for historical analysis

This schema provides a robust foundation for the DriftGuard MVP, supporting the core use cases while enabling future expansion and optimization.
