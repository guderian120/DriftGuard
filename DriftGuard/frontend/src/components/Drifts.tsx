import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as ResolvedIcon,
  Schedule as DetectedIcon,
  Visibility as ViewIcon,
  Analytics as AnalyzeIcon,
} from '@mui/icons-material';
import { DriftEvent } from '../types/api';
import { driftsService } from '../api/driftsService';

const Drifts: React.FC = () => {
  const [drifts, setDrifts] = useState<DriftEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDrifts = async () => {
      try {
        setLoading(true);
        const driftEvents = await driftsService.getDrifts();
        setDrifts(driftEvents);
      } catch (err: any) {
        setError('Failed to load drift events');
        console.error('Drifts error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDrifts();
  }, []);

  const getSeverityColor = (score: number): string => {
    if (score >= 0.8) return '#f44336'; // Critical - red
    if (score >= 0.6) return '#ff9800'; // High - orange
    if (score >= 0.4) return '#ffeb3b'; // Medium - yellow
    return '#4caf50'; // Low - green
  };

  const getSeverityLabel = (score: number): string => {
    if (score >= 0.8) return 'Critical';
    if (score >= 0.6) return 'High';
    if (score >= 0.4) return 'Medium';
    return 'Low';
  };

  const getStatusIcon = (drift: DriftEvent) => {
    if (drift.is_resolved) {
      return <ResolvedIcon color="success" />;
    }
    return <WarningIcon color="warning" />;
  };

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const handleResolveDrift = async (driftId: number) => {
    try {
      await driftsService.resolveDrift(driftId, 'user_action', 'Resolved via UI');
      // Refresh data
      const updatedDrifts = await driftsService.getDrifts();
      setDrifts(updatedDrifts);
    } catch (error) {
      console.error('Failed to resolve drift:', error);
    }
  };

  const handleAnalyzeDrift = async (driftId: number) => {
    try {
      await driftsService.analyzeDrift(driftId);
      // Refresh data to show analysis results
      const updatedDrifts = await driftsService.getDrifts();
      setDrifts(updatedDrifts);
    } catch (error: any) {
      console.error('Failed to analyze drift:', error);
      // Could show error notification here
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
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Drift Events
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitor and manage infrastructure drift detection events.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {drifts.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <DetectedIcon sx={{
            fontSize: '4rem',
            color: 'text.disabled',
            mb: 2
          }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No drift events found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            All systems are in sync! No infrastructure drifts detected.
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Environment</TableCell>
                <TableCell>Resource</TableCell>
                <TableCell>Drift Type</TableCell>
                <TableCell>Detected</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Changes</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {drifts.map((drift) => (
                <TableRow key={drift.id} hover>
                  <TableCell>
                    <Tooltip title={drift.is_resolved ? 'Resolved' : 'Active drift'}>
                      {getStatusIcon(drift)}
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {drift.environment_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {drift.iac_resource_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={drift.drift_type}
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDateTime(drift.detected_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getSeverityLabel(drift.severity_score)}
                      size="small"
                      sx={{
                        backgroundColor: getSeverityColor(drift.severity_score),
                        color: drift.severity_score >= 0.6 ? 'white' : 'black',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {drift.changes_count} change{drift.changes_count !== 1 ? 's' : ''}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="View details">
                        <IconButton size="small">
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      {!drift.cause_analysis && !drift.is_resolved && (
                        <Tooltip title="Run AI analysis">
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => handleAnalyzeDrift(drift.id)}
                          >
                            <AnalyzeIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {!drift.is_resolved && (
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={() => handleResolveDrift(drift.id)}
                          sx={{ minWidth: 'auto', px: 2 }}
                        >
                          Resolve
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {drifts.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Showing {drifts.length} drift event{drifts.length !== 1 ? 's' : ''}
          </Typography>
          <Box>
            <Typography variant="body2" component="span" sx={{ mr: 2 }}>
              Unresolved: {drifts.filter(d => !d.is_resolved).length}
            </Typography>
            <Typography variant="body2" component="span">
              Resolved: {drifts.filter(d => d.is_resolved).length}
            </Typography>
          </Box>
        </Box>
      )}
    </Container>
  );
};

export default Drifts;
