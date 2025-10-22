import React, { useState, useEffect } from 'react';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Box,
  Fab,
  CircularProgress,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  VpnKey as KeyIcon,
  Cloud as CloudIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';

interface Environment {
  id: number;
  name: string;
  slug: string;
  cloud_provider: string;
  region: string;
  account_id: string;
}

interface Credential {
  id: number;
  environment: number;
  credential_type: string;
  name: string;
  is_active: boolean;
  last_used: string | null;
  created_at: string;
}

const Credentials: React.FC = () => {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const mockEnvironments: Environment[] = [
    {
      id: 1,
      name: 'Production AWS',
      slug: 'prod-aws',
      cloud_provider: 'aws',
      region: 'us-east-1',
      account_id: '123456789012',
    },
    {
      id: 2,
      name: 'Development Azure',
      slug: 'dev-azure',
      cloud_provider: 'azure',
      region: 'eastus',
      account_id: 'dev-subscription-123',
    },
  ];

  const mockCredentials: Credential[] = [
    {
      id: 1,
      environment: 1,
      credential_type: 'aws_access_keys',
      name: 'Production Admin Keys',
      is_active: true,
      last_used: '2025-01-20T10:30:00Z',
      created_at: '2025-01-15T08:00:00Z',
    },
  ];

  useEffect(() => {
    // Simulate API calls
    setTimeout(() => {
      setEnvironments(mockEnvironments);
      setCredentials(mockCredentials);
      setLoading(false);
    }, 1000);
  }, []);

  const formik = useFormik({
    initialValues: {
      environment: '',
      credential_type: 'aws_access_keys',
      name: '',
      aws_access_key_id: '',
      aws_secret_access_key: '',
      aws_role_arn: '',
      azure_client_id: '',
      azure_client_secret: '',
      azure_tenant_id: '',
      gcp_service_account_key: '',
    },
    validationSchema: Yup.object().shape({
      environment: Yup.string().required('Environment is required'),
      credential_type: Yup.string().required('Credential type is required'),
      name: Yup.string().required('Credential name is required'),
      aws_access_key_id: Yup.string().when('credential_type', {
        is: 'aws_access_keys',
        then: (schema) => schema.required('AWS Access Key ID is required'),
      }),
      aws_secret_access_key: Yup.string().when('credential_type', {
        is: 'aws_access_keys',
        then: (schema) => schema.required('AWS Secret Access Key is required'),
      }),
      aws_role_arn: Yup.string().when('credential_type', {
        is: 'aws_role',
        then: (schema) => schema.required('AWS Role ARN is required'),
      }),
      azure_client_id: Yup.string().when('credential_type', {
        is: 'azure_service_principal',
        then: (schema) => schema.required('Azure Client ID is required'),
      }),
      azure_client_secret: Yup.string().when('credential_type', {
        is: 'azure_service_principal',
        then: (schema) => schema.required('Azure Client Secret is required'),
      }),
      azure_tenant_id: Yup.string().when('credential_type', {
        is: 'azure_service_principal',
        then: (schema) => schema.required('Azure Tenant ID is required'),
      }),
      gcp_service_account_key: Yup.string().when('credential_type', {
        is: 'gcp_service_account',
        then: (schema) => schema.required('GCP Service Account Key is required'),
      }),
    }),
    onSubmit: async (values) => {
      try {
        setError(null);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        const newCred: Credential = {
          id: Date.now(),
          environment: parseInt(values.environment),
          credential_type: values.credential_type,
          name: values.name,
          is_active: true,
          last_used: null,
          created_at: new Date().toISOString(),
        };

        if (editingCredential) {
          setCredentials(creds => creds.map(c => c.id === editingCredential.id ? newCred : c));
        } else {
          setCredentials(creds => [...creds, newCred]);
        }

        setSuccess(`Credential ${editingCredential ? 'updated' : 'added'} successfully!`);
        handleCloseDialog();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to save credential');
      }
    },
  });

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCredential(null);
    formik.resetForm();
    setError(null);
    setShowPasswords({});
  };

  const handleEdit = (credential: Credential) => {
    setEditingCredential(credential);
    formik.setValues({
      environment: credential.environment.toString(),
      credential_type: credential.credential_type,
      name: credential.name,
      aws_access_key_id: '',
      aws_secret_access_key: '',
      aws_role_arn: '',
      azure_client_id: '',
      azure_client_secret: '',
      azure_tenant_id: '',
      gcp_service_account_key: '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (credentialId: number) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setCredentials(creds => creds.filter(c => c.id !== credentialId));
      setSuccess('Credential deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Failed to delete credential');
    }
  };

  const getEnvironmentName = (envId: number) => {
    const env = environments.find(e => e.id === envId);
    return env ? `${env.name} (${env.cloud_provider.toUpperCase()})` : 'Unknown Environment';
  };

  const getCredentialTypeDisplay = (type: string) => {
    const types = {
      'aws_access_keys': 'AWS Access Keys',
      'aws_role': 'AWS IAM Role',
      'azure_service_principal': 'Azure Service Principal',
      'gcp_service_account': 'GCP Service Account',
    };
    return types[type as keyof typeof types] || type;
  };

  const toggleShowPassword = (field: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const renderCredentialFields = () => {
    const { credential_type } = formik.values;

    switch (credential_type) {
      case 'aws_access_keys':
        return (
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 3,
            mt: 1
          }}>
            <TextField
              fullWidth
              name="aws_access_key_id"
              label="AWS Access Key ID"
              value={formik.values.aws_access_key_id}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.aws_access_key_id && Boolean(formik.errors.aws_access_key_id)}
              helperText={formik.touched.aws_access_key_id && formik.errors.aws_access_key_id}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SecurityIcon /></InputAdornment>,
              }}
            />
            <TextField
              fullWidth
              name="aws_secret_access_key"
              label="AWS Secret Access Key"
              type={showPasswords.aws_secret ? 'text' : 'password'}
              value={formik.values.aws_secret_access_key}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.aws_secret_access_key && Boolean(formik.errors.aws_secret_access_key)}
              helperText={formik.touched.aws_secret_access_key && formik.errors.aws_secret_access_key}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SecurityIcon /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => toggleShowPassword('aws_secret')}
                      edge="end"
                    >
                      {showPasswords.aws_secret ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        );

      case 'aws_role':
        return (
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              name="aws_role_arn"
              label="AWS Role ARN"
              placeholder="arn:aws:iam::123456789012:role/MyRole"
              value={formik.values.aws_role_arn}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.aws_role_arn && Boolean(formik.errors.aws_role_arn)}
              helperText={formik.touched.aws_role_arn && formik.errors.aws_role_arn}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SecurityIcon /></InputAdornment>,
              }}
            />
          </Box>
        );

      case 'azure_service_principal':
        return (
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
            gap: 3,
            mt: 1
          }}>
            <TextField
              fullWidth
              name="azure_client_id"
              label="Azure Client ID"
              value={formik.values.azure_client_id}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.azure_client_id && Boolean(formik.errors.azure_client_id)}
              helperText={formik.touched.azure_client_id && formik.errors.azure_client_id}
            />
            <TextField
              fullWidth
              name="azure_tenant_id"
              label="Azure Tenant ID"
              value={formik.values.azure_tenant_id}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.azure_tenant_id && Boolean(formik.errors.azure_tenant_id)}
              helperText={formik.touched.azure_tenant_id && formik.errors.azure_tenant_id}
            />
            <TextField
              fullWidth
              name="azure_client_secret"
              label="Azure Client Secret"
              type={showPasswords.azure_secret ? 'text' : 'password'}
              value={formik.values.azure_client_secret}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.azure_client_secret && Boolean(formik.errors.azure_client_secret)}
              helperText={formik.touched.azure_client_secret && formik.errors.azure_client_secret}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => toggleShowPassword('azure_secret')}
                      edge="end"
                    >
                      {showPasswords.azure_secret ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        );

      case 'gcp_service_account':
        return (
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              multiline
              rows={8}
              name="gcp_service_account_key"
              label="GCP Service Account Key (JSON)"
              placeholder='{"type": "service_account", "project_id": "...", ...}'
              value={formik.values.gcp_service_account_key}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.gcp_service_account_key && Boolean(formik.errors.gcp_service_account_key)}
              helperText={formik.touched.gcp_service_account_key && formik.errors.gcp_service_account_key}
            />
          </Box>
        );

      default:
        return null;
    }
  };

  const selectedEnvironment = environments.find(e => e.id.toString() === formik.values.environment);

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Cloud Credentials
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Securely store cloud provider credentials for infrastructure drift detection.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          size="large"
        >
          Add Credential
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
        gap: 3
      }}>
        {credentials.length === 0 ? (
          <Box sx={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            py: 8
          }}>
            <KeyIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No credentials configured yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Add cloud provider credentials to enable drift detection.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
            >
              Add Your First Credential
            </Button>
          </Box>
        ) : (
          credentials.map((cred) => (
            <Card elevation={2} key={cred.id}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    {cred.name}
                  </Typography>
                  <Chip
                    label={getCredentialTypeDisplay(cred.credential_type)}
                    size="small"
                    variant="outlined"
                  />
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {getEnvironmentName(cred.environment)}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Active: {cred.is_active ? 'Yes' : 'No'}
                  {cred.last_used && ` • Last used: ${new Date(cred.last_used).toLocaleDateString()}`}
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  Created: {new Date(cred.created_at).toLocaleDateString()}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <IconButton
                    size="small"
                    onClick={() => handleEdit(cred)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(cred.id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          ))
        )}
      </Box>

      {/* Add/Edit Credential Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingCredential ? 'Edit Credential' : 'Add New Credential'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '4fr 4fr 4fr' },
            gap: 3,
            mt: 1
          }}>
            <TextField
              fullWidth
              name="name"
              label="Credential Name"
              value={formik.values.name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.name && Boolean(formik.errors.name)}
              helperText={formik.touched.name && formik.errors.name}
            />

            <FormControl fullWidth>
              <InputLabel>Environment</InputLabel>
              <Select
                name="environment"
                value={formik.values.environment}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              >
                {environments.map((env) => (
                  <MenuItem key={env.id} value={env.id.toString()}>
                    {env.name} ({env.cloud_provider.toUpperCase()})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Credential Type</InputLabel>
              <Select
                name="credential_type"
                value={formik.values.credential_type}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              >
                {selectedEnvironment && (
                  <>
                    {selectedEnvironment.cloud_provider === 'aws' && (
                      <>
                        <MenuItem value="aws_access_keys">AWS Access Keys</MenuItem>
                        <MenuItem value="aws_role">AWS IAM Role</MenuItem>
                      </>
                    )}
                    {selectedEnvironment.cloud_provider === 'azure' && (
                      <MenuItem value="azure_service_principal">Azure Service Principal</MenuItem>
                    )}
                    {selectedEnvironment.cloud_provider === 'gcp' && (
                      <MenuItem value="gcp_service_account">GCP Service Account</MenuItem>
                    )}
                  </>
                )}
              </Select>
            </FormControl>
          </Box>

          {renderCredentialFields()}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={formik.submitForm} variant="contained" disabled={formik.isSubmitting}>
            {formik.isSubmitting ? 'Saving...' : (editingCredential ? 'Update' : 'Add')} Credential
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Credentials;
