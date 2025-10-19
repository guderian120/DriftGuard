# DriftGuard MVP ML Pipeline Design

## Overview
The DriftGuard ML pipeline provides AI-powered root cause analysis, severity scoring, and intelligent recommendations for infrastructure drift events. The pipeline transforms raw drift data into actionable insights using a combination of feature engineering, ensemble classification models, and contextual reasoning.

## Pipeline Architecture

### Core Components
1. **Data Ingestion & Preparation**: Collect and normalize drift event data
2. **Feature Engineering**: Extract and transform features for model input
3. **Model Training & Validation**: Train and evaluate classification models
4. **Inference Pipeline**: Real-time prediction and analysis
5. **Feedback Loop**: Collect user feedback for continuous improvement

### Data Sources & Inputs

#### Primary Data Sources
- **Drift Events**: Core drift detection data (changes, timing, resource types)
- **IaC State**: Terraform/CloudFormation/K8s resource declarations
- **Cloud Audit Logs**: AWS CloudTrail, GCP Cloud Logging, Azure Monitor logs
- **Operational Context**: Incident tickets, Git commits, monitoring alerts
- **Temporal Patterns**: Time-based correlations and sequences

#### Feature Categories

##### Structural Features (30% of feature importance)
- `resource_type`: Normalized resource type (aws_instance, k8s_deployment)
- `drift_magnitude`: Number of property changes
- `change_complexity`: Scale of changes (simple value vs. structural)
- `resource_age`: Time since resource creation
- `drift_frequency`: How often this resource drifts

##### Temporal Features (25% of feature importance)
- `detection_hour`: Hour of day (0-23)
- `detection_weekday`: Day of week (0-6)
- `time_since_last_drift`: Hours since previous drift for this resource
- `incident_window`: Time window containing related operational events
- `maintenance_schedule_overlap`: Overlap with known maintenance windows

##### Contextual Features (20% of feature importance)
- `git_commit_correlation`: Recent commits affecting this resource
- `incident_ticket_proximity`: Related incident tickets within time window
- `monitoring_alert_count`: Number of related alerts in time window
- `deployment_event_proximity`: Recent deployments affecting the resource
- `user_behavior_pattern`: Patterns in who/what caused similar drifts

##### Operational Impact Features (15% of feature importance)
- `security_surface_change`: Changes affecting security posture
- `cost_impact_estimate`: Estimated cost implications
- `performance_impact`: Changes affecting performance characteristics
- `compliance_relevance`: Changes with compliance implications
- `dependency_affected`: Downstream services impacted

##### External Integration Features (10% of feature importance)
- `kubernetes_namespace`: K8s namespace context
- `aws_account_type`: Production vs. development account characteristics
- `terraform_module`: IaC module and versioning context
- `ci_cd_integration`: Relationship to deployment pipelines

## ML Models & Algorithms

### 1. Drift Cause Classification Model
**Purpose**: Classify the root cause of infrastructure drift

#### Target Classes
- `emergency_fix`: Urgent manual changes during incidents
- `manual_troubleshooting`: Debug changes made during issue resolution
- `security_response`: Changes in response to security threats/events
- `configuration_error`: Mistakes in IaC or manual configuration
- `automated_response`: Changes made by automated systems/tooling
- `intentional_override`: Planned deviations from IaC standards

#### Algorithm Selection
```python
# Primary Model: XGBoost Classifier with hyperparameter tuning
from xgboost import XGBClassifier
from sklearn.model_selection import GridSearchCV

model_config = {
    'objective': 'multi:softprob',
    'num_class': 6,
    'max_depth': 6,
    'learning_rate': 0.1,
    'n_estimators': 200,
    'subsample': 0.8,
    'colsample_bytree': 0.8,
    'scale_pos_weight': class_weights,  # Handle imbalanced classes
    'eval_metric': ['mlogloss', 'merror']
}

# Ensemble approach for robustness
from sklearn.ensemble import VotingClassifier
ensemble = VotingClassifier([
    ('xgb', XGBClassifier(**model_config)),
    ('rf', RandomForestClassifier(n_estimators=100)),
    ('lgb', LGBMClassifier(objective='multiclass'))
], voting='soft')
```

#### Training Strategy
- **Train/Validation/Test Split**: 70%/15%/15%
- **Cross-Validation**: 5-fold stratified CV
- **Class Balancing**: SMOTE for minority classes
- **Early Stopping**: Monitor validation loss
- **Feature Selection**: Recursive feature elimination

### 2. Severity Prediction Model
**Purpose**: Predict the operational impact severity of drift

#### Regression Target
- Continuous score from 0.0 (no impact) to 1.0 (critical impact)
- Multi-dimensional assessment: security, performance, cost, compliance

#### Algorithm Approach
```python
# Multi-output regression for different impact dimensions
from sklearn.multioutput import MultiOutputRegressor
from sklearn.ensemble import GradientBoostingRegressor

severity_model = MultiOutputRegressor(
    GradientBoostingRegressor(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        loss='huber'  # Robust to outliers
    )
)
```

### 3. Recommendation Engine
**Purpose**: Generate intelligent remediation recommendations

#### Recommendation Types
- `auto_revert`: Automatic reversion to IaC state
- `codify_iac`: Update IaC to match current state
- `escalate_review`: Require human review and approval
- `accept_exception`: Accept deviation with documentation
- `manual_review`: Investigate further before action

#### Logic-Based + ML Approach
```python
def generate_recommendations(drift_analysis, ml_predictions, context):
    """
    Rule-based recommendation generation with ML enhancements
    """
    recommendations = []

    # High-confidence classifications get automated recommendations
    if ml_predictions['confidence'] > 0.8:
        if ml_predictions['cause'] == 'configuration_error':
            recommendations.append({
                'type': 'auto_revert',
                'confidence': 0.9,
                'rationale': 'High-confidence classification of configuration error'
            })

        elif ml_predictions['cause'] == 'emergency_fix':
            recommendations.append({
                'type': 'codify_iac',
                'confidence': 0.85,
                'rationale': 'Emergency changes should be codified'
            })

    # Context-aware recommendations
    if context.get('security_incident'):
        recommendations.append({
            'type': 'escalate_review',
            'priority': 'high',
            'rationale': 'Security-related context requires review'
        })

    return recommendations
```

## Feature Engineering Pipeline

### Preprocessing Steps

#### 1. Data Normalization
```python
from sklearn.preprocessing import StandardScaler, LabelEncoder

# Normalize numerical features
numerical_features = ['drift_magnitude', 'resource_age', 'time_since_last_drift']
scaler = StandardScaler()
X_numerical = scaler.fit_transform(X[numerical_features])

# Encode categorical features
categorical_features = ['resource_type', 'cloud_provider']
encoders = {}
for feature in categorical_features:
    encoders[feature] = LabelEncoder()
    X[f'{feature}_encoded'] = encoders[feature].fit_transform(X[feature])

# Handle timestamps
X['hour_sin'] = np.sin(2 * np.pi * X['detection_hour']/24)
X['hour_cos'] = np.cos(2 * np.pi * X['detection_hour']/24)
X['weekday_sin'] = np.sin(2 * np.pi * X['detection_weekday']/7)
X['weekday_cos'] = np.cos(2 * np.pi * X['detection_weekday']/7)
```

#### 2. Feature Creation & Enrichment
```python
def create_temporal_features(drift_events_df, context_df):
    """
    Create time-based features from drift patterns and context
    """

    # Rolling statistics for drift frequency
    drift_events_df['drift_count_24h'] = (
        drift_events_df.groupby('resource_id')['detected_at']
        .rolling('24H')
        .count()
        .reset_index(drop=True)
    )

    # Time since last maintenance window
    drift_events_df['hours_since_maintenance'] = (
        drift_events_df['detected_at'] - drift_events_df['last_maintenance_end']
    ).dt.total_seconds() / 3600

    # Incident correlation scoring
    drift_events_df['incident_correlation_score'] = (
        drift_events_df.apply(
            lambda row: calculate_incident_proximity(row, context_df),
            axis=1
        )
    )

    return drift_events_df

def calculate_incident_proximity(drift_row, incidents_df):
    """
    Calculate how closely incidents correlate with drift timing
    """
    time_window = pd.Timedelta(hours=1)  # 1-hour correlation window
    nearby_incidents = incidents_df[
        (incidents_df['timestamp'] >= drift_row['detected_at'] - time_window) &
        (incidents_df['timestamp'] <= drift_row['detected_at'] + time_window)
    ]

    if len(nearby_incidents) == 0:
        return 0.0

    # Weight by recency and severity
    scores = nearby_incidents.apply(
        lambda incident: calculate_correlation_weight(drift_row, incident),
        axis=1
    )

    return min(scores.mean(), 1.0)  # Cap at 1.0
```

#### 3. Text Feature Processing
```python
from sklearn.feature_extraction.text import TfidfVectorizer
from transformers import AutoTokenizer, AutoModel

def process_textual_context(commit_messages, incident_descriptions):
    """
    Process textual data from Git commits and incident descriptions
    """

    # TF-IDF for keyword extraction
    tfidf = TfidfVectorizer(
        max_features=100,
        stop_words='english',
        ngram_range=(1, 2)
    )

    # Combine commit messages as document
    commit_corpus = [' '.join(commits) for commits in commit_messages]
    commit_features = tfidf.fit_transform(commit_corpus)

    # Incident description processing
    incident_features = tfidf.fit_transform(incident_descriptions)

    return commit_features, incident_features, tfidf

def extract_commit_intent_features(commit_messages):
    """
    Extract intent-based features from commit messages using NLP
    """
    intent_keywords = {
        'emergency': ['urgent', 'critical', 'emergency', 'hotfix'],
        'security': ['security', 'vulnerability', 'patch', 'cve'],
        'performance': ['performance', 'optimize', 'slow', 'bottleneck'],
        'debug': ['debug', 'fix', 'bug', 'issue']
    }

    features = {}
    for intent, keywords in intent_keywords.items():
        features[f'commit_{intent}_mentions'] = sum(
            1 for msg in commit_messages
            for keyword in keywords
            if keyword.lower() in msg.lower()
        )

    return features
```

## Model Training & Validation

### Training Pipeline
```python
from sklearn.pipeline import Pipeline
from sklearn.model_selection import TimeSeriesSplit
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline

# Complete ML pipeline
ml_pipeline = ImbPipeline([
    ('feature_engineering', FeatureEngineeringTransformer()),
    ('smote', SMOTE(random_state=42)),
    ('classifier', XGBClassifier(**model_config))
])

# Time-series cross-validation for temporal data
tscv = TimeSeriesSplit(n_splits=5)

# Train with early stopping
eval_set = [(X_train, y_train), (X_val, y_val)]
ml_pipeline.fit(
    X_train, y_train,
    classifier__eval_set=eval_set,
    classifier__early_stopping_rounds=20,
    classifier__verbose=True
)
```

### Model Evaluation Metrics
```python
from sklearn.metrics import classification_report, confusion_matrix
import shap

# Classification metrics
print(classification_report(y_test, y_pred))

# Confusion matrix analysis
cm = confusion_matrix(y_test, y_pred)
print("Confusion Matrix:")
print(cm)

# SHAP values for feature importance
explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_test)

# Feature importance visualization
shap.summary_plot(shap_values, X_test, feature_names=feature_names)
```

### Model Validation Strategy

#### Cross-Validation Approach
- **Time Series CV**: Respects temporal ordering of drift events
- **Stratified CV**: Maintains class distribution across folds
- **Grouped CV**: Prevents data leakage from same resource across folds

#### Performance Benchmarks
```python
target_metrics = {
    'accuracy': 0.85,      # Overall accuracy target
    'macro_f1': 0.82,      # Balanced F1 across classes
    'min_recall': 0.75,    # Minimum recall for any class
    'inference_time': 0.5   # Max 500ms per prediction
}
```

## Inference Pipeline

### Real-time Prediction
```python
class DriftAnalysisPipeline:
    """
    Production inference pipeline for drift analysis
    """

    def __init__(self, model_path, scaler_path, encoders_path):
        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)
        self.encoders = joblib.load(encoders_path)

    def analyze_drift(self, drift_event, context_data):
        """
        Analyze a single drift event and return predictions
        """

        # Feature engineering
        features = self._engineer_features(drift_event, context_data)

        # Model prediction
        prediction = self.model.predict(features.reshape(1, -1))
        probabilities = self.model.predict_proba(features.reshape(1, -1))

        # Confidence score (highest probability)
        confidence = np.max(probabilities)

        return {
            'cause_category': self._decode_prediction(prediction[0]),
            'confidence_score': confidence,
            'probabilities': dict(zip(self.model.classes_, probabilities[0])),
            'feature_contributions': self._explain_prediction(features)
        }

    def _engineer_features(self, drift_event, context_data):
        """Transform raw drift data into model features"""
        # Implementation of feature engineering logic
        pass

    def _explain_prediction(self, features):
        """Generate feature contribution explanations"""
        # SHAP or LIME explanations
        pass
```

### Batch Processing for Analytics
```python
def process_batch_predictions(drift_events_batch):
    """
    Batch process multiple drift events for efficiency
    """

    # Parallel feature engineering
    features_list = Parallel(n_jobs=-1)(
        delayed(engineer_features)(event)
        for event in drift_events_batch
    )

    # Batch prediction
    features_array = np.vstack(features_list)
    predictions = model.predict(features_array)
    probabilities = model.predict_proba(features_array)

    return predictions, probabilities
```

## Model Monitoring & Maintenance

### Performance Monitoring
```python
class ModelMonitor:
    """
    Monitor model performance and data drift in production
    """

    def __init__(self, model, reference_data):
        self.model = model
        self.reference_distribution = self._calculate_distribution(reference_data)

    def check_data_drift(self, new_data):
        """
        Detect if incoming data distribution has changed
        """
        new_distribution = self._calculate_distribution(new_data)

        # Kolmogorov-Smirnov test for distribution differences
        drift_detected = False
        for feature in self.reference_distribution.keys():
            ks_stat, p_value = ks_2samp(
                self.reference_distribution[feature],
                new_distribution[feature]
            )
            if p_value < 0.05:  # Significant difference
                drift_detected = True
                logger.warning(f"Data drift detected for feature: {feature}")

        return drift_detected

    def monitor_accuracy(self, predictions, actual_labels):
        """
        Track model accuracy on ground truth labels
        """
        accuracy = accuracy_score(actual_labels, predictions)
        self.log_metric('model_accuracy', accuracy)

        if accuracy < self.accuracy_threshold:
            self.alert_stakeholders(
                f"Model accuracy dropped to {accuracy:.3f}"
            )
```

### Model Retraining Strategy

#### Trigger Conditions
- **Performance Degradation**: Accuracy drops below threshold
- **Data Drift Detection**: Statistical distribution changes
- **New Feature Availability**: Additional context data sources added
- **Scheduled Retraining**: Weekly automatic retraining

#### Retraining Pipeline
```python
def retrain_model(new_data, existing_model):
    """
    Automated model retraining with validation
    """

    # Feature engineering with new data
    X_new, y_new = prepare_training_data(new_data)

    # Incremental learning or full retrain
    if len(X_new) < 1000:  # Not enough new data
        logger.info("Insufficient new data for retraining")
        return existing_model

    # Train new model
    new_model = train_model(X_new, y_new)

    # Validation against holdout set
    validation_score = validate_model(new_model, holdout_data)

    if validation_score > existing_model.score(holdout_data):
        logger.info("New model outperforms existing model")
        return new_model
    else:
        logger.info("Keeping existing model")
        return existing_model
```

## Integration Points

### Django Application Integration
```python
# views.py - API endpoint for drift analysis
class DriftAnalysisView(APIView):
    """
    REST API endpoint for triggering drift analysis
    """

    def post(self, request, drift_id):
        drift = get_object_or_404(DriftEvent, id=drift_id)

        # Asynchronous processing
        analysis_job = ml_pipeline.analyze_drift.delay(
            drift_id=drift.id,
            context_data=request.data.get('context', {})
        )

        response_data = {
            'job_id': analysis_job.id,
            'status': 'queued',
            'estimated_completion': timezone.now() + timedelta(seconds=30)
        }

        return Response(response_data, status=status.HTTP_202_ACCEPTED)
```

### Caching Strategy
```python
# Cache predictions for frequently analyzed drifts
from django.core.cache import cache

def get_cached_analysis(drift_id):
    """
    Retrieve cached analysis results to reduce compute load
    """
    cache_key = f'drift_analysis:{drift_id}'
    cached = cache.get(cache_key)

    if cached and cached['timestamp'] > timezone.now() - timedelta(hours=1):
        return cached['results']

    # Recalculate if cache miss or stale
    results = perform_analysis(drift_id)
    cache.set(cache_key, {
        'results': results,
        'timestamp': timezone.now()
    }, timeout=3600)  # 1 hour cache

    return results
```

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- Set up ML infrastructure and data collection
- Basic feature engineering pipeline
- Initial model training with synthetic data

### Phase 2: Core Models (Weeks 3-6)
- Implement drift cause classification model
- Develop severity scoring model
- Basic recommendation engine logic

### Phase 3: Advanced Features (Weeks 7-8)
- Text analysis for commit messages and incidents
- Contextual correlation features
- Multi-model ensemble approaches

### Phase 4: Production (Weeks 9-10)
- Model validation and benchmarking
- Inference pipeline optimization
- Monitoring and alerting setup

### Phase 5: Continuous Improvement (Weeks 11-12)
- A/B testing framework
- Automated retraining pipelines
- Performance monitoring dashboards

This ML pipeline design provides the foundation for DriftGuard's intelligent drift analysis capabilities, enabling automated root cause identification and contextual recommendations that transform reactive infrastructure management into proactive, AI-powered operations.
