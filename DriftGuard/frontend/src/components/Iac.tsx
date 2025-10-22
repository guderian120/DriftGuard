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
} from '@mui/material';
import {
  Add as AddIcon,
  Code as CodeIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { iacService } from '../api/iacService';
import { IaCRepository } from '../types/api';

const Iac: React.FC = () => {
  const [repositories, setRepositories] = useState<IaCRepository[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Dialog state for creating repositories
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newRepository, setNewRepository] = useState({
    name: '',
    platform: 'github' as 'github' | 'gitlab' | 'bitbucket',
    repository_url: '',
    repository_owner: '',
    repository_name: '',
    branch: 'main',
    iac_type: 'terraform' as string,
    github_token: '',
  });

  useEffect(() => {
    loadRepositories();
  }, []);

  const loadRepositories = async () => {
    setLoading(true);
    try {
      const data = await iacService.getIaCRepositories();
      setRepositories(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load IaC repositories');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRepository = async () => {
    try {
      await iacService.createIaCRepository(newRepository);
      setCreateDialogOpen(false);
      setNewRepository({
        name: '',
        platform: 'github',
        repository_url: '',
        repository_owner: '',
        repository_name: '',
        branch: 'main',
        iac_type: 'terraform',
        github_token: '',
      });
      loadRepositories();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create repository');
    }
  };

  const handleScanRepository = async (repoId: number) => {
    try {
      await iacService.scanRepository(repoId);
      // Show success message or refresh the repository
      loadRepositories();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to scan repository');
    }
  };

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        <CodeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Infrastructure as Code (IaC) Repositories
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Add Repository
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadRepositories}
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
              <TableCell>Platform</TableCell>
              <TableCell>Repository</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {repositories.map((repo) => (
              <TableRow key={repo.id}>
                <TableCell>{repo.name}</TableCell>
                <TableCell>
                  <Chip label={repo.platform.toUpperCase()} size="small" />
                </TableCell>
                <TableCell>
                  {repo.repository_owner}/{repo.repository_name}
                </TableCell>
                <TableCell>
                  <Chip label={repo.iac_type} size="small" color="primary" />
                </TableCell>
                <TableCell>
                  <Chip
                    label={repo.is_active ? 'Active' : 'Inactive'}
                    color={repo.is_active ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleScanRepository(repo.id)}
                  >
                    Scan
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Repository Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add IaC Repository</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <TextField
              label="Repository Name"
              placeholder="e.g., Production Infrastructure"
              value={newRepository.name}
              onChange={(e) => setNewRepository({ ...newRepository, name: e.target.value })}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Platform</InputLabel>
              <Select
                value={newRepository.platform}
                onChange={(e) => setNewRepository({ ...newRepository, platform: e.target.value as 'github' | 'gitlab' | 'bitbucket' })}
              >
                <MenuItem value="github">GitHub</MenuItem>
                <MenuItem value="gitlab">GitLab</MenuItem>
                <MenuItem value="bitbucket">BitBucket</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Repository URL"
              placeholder="https://github.com/organization/repo"
              value={newRepository.repository_url}
              onChange={(e) => setNewRepository({ ...newRepository, repository_url: e.target.value })}
              fullWidth
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Owner"
                placeholder="organization"
                value={newRepository.repository_owner}
                onChange={(e) => setNewRepository({ ...newRepository, repository_owner: e.target.value })}
                fullWidth
              />
              <TextField
                label="Repository Name"
                placeholder="my-terraform-repo"
                value={newRepository.repository_name}
                onChange={(e) => setNewRepository({ ...newRepository, repository_name: e.target.value })}
                fullWidth
              />
            </Stack>

            <TextField
              label="Branch"
              placeholder="main"
              value={newRepository.branch}
              onChange={(e) => setNewRepository({ ...newRepository, branch: e.target.value })}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>IaC Type</InputLabel>
              <Select
                value={newRepository.iac_type}
                onChange={(e) => setNewRepository({ ...newRepository, iac_type: e.target.value })}
              >
                <MenuItem value="terraform">Terraform</MenuItem>
                <MenuItem value="cloudformation">AWS CloudFormation</MenuItem>
                <MenuItem value="arm_template">Azure ARM Template</MenuItem>
                <MenuItem value="bicep">Azure Bicep</MenuItem>
                <MenuItem value="pulumi">Pulumi</MenuItem>
                <MenuItem value="cdk">AWS CDK</MenuItem>
              </Select>
            </FormControl>

            {newRepository.platform === 'github' && (
              <TextField
                label="GitHub Token (Optional)"
                type="password"
                placeholder="ghp_..."
                value={newRepository.github_token}
                onChange={(e) => setNewRepository({ ...newRepository, github_token: e.target.value })}
                fullWidth
                helperText="Token for private repositories (classic token with repo scope)"
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateRepository} variant="contained">
            Add Repository
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default Iac;
