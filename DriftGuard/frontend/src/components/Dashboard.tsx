import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Cloud as CloudIcon,
  Warning as WarningIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { Environment } from '../types/api';
import { environmentsService } from '../api/environmentsService';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" mb={1}>
        <Box
          sx={{
            backgroundColor: color,
            borderRadius: '50%',
            p: 1,
            mr: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Typography variant="h6" component="div">
          {title}
        </Typography>
      </Box>
      <Typography variant="h4" component="div" fontWeight="bold">
        {value}
      </Typography>
    </CardContent>
  </Card>
);

const Dashboard: React.FC = () => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const envs = await environmentsService.getEnvironments();
        setEnvironments(envs);
      } catch (err: any) {
        setError('Failed to load dashboard data');
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const totalEnvironments = environments.length;
  const totalDrifts = environments.reduce((sum, env) => sum + env.drift_count, 0);
  const readyEnvironments = environments.filter(env => env.is_ready_for_scan).length;
  const activeEnvironments = environments.filter(env => env.is_active).length;

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
        Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flex: '1 1 250px', maxWidth: '300px' }}>
          <StatCard
            title="Environments"
            value={totalEnvironments}
            icon={<CloudIcon sx={{ color: 'white' }} />}
            color="#1976d2"
          />
        </Box>
        <Box sx={{ flex: '1 1 250px', maxWidth: '300px' }}>
          <StatCard
            title="Active Drifts"
            value={totalDrifts}
            icon={<WarningIcon sx={{ color: 'white' }} />}
            color="#f44336"
          />
        </Box>
        <Box sx={{ flex: '1 1 250px', maxWidth: '300px' }}>
          <StatCard
            title="Ready for Scan"
            value={readyEnvironments}
            icon={<TrendingUpIcon sx={{ color: 'white' }} />}
            color="#4caf50"
          />
        </Box>
        <Box sx={{ flex: '1 1 250px', maxWidth: '300px' }}>
          <StatCard
            title="Active Environments"
            value={activeEnvironments}
            icon={<CloudIcon sx={{ color: 'white' }} />}
            color="#ff9800"
          />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        <Box sx={{ flex: '1 1 500px', minWidth: '300px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                Recent Activity
              </Typography>
              <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  Activity chart will be implemented here
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  • Scan environments for drift
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • View drift reports
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Check recommendations
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Configure alerts
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {environments.length === 0 && !loading && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            Welcome to DriftGuard!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
            Start by setting up your first environment to monitor infrastructure drift.
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default Dashboard;
