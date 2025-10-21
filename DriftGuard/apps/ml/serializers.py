from rest_framework import serializers

from .models import MLModel, MLPrediction, DriftCauseAnalysis, MLPerformanceMetric


class MLModelSerializer(serializers.ModelSerializer):
    """Serializer for MLModel"""

    class Meta:
        model = MLModel
        fields = [
            'id', 'name', 'version', 'model_type', 'framework', 'artifact_path',
            'features', 'target_classes', 'metrics', 'accuracy', 'training_data_size',
            'is_active', 'trained_at', 'deployed_at', 'hyperparameters',
            'feature_importance', 'cross_validation_scores', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MLPredictionSerializer(serializers.ModelSerializer):
    """Serializer for MLPrediction"""

    drift_event_id = serializers.CharField(
        source='drift_event.id',
        read_only=True
    )
    ml_model_name = serializers.CharField(
        source='ml_model.name',
        read_only=True
    )

    class Meta:
        model = MLPrediction
        fields = [
            'id', 'drift_event', 'drift_event_id', 'ml_model', 'ml_model_name',
            'prediction_result', 'predicted_class', 'confidence_score',
            'prediction_metadata', 'processing_time', 'predicted_at'
        ]
        read_only_fields = ['id', 'predicted_at', 'drift_event_id', 'ml_model_name']


class DriftCauseAnalysisSerializer(serializers.ModelSerializer):
    """Serializer for DriftCauseAnalysis"""

    drift_event_id = serializers.CharField(
        source='drift_event.id',
        read_only=True
    )

    class Meta:
        model = DriftCauseAnalysis
        fields = [
            'id', 'drift_event', 'drift_event_id', 'cause_category', 'confidence_score',
            'contributing_factors', 'temporal_context', 'user_attribution',
            'ai_analysis_result', 'natural_language_explanation', 'analyzed_by',
            'analyzed_at'
        ]
        read_only_fields = ['id', 'analyzed_at', 'drift_event_id']


class MLPerformanceMetricSerializer(serializers.ModelSerializer):
    """Serializer for MLPerformanceMetric"""

    ml_model_name = serializers.CharField(
        source='ml_model.name',
        read_only=True
    )

    class Meta:
        model = MLPerformanceMetric
        fields = [
            'id', 'ml_model', 'ml_model_name', 'evaluation_date', 'training_data_size',
            'training_time', 'accuracy', 'precision_macro', 'recall_macro', 'f1_score_macro',
            'confusion_matrix', 'feature_importance', 'cross_validation_scores',
            'model_drift_score', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'ml_model_name']
