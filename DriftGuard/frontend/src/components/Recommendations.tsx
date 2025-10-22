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
  Button,
  List,
  ListItem,
  ListItemText,
  Collapse,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as ImplementIcon,
  PriorityHigh as CriticalIcon,
  Warning as HighIcon,
  Info as MediumIcon,
  Check as LowIcon,
} from '@mui/icons-material';
import { Recommendation } from '../types/api';
import { recommendationsService } from '../api/recommendationsService';

const Recommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const recs = await recommendationsService.getRecommendations();
        setRecommendations(recs);
      } catch (err: any) {
        setError('Failed to load recommendations');
        console.error('Recommendations error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  const getPriorityColor = (priority: string): string => {
    switch (priority.toLowerCase()) {
      case 'critical': return '#f44336';
      case 'high': return '#ff9800';
      case 'medium': return '#ffeb3b';
      case 'low': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return <CriticalIcon />;
      case 'high': return <HighIcon />;
      case 'medium': return <MediumIcon />;
      case 'low': return <LowIcon />;
      default: return <AssessmentIcon />;
    }
  };

  const handleToggleExpansion = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleImplementRecommendation = async (recommendationId: number) => {
    try {
      await recommendationsService.implementRecommendation(recommendationId, {
        implemented_at: new Date().toISOString(),
        implemented_by: 'user'
      });
      // Refresh data
      const updatedRecs = await recommendationsService.getRecommendations();
      setRecommendations(updatedRecs);
    } catch (error) {
      console.error('Failed to implement recommendation:', error);
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
          Recommendations
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Actionable recommendations to resolve infrastructure drift and improve resource configuration.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {recommendations.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <AssessmentIcon sx={{
            fontSize: '4rem',
            color: 'text.disabled',
            mb: 2
          }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No recommendations available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            All infrastructure is optimally configured! Keep monitoring for drift.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ flexGrow: 1 }}>
          {recommendations.map((rec) => (
            <Card key={rec.id} sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  mb: 2
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <Box sx={{ mr: 2 }}>
                      {getPriorityIcon(rec.priority)}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" component="h3" gutterBottom>
                        {rec.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Environment: {rec.environment_name} | Category: {rec.category}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                        <Chip
                          label={rec.priority.toUpperCase()}
                          size="small"
                          sx={{
                            backgroundColor: getPriorityColor(rec.priority),
                            color: rec.priority.toLowerCase() === 'medium' ? 'black' : 'white',
                          }}
                        />
                        <Chip
                          label={`Reduces risk by ${rec.risk_reduction}%`}
                          size="small"
                          variant="outlined"
                          color="success"
                        />
                        {rec.automation_available && (
                          <Chip
                            label="Automatable"
                            size="small"
                            variant="outlined"
                            color="info"
                          />
                        )}
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      startIcon={<ImplementIcon />}
                      onClick={() => handleImplementRecommendation(rec.id)}
                      sx={{ mr: 1 }}
                    >
                      Implement
                    </Button>
                    <IconButton
                      onClick={() => handleToggleExpansion(rec.id)}
                      size="small"
                    >
                      {expandedId === rec.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Box>
                </Box>

                <Typography variant="body1" paragraph>
                  {rec.description}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Estimated effort: {rec.estimated_effort}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(rec.created_at).toLocaleDateString()}
                  </Typography>
                </Box>

                <Collapse in={expandedId === rec.id}>
                  <Box sx={{ mt: 2, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="h6" component="h4" gutterBottom>
                      Implementation Steps
                    </Typography>
                    <List dense>
                      {rec.implementation_steps.map((step: string, index: number) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={`${index + 1}. ${step}`}
                            sx={{ '& .MuiListItemText-primary': { fontSize: '0.9rem' } }}
                          />
                        </ListItem>
                      ))}
                    </List>

                    {(rec.cost_impact !== 'None' || rec.compliance_impact !== 'None') && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="h6" component="h4" gutterBottom sx={{ fontSize: '1rem' }}>
                          Additional Impact
                        </Typography>
                        {rec.cost_impact !== 'None' && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>Cost Impact:</strong> {rec.cost_impact}
                          </Typography>
                        )}
                        {rec.compliance_impact !== 'None' && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>Compliance Impact:</strong> {rec.compliance_impact}
                          </Typography>
                        )}
                      </Box>
                    )}

                    {rec.tags.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Tags
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {rec.tags.map((tag: string, index: number) => (
                            <Chip
                              key={index}
                              label={tag}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.75rem' }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {recommendations.length > 0 && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Showing {recommendations.length} recommendation{recommendations.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default Recommendations;
