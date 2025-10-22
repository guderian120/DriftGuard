export interface Environment {
  id: number;
  organization: number;
  organization_name: string;
  name: string;
  slug: string;
  cloud_provider: string;
  cloud_provider_display: string;
  region: string;
  account_id: string;
  tags: string[];
  is_active: boolean;
  is_ready_for_scan: boolean;
  resource_count: number;
  drift_count: number;
  has_credentials: boolean;
  created_at: string;
  updated_at: string;
}

export interface IaCRepository {
  id: number;
  name: string;
  platform: 'github' | 'gitlab' | 'bitbucket';
  repository_url: string;
  repository_owner: string;
  repository_name: string;
  branch: string;
  iac_type: string;
  github_token?: string;
  organization: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface IaCFile {
  id: number;
  repository: number;
  file_path: string;
  file_name: string;
  file_type: string;
  content_hash: string;
  last_modified: string;
  last_scanned: string;
  created_at: string;
  updated_at: string;
}

export interface DriftChange {
  id: number;
  property_path: string;
  declared_value: any;
  actual_value: any;
  change_type: 'added' | 'removed' | 'modified';
  is_security_critical: boolean;
  change_impact: 'low' | 'medium' | 'high';
  value_diff: string;
  created_at: string;
}

export interface DriftCauseAnalysis {
  cause_category: string;
  confidence_score: number;
  contributing_factors: any[];
  temporal_context: any;
  user_attribution: any;
  analyzed_at: string;
  analyzed_by: string;
  natural_language_explanation: string;
}

export interface RecommendationSummary {
  id: number;
  recommendation_type: string;
  priority: string;
  confidence_score: number;
  title: string;
  rationale: string;
  implementation_steps: string[];
  estimated_effort: string;
  recommended_by: string;
  created_at: string;
}

export interface DriftEvent {
  id: number;
  environment: number;
  environment_name: string;
  iac_resource: number;
  iac_resource_id: string;
  drift_type: string;
  actual_state: any;
  declared_state: any;
  detected_at: string;
  resolved_at: string | null;
  resolution_type: string | null;
  resolution_notes: string | null;
  severity_score: number;
  confidence_score: number;
  risk_assessment: string;
  tags: string[];
  metadata: any;
  is_resolved: boolean;
  duration: number | null;
  changes_count: number;
  changes: DriftChange[];
  cause_analysis?: DriftCauseAnalysis | null;
  recommendations: RecommendationSummary[];
  created_at: string;
  updated_at: string;
}

export interface Recommendation {
  id: number;
  environment: number;
  environment_name: string;
  drift_event: number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  implementation_steps: string[];
  estimated_effort: string;
  risk_reduction: number;
  automation_available: boolean;
  cost_impact: string;
  compliance_impact: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface MLAnomaly {
  id: number;
  environment: number;
  environment_name: string;
  resource_id: string;
  anomaly_type: string;
  description: string;
  confidence_score: number;
  severity_level: 'low' | 'medium' | 'high' | 'critical';
  detected_at: string;
  false_positive_probability: number;
  metadata: any;
  is_acknowledged: boolean;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface IacResource {
  id: number;
  environment: number;
  resource_id: string;
  resource_type: string;
  provider: string;
  file_path: string;
  line_number: number;
  name: string;
  attributes: any;
  tags: string[];
  last_scanned: string;
  created_at: string;
  updated_at: string;
}
