import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Warning as DriftIcon,
  Analytics as AnalyticsIcon,
  CheckCircle as ResolvedIcon,
  TrendingUp as TrendingUpIcon,
  Business as BusinessIcon,
  Cloud as CloudIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { DriftEvent } from '../types/api';
import { driftsService } from '../api/driftsService';
import { organizationsService } from '../api/organizationsService';
import { environmentsService } from '../api/environmentsService';

interface DashboardStats {
  totalOrganizations: number;
  totalEnvironments: number;
  totalDrifts: number;
  resolvedDrifts: number;
  unresolvedDrifts: number;
  analyzedDrifts: number;
  recentDrifts: DriftEvent[];
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch data from multiple APIs
      const [drifts, organizations, environments] = await Promise.all([
        driftsService.getDrifts(),
        organizationsService.getOrganizations().catch(() => []),
        environmentsService.getEnvironments().catch(() => []),
      ]);

      // Calculate statistics
      const totalDrifts = drifts.length;
      const resolvedDrifts = drifts.filter(d => d.is_resolved).length;
      const unresolvedDrifts = totalDrifts - resolvedDrifts;
      const analyzedDrifts = drifts.filter(d => d.cause_analysis).length;
      const recentDrifts = drifts.slice(0, 5); // Get first 5 drifts

      setStats({
        totalOrganizations: organizations.length,
        totalEnvironments: environments.length,
        totalDrifts,
        resolvedDrifts,
        unresolvedDrifts,
        analyzedDrifts,
        recentDrifts,
      });
    } catch (err: any) {
      console.error('Dashboard error:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeDrift = async (driftId: number) => {
    try {
      await driftsService.analyzeDrift(driftId);
      await loadDashboardData(); // Refresh data
    } catch (error: any) {
      console.error('Failed to analyze drift:', error);
    }
  };

  const handleResolveDrift = async (driftId: number) => {
    try {
      await driftsService.resolveDrift(driftId, 'dashboard_resolve');
      await loadDashboardData(); // Refresh data
    } catch (error: any) {
      console.error('Failed to resolve drift:', error);
    }
  };

  const getDriftStatusIcon = (drift: DriftEvent) => {
    if (drift.cause_analysis) {
      return <AnalyticsIcon color="primary" />;
    }
    if (drift.is_resolved) {
      return <ResolvedIcon color="success" />;
    }
    return <DriftIcon color="warning" />;
  };

  const getDriftStatusText = (drift: DriftEvent) => {
    if (drift.cause_analysis) {
      return 'Analyzed';
    }
    if (drift.is_resolved) {
      return 'Resolved';
    }
    return 'Unresolved';
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!stats) {
    return (
      <Container>
        <Alert severity="error">Failed to load dashboard data.</Alert>
      </Container>
    );
  }

  const resolutionRate = stats.totalDrifts > 0 ? (stats.resolvedDrifts / stats.totalDrifts) * 100 : 0;
  const analysisRate = stats.totalDrifts > 0 ? (stats.analyzedDrifts / stats.totalDrifts) * 100 : 0;

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor your infrastructure drift detection and AI analysis activities.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadDashboardData}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {/* Overview Cards */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          lg: 'repeat(4, 1fr)'
        },
        gap: 3,
        mb: 4
      }}>
        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <BusinessIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" component="h2">
                Organizations
              </Typography>
            </Box>
            <Typography variant="h4" color="primary">
              {stats.totalOrganizations}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total managed organizations
            </Typography>
          </CardContent>
        </Card>

        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CloudIcon color="secondary" sx={{ mr: 1 }} />
              <Typography variant="h6" component="h2">
                Environments
              </Typography>
            </Box>
            <Typography variant="h4" color="secondary">
              {stats.totalEnvironments}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cloud environments monitored
            </Typography>
          </CardContent>
        </Card>

        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <DriftIcon color="warning" sx={{ mr: 1 }} />
              <Typography variant="h6" component="h2">
                Total Drifts
              </Typography>
            </Box>
            <Typography variant="h4" color={stats.totalDrifts > 10 ? 'error' : 'text.primary'}>
              {stats.totalDrifts}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <LinearProgress
                variant="determinate"
                value={resolutionRate}
                color={resolutionRate > 70 ? 'success' : 'warning'}
                sx={{ height: 6, borderRadius: 3 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {Math.round(resolutionRate)}% resolved
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <AnalyticsIcon color="info" sx={{ mr: 1 }} />
              <Typography variant="h6" component="h2">
                AI Analysis
              </Typography>
            </Box>
            <Typography variant="h4" color="info">
              {stats.analyzedDrifts}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <LinearProgress
                variant="determinate"
                value={analysisRate}
                color={analysisRate > 60 ? 'success' : 'warning'}
                sx={{ height: 6, borderRadius: 3 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {Math.round(analysisRate)}% analyzed
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Recent Drifts and Quick Actions */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
        gap: 3
      }}>
        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <TrendingUpIcon sx={{ mr: 1 }} />
              <Typography variant="h6" component="h2">
                Recent Drift Activity
              </Typography>
            </Box>

            {stats.recentDrifts.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <ResolvedIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No drift events detected
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your infrastructure is in sync!
                </Typography>
              </Box>
            ) : (
              <List>
                {stats.recentDrifts.map((drift) => (
                  <ListItem
                    key={drift.id}
                    divider
                    sx={{
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <ListItemIcon>
                      {getDriftStatusIcon(drift)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">
                            {drift.drift_type} drift in {drift.environment_name}
                          </Typography>
                          <Chip
                            label={getDriftStatusText(drift)}
                            size="small"
                            color={
                              drift.cause_analysis ? 'primary' :
                              drift.is_resolved ? 'success' : 'warning'
                            }
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(drift.detected_at).toLocaleString()}
                            {drift.cause_analysis && (
                              <span> • {drift.cause_analysis.natural_language_explanation}</span>
                            )}
                          </Typography>
                          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                            {!drift.is_resolved && !drift.cause_analysis && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                onClick={() => handleAnalyzeDrift(drift.id)}
                              >
                                Analyze
                              </Button>
                            )}
                            {!drift.is_resolved && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="success"
                                onClick={() => handleResolveDrift(drift.id)}
                              >
                                Resolve
                              </Button>
                            )}
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>

        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<BusinessIcon />}
                fullWidth
                onClick={() => window.open('/organizations', '_self')}
              >
                Manage Organizations
              </Button>
              <Button
                variant="outlined"
                startIcon={<CloudIcon />}
                fullWidth
                onClick={() => window.open('/environments', '_self')}
              >
                View Environments
              </Button>
              <Button
                variant="outlined"
                startIcon={<DriftIcon />}
                fullWidth
                onClick={() => window.open('/drifts', '_self')}
              >
                Browse All Drifts
              </Button>
              <Button
                variant="outlined"
                startIcon={<AnalyticsIcon />}
                fullWidth
                onClick={() => window.open('/recommendations', '_self')}
              >
                View Recommendations
              </Button>
            </Box>

            {stats.unresolvedDrifts > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {stats.unresolvedDrifts} drift{stats.unresolvedDrifts !== 1 ? 's' : ''} need attention
              </Alert>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default Dashboard;
