# DriftGuard MVP API Specification

## Overview
This document defines the REST API endpoints for the DriftGuard MVP system. The API follows RESTful design principles with JSON responses and uses standard HTTP methods and status codes.

## API Design Principles

### RESTful Conventions
- **Resource-Based URLs**: Clear, hierarchical resource paths
- **HTTP Methods**: Standard CRUD operations (GET, POST, PUT, PATCH, DELETE)
- **Stateless**: Each request contains all necessary information
- **JSON Responses**: Consistent data format across all endpoints

### Request/Response Patterns
- **Pagination**: Large result sets use cursor-based pagination
- **Filtering**: Query parameters for resource filtering
- **Sorting**: Configurable result ordering
- **Error Handling**: Structured error responses

### Authentication & Authorization
- **JWT Tokens**: Bearer token authentication
- **Role-Based Access**: View, Edit, Admin permissions
- **Organization Scoping**: Multi-tenant isolation

## API Endpoints

### Authentication

#### POST /api/v1/auth/login
Authenticate user and return JWT token.

**Request Body:**
```json
{
  "email": "user@company.com",
  "password": "secure_password",
  "organization_slug": "acme-corp"
}
```

**Response (200):**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "id": 123,
    "email": "user@company.com",
    "role": "admin",
    "organization": {
      "id": 456,
      "name": "ACME Corp",
      "slug": "acme-corp"
    }
  }
}
```

### Environments

#### GET /api/v1/environments
List environments for the authenticated user's organization.

**Query Parameters:**
- `cloud_provider` (optional): aws|gcp|azure
- `is_active` (optional): true|false
- `page_size` (optional): 20 (default)
- `cursor` (optional): Pagination cursor

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Production AWS",
      "slug": "prod-aws",
      "cloud_provider": "aws",
      "region": "us-east-1",
      "account_id": "123456789012",
      "tags": {
        "environment": "production",
        "cost-center": "engineering"
      },
      "is_active": true,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "has_next": true,
    "cursor": "eyJpZCI6MTAsICJjcmVhdGVkX2F0IjoiMjAyNC0wMS0xNVQxMDozMDowMFoifQ=="
  }
}
```

#### POST /api/v1/environments
Create a new environment.

**Request Body:**
```json
{
  "name": "Staging GCP",
  "slug": "staging-gcp",
  "cloud_provider": "gcp",
  "region": "us-central1",
  "account_id": "my-gcp-project-123",
  "tags": {
    "environment": "staging",
    "team": "platform"
  }
}
```

**Response (201):** Same as GET individual environment.

#### GET /api/v1/environments/{id}
Get environment details.

#### PUT /api/v1/environments/{id}
Update environment configuration.

#### DELETE /api/v1/environments/{id}
Deactivate environment (soft delete).

### Drift Events

#### GET /api/v1/drifts
List drift events with filtering and pagination.

**Query Parameters:**
- `environment_id` (optional)
- `status` (optional): active|resolved
- `severity_min` (optional): 0.0-1.0
- `drift_type` (optional): modified|deleted|added|moved
- `detected_after` (optional): ISO 8601 datetime
- `resolved` (optional): true|false
- `page_size` (optional): 20 (default)
- `cursor` (optional): Pagination cursor

**Response (200):**
```json
{
  "data": [
    {
      "id": 12345,
      "environment": {
        "id": 1,
        "name": "Production AWS",
        "cloud_provider": "aws"
      },
      "iac_resource": {
        "id": 678,
        "resource_type": "aws_instance",
        "resource_id": "web_server",
        "declared_state": {"instance_type": "t3.medium", "ami": "ami-12345"}
      },
      "drift_type": "modified",
      "actual_state": {"instance_type": "t3.large", "ami": "ami-12345"},
      "declared_state": {"instance_type": "t3.medium", "ami": "ami-12345"},
      "detected_at": "2024-01-15T14:30:00Z",
      "severity_score": 0.7,
      "confidence_score": 0.95,
      "resolution_type": null,
      "changes": [
        {
          "property_path": "instance_type",
          "declared_value": "t3.medium",
          "actual_value": "t3.large",
          "change_type": "modified",
          "is_security_critical": false
        }
      ]
    }
  ],
  "pagination": {
    "has_next": true,
    "cursor": "eyJpZCI6MTIzNDUsICJkZXRlY3RlZF9hdCI6IjIwMjQtMDEtMTVUMTQ6MzA6MDBaIn0="
  }
}
```

#### GET /api/v1/drifts/{id}
Get detailed drift event information.

**Response (200):**
```json
{
  "id": 12345,
  "environment": { ... },
  "iac_resource": { ... },
  "drift_type": "modified",
  "actual_state": { ... },
  "declared_state": { ... },
  "detected_at": "2024-01-15T14:30:00Z",
  "resolved_at": null,
  "severity_score": 0.7,
  "confidence_score": 0.95,
  "risk_assessment": {
    "security": 0.2,
    "performance": 0.8,
    "cost": 0.6,
    "compliance": 0.1
  },
  "cause_analysis": {
    "cause_category": "manual_troubleshooting",
    "confidence_score": 0.85,
    "contributing_factors": [
      {
        "factor": "incident_ticket",
        "evidence": "TICKET-123: Database performance issue",
        "correlation_score": 0.92
      }
    ],
    "temporal_context": {
      "related_events": 3,
      "time_window": "2 hours"
    }
  },
  "recommendations": [
    {
      "id": 789,
      "recommendation_type": "codify_iac",
      "priority": "medium",
      "confidence_score": 0.88,
      "rationale": "Instance type change should be codified in IaC for consistency",
      "implementation_steps": [
        "Update Terraform configuration file",
        "Commit and create pull request",
        "Apply changes through CI/CD pipeline"
      ],
      "estimated_effort": "hours",
      "recommended_by": "ml_model"
    }
  ]
}
```

#### POST /api/v1/drifts/{id}/analyze
Trigger AI analysis for a drift event.

**Response (200):**
```json
{
  "analysis_job": {
    "id": "analysis_12345",
    "status": "running",
    "started_at": "2024-01-15T14:30:05Z",
    "estimated_completion": "2024-01-15T14:30:35Z"
  }
}
```

#### GET /api/v1/drifts/{id}/analyze/{job_id}
Get analysis job status and results.

#### PUT /api/v1/drifts/{id}/resolve
Resolve a drift event with specified action.

**Request Body:**
```json
{
  "resolution_type": "codify_iac",
  "comment": "Updated Terraform configuration to match actual instance type",
  "implemented_recommendation_id": 789
}
```

### Recommendations

#### GET /api/v1/recommendations
List recommendations with filtering.

**Query Parameters:**
- `drift_event_id` (optional)
- `recommendation_type` (optional)
- `priority` (optional): low|medium|high|critical
- `implemented` (optional): true|false
- `page_size` (optional): 20 (default)

#### GET /api/v1/recommendations/{id}
Get detailed recommendation information.

#### PUT /api/v1/recommendations/{id}/implement
Mark recommendation as implemented.

**Request Body:**
```json
{
  "implementation_result": {
    "success": true,
    "executed_steps": ["Updated Terraform", "Committed changes", "Deployed via CI/CD"],
    "time_taken": "45 minutes",
    "notes": "Successfully updated configuration"
  }
}
```

### ML Models & Predictions

#### GET /api/v1/models
List ML models with status and performance metrics.

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "drift_cause_classifier_v1.2",
      "version": "1.2",
      "model_type": "classification",
      "framework": "xgboost",
      "metrics": {
        "accuracy": 0.87,
        "precision_macro": 0.85,
        "recall_macro": 0.81,
        "f1_score_macro": 0.83
      },
      "is_active": true,
      "deployed_at": "2024-01-10T09:00:00Z",
      "target_classes": [
        "emergency_fix",
        "manual_troubleshooting",
        "security_response",
        "configuration_error",
        "automated_response"
      ]
    }
  ]
}
```

#### GET /api/v1/predictions
List ML predictions for drift events.

#### GET /api/v1/models/{id}/performance
Get detailed performance metrics for a model.

**Response (200):**
```json
{
  "model_id": 1,
  "evaluation_date": "2024-01-15",
  "training_data_size": 15000,
  "accuracy": 0.87,
  "precision_macro": 0.85,
  "recall_macro": 0.81,
  "f1_score_macro": 0.83,
  "confusion_matrix": {
    "emergency_fix": {"emergency_fix": 1250, "manual_troubleshooting": 85, ...},
    ...
  },
  "feature_importance": {
    "temporal_pattern_score": 0.23,
    "change_complexity": 0.18,
    "incident_correlation": 0.17,
    ...
  }
}
```

### IaC Repositories

#### GET /api/v1/iac-repositories
List IaC repositories for organization environments.

#### POST /api/v1/iac-repositories
Configure new IaC repository connection.

**Request Body:**
```json
{
  "environment_id": 1,
  "name": "Infrastructure Repository",
  "repository_url": "https://github.com/acme-corp/infrastructure",
  "branch": "main",
  "tool": "terraform",
  "credentials": {
    "type": "github_token",
    "token": "ghp_..."  // Encrypted in transit
  }
}
```

#### GET /api/v1/iac-repositories/{id}/sync
Trigger manual sync of IaC state.

#### GET /api/v1/iac-resources
List IaC resources across repositories.

**Query Parameters:**
- `repository_id` (optional)
- `resource_type` (optional): aws_instance|kubernetes_deployment|etc

### Analytics & Metrics

#### GET /api/v1/analytics/drifts/summary
Get drift summary metrics for dashboard.

**Query Parameters:**
- `environment_id` (optional)
- `date_from` (optional): YYYY-MM-DD
- `date_to` (optional): YYYY-MM-DD

**Response (200):**
```json
{
  "period": {
    "from": "2024-01-01",
    "to": "2024-01-15"
  },
  "metrics": {
    "total_drifts": 2341,
    "resolved_drifts": 2189,
    "avg_resolution_time_hours": 4.2,
    "severity_distribution": {
      "low": 1456,
      "medium": 623,
      "high": 207,
      "critical": 55
    },
    "cause_categories": {
      "emergency_fix": 45,
      "manual_troubleshooting": 892,
      "security_response": 156,
      "configuration_error": 1248
    },
    "recommendation_adoption": 0.78,
    "detection_accuracy": 0.96
  },
  "trends": {
    "daily_drifts": [
      {"date": "2024-01-15", "count": 23},
      {"date": "2024-01-14", "count": 18}
    ]
  }
}
```

#### GET /api/v1/analytics/models/performance
Get ML model performance analytics.

### Notifications

#### GET /api/v1/notifications
List notifications for current user.

#### PUT /api/v1/notifications/{id}/read
Mark notification as read.

#### POST /api/v1/notification-channels
Configure notification channel.

**Request Body:**
```json
{
  "name": "Engineering Slack",
  "channel_type": "slack",
  "configuration": {
    "webhook_url": "https://hooks.slack.com/services/...",
    "channel": "#drift-alerts",
    "username": "DriftGuard"
  }
}
```

### Gemini AI Integration

#### POST /api/v1/ai/analyze-drift
Send drift context to Gemini AI for enhanced analysis.

**Request Body:**
```json
{
  "drift_event_id": 12345,
  "additional_context": "User reported performance issues with the web service",
  "question": "What could be the potential security implications of this drift?"
}
```

**Response (200):**
```json
{
  "analysis": {
    "summary": "The instance type upgrade from t3.medium to t3.large appears to be a performance optimization made during troubleshooting. While there are cost implications, the security posture remains unchanged.",
    "recommendations": [
      {
        "action": "document_change",
        "rationale": "Document the performance requirements that necessitated this change"
      }
    ],
    "risk_assessment": {
      "security": "low",
      "compliance": "none",
      "operational": "medium"
    },
    "confidence": 0.92
  },
  "processed_at": "2024-01-15T14:30:25Z"
}
```

## Error Handling

### Standard Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "environment_id",
      "reason": "Environment not found or inaccessible"
    },
    "request_id": "req_123456789"
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Invalid request parameters (400)
- `UNAUTHORIZED`: Authentication required (401)
- `FORBIDDEN`: Insufficient permissions (403)
- `NOT_FOUND`: Resource not found (404)
- `CONFLICT`: Resource conflict (409)
- `RATE_LIMITED`: Too many requests (429)
- `INTERNAL_ERROR`: Server error (500)

## Rate Limiting

### Limits by Endpoint Type
- **Read Operations** (GET): 1000 requests/minute
- **Write Operations** (POST/PUT/PATCH): 100 requests/minute
- **Bulk Operations**: 10 requests/minute
- **AI Analysis**: 50 requests/minute per user

### Rate Limit Headers
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
X-RateLimit-Retry-After: 60
```

## Versioning

### API Versioning Strategy
- **URL Path Versioning**: `/api/v1/` prefix
- **Backward Compatibility**: New features add fields, never remove
- **Deprecation Notices**: Advance warning for breaking changes
- **Sunset Periods**: 6 months for deprecated endpoints

## Pagination

### Cursor-Based Pagination
- **Cursor Parameter**: Opaque token encoding position
- **Consistent Ordering**: Required for stable pagination
- **Page Size Limits**: Maximum 100 items per page
- **Metadata**: `has_next`, `has_previous`, `estimated_total`

### Example Paginated Response
```json
{
  "data": [...],
  "pagination": {
    "has_next": true,
    "has_previous": false,
    "next_cursor": "eyJvcmRlciI6ImRhdGUiLCJ2YWx1ZSI6IjIwMjQtMDEtMTVU...=",
    "estimated_total": 2341
  }
}
```

## Request ID & Tracing

### Request Tracking
- **X-Request-ID**: Unique identifier for request tracing
- **X-Correlation-ID**: Client-provided correlation identifier
- **Logging**: All API calls logged with request ID
- **Debug Headers**: Include in error responses for troubleshooting

## Content Types

### Supported Content Types
- **application/json**: Primary content type for all requests/responses
- **Accept Header**: `application/json` required
- **Content-Type Header**: `application/json` for request bodies

### JSON Schema Validation
- **Request Validation**: All POST/PUT requests validated against schemas
- **Response Schemas**: Documented for all endpoints
- **Version Compatibility**: Schemas versioned with API

This API specification provides a comprehensive interface for the DriftGuard MVP, supporting all core functionality while enabling future enhancements and integrations.
