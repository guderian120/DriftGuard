from rest_framework import serializers

from .models import Recommendation, RecommendationTemplate, RecommendationFeedback


class RecommendationSerializer(serializers.ModelSerializer):
    """Serializer for Recommendation"""

    drift_event_id = serializers.CharField(
        source='drift_event.id',
        read_only=True
    )
    implementation_status = serializers.SerializerMethodField(read_only=True)
    urgency_score = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Recommendation
        fields = [
            'id', 'drift_event', 'drift_event_id', 'recommendation_type', 'priority',
            'confidence_score', 'title', 'rationale', 'implementation_steps', 'risk_assessment',
            'estimated_effort', 'effort_quantity', 'recommended_by', 'recommended_by_details',
            'created_at', 'expires_at', 'implemented_at', 'implementation_result',
            'is_implemented', 'is_expired', 'implementation_status', 'urgency_score'
        ]
        read_only_fields = [
            'id', 'created_at', 'implementation_status', 'urgency_score', 'drift_event_id'
        ]

    def get_implementation_status(self, obj):
        return obj.implementation_status

    def get_urgency_score(self, obj):
        return obj.urgency_score


class RecommendationTemplateSerializer(serializers.ModelSerializer):
    """Serializer for RecommendationTemplate"""

    class Meta:
        model = RecommendationTemplate
        fields = [
            'id', 'name', 'recommendation_type', 'title_template', 'rationale_template',
            'steps_template', 'default_priority', 'default_effort', 'default_effort_quantity',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class RecommendationFeedbackSerializer(serializers.ModelSerializer):
    """Serializer for RecommendationFeedback"""

    recommendation_title = serializers.CharField(
        source='recommendation.title',
        read_only=True
    )

    class Meta:
        model = RecommendationFeedback
        fields = [
            'id', 'recommendation', 'recommendation_title', 'feedback_type', 'rating',
            'comments', 'user_id', 'user_role', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'recommendation_title']
