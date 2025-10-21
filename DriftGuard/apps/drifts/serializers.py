from rest_framework import serializers

from .models import DriftEvent, DriftChange


class DriftCauseAnalysisSerializer(serializers.Serializer):
    """Serializer for drift cause analysis"""

    cause_category = serializers.CharField()
    confidence_score = serializers.FloatField()
    contributing_factors = serializers.ListField()
    temporal_context = serializers.DictField()
    user_attribution = serializers.DictField()
    analyzed_at = serializers.DateTimeField()
    analyzed_by = serializers.CharField()
    natural_language_explanation = serializers.CharField()


class RecommendationSummarySerializer(serializers.Serializer):
    """Simplified serializer for recommendations in drift context"""

    id = serializers.IntegerField()
    recommendation_type = serializers.CharField()
    priority = serializers.CharField()
    confidence_score = serializers.FloatField()
    title = serializers.CharField()
    rationale = serializers.CharField()
    implementation_steps = serializers.ListField()
    estimated_effort = serializers.CharField()
    recommended_by = serializers.CharField()
    created_at = serializers.DateTimeField()


class DriftChangeSerializer(serializers.ModelSerializer):
    """Serializer for DriftChange model"""

    value_diff = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = DriftChange
        fields = [
            'id', 'property_path', 'declared_value', 'actual_value',
            'change_type', 'is_security_critical', 'change_impact',
            'value_diff', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'value_diff']

    def get_value_diff(self, obj):
        """Get formatted value difference"""
        return obj.get_value_diff()


class DriftEventSerializer(serializers.ModelSerializer):
    """Serializer for DriftEvent model"""

    environment_name = serializers.CharField(
        source='environment.name',
        read_only=True
    )
    iac_resource_id = serializers.CharField(
        source='iac_resource.resource_id',
        read_only=True
    )
    changes_count = serializers.SerializerMethodField(read_only=True)
    changes = DriftChangeSerializer(many=True, read_only=True)
    cause_analysis = serializers.SerializerMethodField(read_only=True)
    recommendations = RecommendationSummarySerializer(many=True, read_only=True)

    class Meta:
        model = DriftEvent
        fields = [
            'id', 'environment', 'environment_name', 'iac_resource', 'iac_resource_id',
            'drift_type', 'actual_state', 'declared_state',
            'detected_at', 'resolved_at', 'resolution_type', 'resolution_notes',
            'severity_score', 'confidence_score', 'risk_assessment', 'tags', 'metadata',
            'is_resolved', 'duration', 'changes_count', 'changes',
            'cause_analysis', 'recommendations',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'is_resolved', 'duration',
            'changes_count', 'iac_resource_id', 'environment_name',
            'cause_analysis', 'recommendations'
        ]

    def get_changes_count(self, obj):
        """Get count of changes in this drift"""
        return obj.changes.count()

    def get_cause_analysis(self, obj):
        """Get cause analysis if available"""
        if hasattr(obj, 'cause_analysis'):
            return DriftCauseAnalysisSerializer(obj.cause_analysis).data
        return None

    def get_recommendations(self, obj):
        """Get recommendations for this drift"""
        recommendations = obj.recommendations.filter(is_active=True)
        return RecommendationSummarySerializer(recommendations, many=True).data
