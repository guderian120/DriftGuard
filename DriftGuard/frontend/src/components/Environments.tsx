import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Cloud as CloudIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as InactiveIcon,
} from '@mui/icons-material';
import { Environment } from '../types/api';
import { environmentsService } from '../api/environmentsService';

const Environments: React.FC = () => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEnvironments = async () => {
      try {
        setLoading(true);
        const envs = await environmentsService.getEnvironments();
        setEnvironments(envs);
      } catch (err: any) {
        setError('Failed to load environments');
        console.error('Environments error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEnvironments();
  }, []);

  const getCloudProviderIcon = (provider: string) => {
    // You can customize these icons based on your cloud providers
    return <CloudIcon />;
  };

  const getStatusIcon = (env: Environment) => {
    if (env.is_active && env.is_ready_for_scan) {
      return <CheckCircleIcon color="success" />;
    } else if (env.is_active) {
      return <WarningIcon color="warning" />;
    } else {
      return <InactiveIcon color="disabled" />;
    }
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Environments
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your infrastructure environments and monitor drift detection.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {environments.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <CloudIcon sx={{
            fontSize: '4rem',
            color: 'text.disabled',
            mb: 2
          }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No environments found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create your first environment to start monitoring infrastructure drift.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {environments.map((env) => (
              <Box key={env.id} sx={{ flex: '1 1 350px', maxWidth: '400px' }}>
                <Card sx={{ height: '100%', position: 'relative' }}>
                  <CardContent>
                    <Box sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 2
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {getCloudProviderIcon(env.cloud_provider)}
                        <Typography variant="h6" sx={{ ml: 1 }}>
                          {env.name}
                        </Typography>
                      </Box>
                      <Tooltip title={
                        env.is_active && env.is_ready_for_scan
                          ? 'Active and ready for scanning'
                          : env.is_active
                            ? 'Active but needs setup'
                            : 'Inactive'
                      }>
                        {getStatusIcon(env)}
                      </Tooltip>
                    </Box>

                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {env.cloud_provider_display} • {env.region}
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Account: {env.account_id}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                      {env.is_active ? (
                        <Chip label="Active" color="success" size="small" />
                      ) : (
                        <Chip label="Inactive" color="default" size="small" />
                      )}
                      {env.is_ready_for_scan ? (
                        <Chip label="Ready for Scan" color="info" size="small" />
                      ) : (
                        <Chip label="Needs Setup" color="warning" size="small" />
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="h6" color="primary">
                          {env.resource_count}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Resources
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{
                          color: env.drift_count > 0 ? 'error.main' : 'success.main'
                        }}>
                          {env.drift_count}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Drifts
                        </Typography>
                      </Box>
                    </Box>

                    {env.tags.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {env.tags.slice(0, 3).map((tag, index) => (
                            <Chip
                              key={index}
                              label={tag}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.75rem' }}
                            />
                          ))}
                          {env.tags.length > 3 && (
                            <Chip
                              label={`+${env.tags.length - 3} more`}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.75rem' }}
                            />
                          )}
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Container>
  );
};

export default Environments;
