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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';

import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { Organization, organizationsService } from '../api/organizationsService';

interface OrganizationFormData {
  name: string;
  slug: string;
  description: string;
  contact_email: string;
  is_active: boolean;
}

const Organizations: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<OrganizationFormData>({
    name: '',
    slug: '',
    description: '',
    contact_email: '',
    is_active: true,
  });

  const [formErrors, setFormErrors] = useState<Partial<OrganizationFormData>>({});

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const orgs = await organizationsService.getOrganizations();
      setOrganizations(orgs);
    } catch (err: any) {
      setError('Failed to load organizations');
      console.error('Organizations error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (org?: Organization) => {
    if (org) {
      setEditingOrg(org);
      setFormData({
        name: org.name,
        slug: org.slug,
        description: org.description || '',
        contact_email: org.contact_email || '',
        is_active: org.is_active,
      });
    } else {
      setEditingOrg(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        contact_email: '',
        is_active: true,
      });
    }
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingOrg(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      contact_email: '',
      is_active: true,
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Partial<OrganizationFormData> = {};

    if (!formData.name.trim()) {
      errors.name = 'Organization name is required';
    }

    if (!formData.slug.trim()) {
      errors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      errors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    }

    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      errors.contact_email = 'Invalid email format';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      if (editingOrg) {
        // Update existing organization
        await organizationsService.updateOrganization(editingOrg.id, formData);
      } else {
        // Create new organization
        await organizationsService.createOrganization(formData);
      }

      await fetchOrganizations();
      handleCloseDialog();
    } catch (err: any) {
      console.error('Save error:', err);
      if (err.response?.data) {
        setFormErrors(err.response.data);
      } else {
        setError('Failed to save organization');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (org: Organization) => {
    if (!window.confirm(`Are you sure you want to delete "${org.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await organizationsService.deleteOrganization(org.id);
      await fetchOrganizations();
    } catch (err: any) {
      console.error('Delete error:', err);
      setError('Failed to delete organization');
    }
  };

  const handleFormChange = (field: keyof OrganizationFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
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
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Organizations
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your organizations and their settings.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Organization
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {organizations.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <BusinessIcon sx={{
            fontSize: '4rem',
            color: 'text.disabled',
            mb: 2
          }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No organizations found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first organization to get started.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Create Organization
          </Button>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Organization</TableCell>
                <TableCell>Slug</TableCell>
                <TableCell>Contact Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {org.name}
                      </Typography>
                      {org.description && (
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>
                          {org.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={org.slug} variant="outlined" size="small" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {org.contact_email || 'Not set'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={org.is_active ? 'Active' : 'Inactive'}
                      color={org.is_active ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(org.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Edit organization">
                        <IconButton size="small" onClick={() => handleOpenDialog(org)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete organization">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(org)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingOrg ? 'Edit Organization' : 'Create Organization'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                fullWidth
                sx={{ minWidth: 200, flex: 1 }}
                label="Organization Name"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                error={!!formErrors.name}
                helperText={formErrors.name}
                required
              />
              <TextField
                fullWidth
                sx={{ minWidth: 200, flex: 1 }}
                label="Slug"
                value={formData.slug}
                onChange={(e) => handleFormChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                error={!!formErrors.slug}
                helperText={formErrors.slug || 'Unique identifier for the organization'}
                required
              />
            </Box>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
              multiline
              rows={2}
              helperText="Optional description of the organization"
            />
            <TextField
              fullWidth
              sx={{ maxWidth: 400 }}
              label="Contact Email"
              type="email"
              value={formData.contact_email}
              onChange={(e) => handleFormChange('contact_email', e.target.value)}
              error={!!formErrors.contact_email}
              helperText={formErrors.contact_email}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Organizations;
