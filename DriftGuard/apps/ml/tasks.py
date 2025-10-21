import random
from django.utils import timezone
from celery import shared_task
from .models import DriftCauseAnalysis, MLPrediction
from apps.drifts.models import DriftEvent
from apps.recommendations.models import Recommendation


@shared_task(bind=True)
def analyze_drift_task(self, drift_id, context_data=None):
    """
    Synchronous task for drift analysis (simulates AI/ML pipeline)
    """

    try:
        # Get drift event
        drift = DriftEvent.objects.select_related('environment', 'iac_resource').get(id=drift_id)
        context_data = context_data or {}

        # Simulate AI analysis (in real implementation, this would call ML models)
        cause_analysis = simulate_cause_analysis(drift, context_data)
        recommendations = simulate_recommendations(drift, cause_analysis)

        # Create drift cause analysis
        DriftCauseAnalysis.objects.create(
            drift_event=drift,
            cause_category=cause_analysis['cause_category'],
            confidence_score=cause_analysis['confidence_score'],
            contributing_factors=cause_analysis['contributing_factors'],
            temporal_context=context_data,
            analyzed_by='ml_model',
            natural_language_explanation=cause_analysis['explanation']
        )

        # Update drift with analysis results
        severity_mapping = {
            'emergency_fix': {'security': 0.3, 'performance': 0.7, 'cost': 0.4, 'compliance': 0.2},
            'manual_troubleshooting': {'security': 0.4, 'performance': 0.6, 'cost': 0.3, 'compliance': 0.3},
            'security_response': {'security': 0.9, 'performance': 0.2, 'cost': 0.3, 'compliance': 0.8},
            'configuration_error': {'security': 0.2, 'performance': 0.3, 'cost': 0.2, 'compliance': 0.4},
            'automated_response': {'security': 0.1, 'performance': 0.2, 'cost': 0.1, 'compliance': 0.1},
        }

        drift.severity_score = max(severity_mapping[cause_analysis['cause_category']].values())
        drift.confidence_score = cause_analysis['confidence_score']
        drift.save()

        # Create recommendations
        created_recommendations = []
        for rec_data in recommendations:
            rec = Recommendation.objects.create(
                drift_event=drift,
                recommendation_type=rec_data['type'],
                priority=rec_data['priority'],
                confidence_score=rec_data['confidence'],
                title=rec_data['title'],
                rationale=rec_data['rationale'],
                implementation_steps=rec_data['steps'],
                recommended_by='ml_model'
            )
            created_recommendations.append(rec)

        return {
            'cause_category': cause_analysis['cause_category'],
            'confidence_score': cause_analysis['confidence_score'],
            'severity_score': drift.severity_score,
            'recommendations_created': len(created_recommendations),
            'explanation': cause_analysis['explanation']
        }

    except Exception as e:
        # Update drift with error status
        try:
            drift = DriftEvent.objects.get(id=drift_id)
            drift.confidence_score = 0.0
            drift.save()
        except:
            pass
        raise e


def simulate_cause_analysis(drift, context_data):
    """
    Simulate AI analysis for demonstration purposes
    In production, this would use trained ML models
    """

    # Simple rule-based cause classification (would be ML model in production)
    cause_categories = [
        ('emergency_fix', 0.82, "Emergency manual change made during incident response"),
        ('manual_troubleshooting', 0.75, "Debugging changes made during issue investigation"),
        ('security_response', 0.90, "Security hardening in response to threat detection"),
        ('configuration_error', 0.68, "Mistake in IaC or manual configuration"),
        ('automated_response', 0.85, "Changes made by automated tools or scripts"),
    ]

    # Select cause based on drift characteristics
    selected_cause = random.choice(cause_categories)

    return {
        'cause_category': selected_cause[0],
        'confidence_score': selected_cause[1],
        'contributing_factors': [
            {
                'factor': 'temporal_pattern',
                'evidence': f'Drift detected outside normal maintenance window',
                'confidence': 0.8
            },
            {
                'factor': 'change_complexity',
                'evidence': f'Modified {len(drift.changes.all())} properties',
                'confidence': 0.7
            }
        ],
        'explanation': selected_cause[2]
    }


def simulate_recommendations(drift, cause_analysis):
    """
    Generate recommendations based on cause analysis
    """

    recommendations = []

    cause = cause_analysis['cause_category']

    if cause == 'emergency_fix':
        recommendations.append({
            'type': 'codify_iac',
            'priority': 'high',
            'confidence': 0.85,
            'title': 'Codify Emergency Changes',
            'rationale': 'Emergency changes should be properly documented in IaC for traceability',
            'steps': [
                'Update Terraform configuration with the current state',
                'Create pull request with detailed change documentation',
                'Apply changes through CI/CD pipeline'
            ]
        })

    elif cause == 'manual_troubleshooting':
        recommendations.append({
            'type': 'codify_iac',
            'priority': 'medium',
            'confidence': 0.75,
            'title': 'Document Troubleshooting Changes',
            'rationale': 'Capture lessons learned from troubleshooting in IaC',
            'steps': [
                'Review and validate the current configuration',
                'Update IaC with approved changes',
                'Add comments explaining the troubleshooting context'
            ]
        })

    elif cause == 'security_response':
        recommendations.append({
            'type': 'accept_exception',
            'priority': 'critical',
            'confidence': 0.95,
            'title': 'Security Exception Review Required',
            'rationale': 'Security-related changes require CISO review and approval',
            'steps': [
                'Submit security exception request',
                'Schedule CISO review meeting',
                'Document security justification'
            ]
        })

    elif cause == 'configuration_error':
        recommendations.append({
            'type': 'auto_revert',
            'priority': 'high',
            'confidence': 0.80,
            'title': 'Revert Configuration Error',
            'rationale': 'Configuration mistakes should be corrected immediately',
            'steps': [
                'Validate IaC is correct',
                'Apply IaC to revert to intended state',
                'Verify system stability after reversion'
            ]
        })

    # Always provide at least one recommendation
    if not recommendations:
        recommendations.append({
            'type': 'manual_review',
            'priority': 'medium',
            'confidence': 0.60,
            'title': 'Manual Review Required',
            'rationale': 'This drift requires human review to determine appropriate action',
            'steps': [
                'Review drift details and context',
                'Consult with relevant teams',
                'Determine appropriate remediation approach'
            ]
        })

    return recommendations
