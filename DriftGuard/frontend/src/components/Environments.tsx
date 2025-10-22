import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Stack,
  Alert,
  LinearProgress,
  Box,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Divider,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Add as AddIcon,
  Cloud as CloudIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  Code as CodeIcon,
  Link as LinkIcon,
  CheckCircle as CheckCircleIcon,
  GitHub as GitHubIcon,
} from '@mui/icons-material';
import { environmentsService } from '../api/environmentsService';
import { iacService } from '../api/iacService';
import { Environment, IaCRepository } from '../types/api';

const Environments: React.FC = () => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [iacRepositories, setIacRepositories] = useState<IaCRepository[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Create Environment Dialog - Stepper based
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [repoDetectionStatus, setRepoDetectionStatus] = useState<'idle' | 'detecting' | 'detected' | 'error'>('idle');
  const [isPrivateRepo, setIsPrivateRepo] = useState<boolean | null>(null);

  // Form data for all steps
  const [envData, setEnvData] = useState({
    name: '',
    cloud_provider: 'aws' as 'aws' | 'gcp' | 'azure',
    region: '',
    account_id: '',
  });

  const [repoData, setRepoData] = useState({
    github_url: '',
    repository_url: '',
    repository_owner: '',
    repository_name: '',
    branch: 'main',
    iac_type: 'terraform' as string,
    github_token: '',
  });

  const [credData, setCredData] = useState({
    credential_type: 'aws_access_keys' as string,
    name: '',
    aws_access_key_id: '',
    aws_secret_access_key: '',
    aws_role_arn: '',
  });

  const steps = ['Environment Setup', 'GitHub Repository', 'Cloud Credentials', 'Review & Create'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [envs, repos] = await Promise.all([
        environmentsService.getEnvironments(),
        iacService.getIaCRepositories()
      ]);
      setEnvironments(envs);
      setIacRepositories(repos);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleGithubUrlChange = async (url: string) => {
    setRepoData({ ...repoData, github_url: url });

    // Auto-parse GitHub URL
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (match) {
      const [_, owner, name] = match;
      setRepoData(prev => ({
        ...prev,
        repository_owner: owner,
        repository_name: name,
        repository_url: url,
      }));

      // Try to detect if repository is private/public
      setRepoDetectionStatus('detecting');
      try {
        // Try to access repository without auth first
        const response = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
          method: 'HEAD',
          headers: { Accept: 'application/vnd.github.v3+json' }
        });

        if (response.status === 404) {
          setIsPrivateRepo(null);
          setRepoDetectionStatus('error');
        } else if (response.status === 401 || response.status === 403) {
          setIsPrivateRepo(true);
          setRepoDetectionStatus('detected');
        } else if (response.ok) {
          setIsPrivateRepo(false);
          setRepoDetectionStatus('detected');
        }
      } catch (error) {
        setRepoDetectionStatus('error');
        setIsPrivateRepo(null);
      }
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // Environment Setup
        return !!envData.name && !!envData.cloud_provider && !!envData.region && !!envData.account_id;
      case 1: // GitHub Repository
        if (!repoData.github_url) return true; // Optional
        return !!repoData.repository_owner && !!repoData.repository_name &&
               (!isPrivateRepo || !!repoData.github_token);
      case 2: // Cloud Credentials
        return !!credData.name && !!credData.credential_type;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleFinish = async () => {
    try {
      setError('');

      // Step 1: Create environment
      const env = await environmentsService.createEnvironment(envData);

      // Step 2: Create IaC repository if GitHub URL provided
      let iacRepo = null;
      if (repoData.github_url) {
        try {
          iacRepo = await iacService.createIaCRepository({
            name: `${envData.name} IaC`,
            platform: 'github',
            repository_url: repoData.repository_url,
            repository_owner: repoData.repository_owner,
            repository_name: repoData.repository_name,
            branch: repoData.branch,
            iac_type: repoData.iac_type,
            github_token: repoData.github_token || undefined,
          });
        } catch (iacError) {
          console.warn('IaC repository creation failed:', iacError);
        }
      }

      // Step 3: Add credentials
      try {
        await environmentsService.setEnvironmentCredentials(env.id, credData);
      } catch (credError) {
        console.warn('Credential setup failed:', credError);
      }

      // Reset form and close dialog
      setCreateDialogOpen(false);
      setActiveStep(0);
      resetForm();

      // Refresh data
      await loadData();

    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create environment');
    }
  };

  const resetForm = () => {
    setEnvData({
      name: '',
      cloud_provider: 'aws',
      region: '',
      account_id: '',
    });
    setRepoData({
      github_url: '',
      repository_url: '',
      repository_owner: '',
      repository_name: '',
      branch: 'main',
      iac_type: 'terraform',
      github_token: '',
    });
    setCredData({
      credential_type: 'aws_access_keys',
      name: '',
      aws_access_key_id: '',
      aws_secret_access_key: '',
      aws_role_arn: '',
    });
    setRepoDetectionStatus('idle');
    setIsPrivateRepo(null);
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Stack spacing={3}>
            <Typography variant="h6">Environment Setup</Typography>
            <TextField
              label="Environment Name"
              value={envData.name}
              onChange={(e) => setEnvData({ ...envData, name: e.target.value })}
              fullWidth
              required
            />
            <FormControl fullWidth required>
              <InputLabel>Cloud Provider</InputLabel>
              <Select
                value={envData.cloud_provider}
                onChange={(e) => setEnvData({ ...envData, cloud_provider: e.target.value as 'aws' | 'gcp' | 'azure' })}
              >
                <MenuItem value="aws">AWS</MenuItem>
                <MenuItem value="gcp">Google Cloud Platform</MenuItem>
                <MenuItem value="azure">Microsoft Azure</MenuItem>
              </Select>
            </FormControl>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Region"
                value={envData.region}
                onChange={(e) => setEnvData({ ...envData, region: e.target.value })}
                fullWidth
                required
                placeholder="us-east-1"
              />
              <TextField
                label="Account ID"
                value={envData.account_id}
                onChange={(e) => setEnvData({ ...envData, account_id: e.target.value })}
                fullWidth
                required
                placeholder="123456789012"
              />
            </Stack>
          </Stack>
        );

      case 1:
        return (
          <Stack spacing={3}>
            <Typography variant="h6">IaC Repository (Optional)</Typography>
            <Alert severity="info">
              Connect your GitHub repository containing infrastructure code. We'll automatically detect if it's private or public.
            </Alert>

            <TextField
              label="GitHub Repository URL"
              placeholder="https://github.com/organization/repository"
              value={repoData.github_url}
              onChange={(e) => handleGithubUrlChange(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: <GitHubIcon sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />

            {repoDetectionStatus === 'detecting' && (
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>Detecting repository type...</Typography>
                <LinearProgress />
              </Box>
            )}

            {repoDetectionStatus === 'error' && (
              <Alert severity="warning">
                Cannot access repository. It may be private - please provide a GitHub token.
              </Alert>
            )}

            {repoDetectionStatus === 'detected' && isPrivateRepo && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Private repository detected. Please provide a GitHub token.
              </Alert>
            )}

            {repoDetectionStatus === 'detected' && isPrivateRepo === false && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Public repository detected - no authentication required.
              </Alert>
            )}

            {repoData.repository_owner && (
              <Stack spacing={2}>
                <Typography variant="subtitle2">
                  Repository: {repoData.repository_owner}/{repoData.repository_name}
                </Typography>

                {isPrivateRepo && (
                  <TextField
                    label="GitHub Personal Access Token"
                    type="password"
                    value={repoData.github_token}
                    onChange={(e) => setRepoData({ ...repoData, github_token: e.target.value })}
                    fullWidth
                    required
                    helperText="Token needs 'repo' scope to access private repositories"
                  />
                )}

                <FormControl fullWidth>
                  <InputLabel>IaC Type</InputLabel>
                  <Select
                    value={repoData.iac_type}
                    onChange={(e) => setRepoData({ ...repoData, iac_type: e.target.value })}
                  >
                    <MenuItem value="terraform">Terraform</MenuItem>
                    <MenuItem value="cloudformation">AWS CloudFormation</MenuItem>
                    <MenuItem value="arm_template">Azure ARM Template</MenuItem>
                    <MenuItem value="bicep">Azure Bicep</MenuItem>
                    <MenuItem value="pulumi">Pulumi</MenuItem>
                    <MenuItem value="cdk">AWS CDK</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            )}
          </Stack>
        );

      case 2:
        return (
          <Stack spacing={3}>
            <Typography variant="h6">Cloud Credentials</Typography>
            <Alert severity="info">
              Configure credentials for {envData.cloud_provider?.toUpperCase()} to enable drift scanning.
            </Alert>

            <TextField
              label="Credential Name"
              placeholder="Production Credentials"
              value={credData.name}
              onChange={(e) => setCredData({ ...credData, name: e.target.value })}
              fullWidth
              required
            />

            {envData.cloud_provider === 'aws' && (
              <>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={credData.credential_type === 'aws_access_keys'}
                      onChange={(e) => setCredData({
                        ...credData,
                        credential_type: e.target.checked ? 'aws_access_keys' : 'aws_role'
                      })}
                    />
                  }
                  label="Use AWS Access Keys"
                />

                {credData.credential_type === 'aws_access_keys' ? (
                  <>
                    <TextField
                      label="AWS Access Key ID"
                      type="password"
                      value={credData.aws_access_key_id}
                      onChange={(e) => setCredData({ ...credData, aws_access_key_id: e.target.value })}
                      fullWidth
                      required
                    />
                    <TextField
                      label="AWS Secret Access Key"
                      type="password"
                      value={credData.aws_secret_access_key}
                      onChange={(e) => setCredData({ ...credData, aws_secret_access_key: e.target.value })}
                      fullWidth
                      required
                    />
                  </>
                ) : (
                  <TextField
                    label="AWS Role ARN"
                    placeholder="arn:aws:iam::123456789012:role/DriftGuardRole"
                    value={credData.aws_role_arn}
                    onChange={(e) => setCredData({ ...credData, aws_role_arn: e.target.value })}
                    fullWidth
                    required
                  />
                )}
              </>
            )}

            {envData.cloud_provider === 'gcp' && (
              <Alert severity="info">GCP credentials setup will be implemented in the backend.</Alert>
            )}

            {envData.cloud_provider === 'azure' && (
              <Alert severity="info">Azure credentials setup will be implemented in the backend.</Alert>
            )}
          </Stack>
        );

      case 3:
        return (
          <Stack spacing={3}>
            <Typography variant="h6">Review & Create</Typography>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <CloudIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Environment Configuration
                </Typography>
                <Typography><strong>Name:</strong> {envData.name}</Typography>
                <Typography><strong>Provider:</strong> {envData.cloud_provider?.toUpperCase()}</Typography>
                <Typography><strong>Region:</strong> {envData.region}</Typography>
                <Typography><strong>Account ID:</strong> {envData.account_id}</Typography>
              </CardContent>
            </Card>

            {repoData.github_url && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <GitHubIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    IaC Repository
                  </Typography>
                  <Typography><strong>URL:</strong> {repoData.github_url}</Typography>
                  <Typography><strong>Type:</strong> {repoData.iac_type}</Typography>
                  <Typography><strong>Private:</strong> {isPrivateRepo ? 'Yes' : 'No'}</Typography>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <SecurityIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Cloud Credentials
                </Typography>
                <Typography><strong>Name:</strong> {credData.name}</Typography>
                <Typography><strong>Type:</strong> {credData.credential_type}</Typography>
              </CardContent>
            </Card>
          </Stack>
        );

      default:
        return null;
    }
  };

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        <CloudIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Cloud Environments
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Add Environment
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Provider</TableCell>
              <TableCell>Region</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Resources</TableCell>
              <TableCell>Credentials</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {environments.map((env) => (
              <TableRow key={env.id}>
                <TableCell>{env.name}</TableCell>
                <TableCell>
                  <Chip label={env.cloud_provider.toUpperCase()} size="small" />
                </TableCell>
                <TableCell>{env.region}</TableCell>
                <TableCell>
                  <Chip
                    label={env.is_active ? 'Active' : 'Inactive'}
                    color={env.is_active ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{env.resource_count}</TableCell>
                <TableCell>
                  {env.has_credentials ? (
                    <CheckCircleIcon color="success" />
                  ) : (
                    <SecurityIcon color="warning" />
                  )}
                </TableCell>
                <TableCell>
                  <Button size="small" variant="outlined">
                    <SecurityIcon />
                    Manage
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Environment Dialog with Stepper */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AddIcon sx={{ mr: 1 }} />
            Create New Environment
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ width: '100%', mt: 2 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            <Box sx={{ mt: 3, mb: 1 }}>
              {renderStepContent(activeStep)}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCreateDialogOpen(false);
            resetForm();
            setActiveStep(0);
          }}>
            Cancel
          </Button>
          {activeStep > 0 && (
            <Button onClick={handleBack}>
              Back
            </Button>
          )}
          {activeStep < steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!validateStep(activeStep)}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleFinish}
              disabled={loading}
            >
              Create Environment
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default Environments;
