import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  IconButton,
  Snackbar,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { organizationsService, Organization, OrganizationMember, MemberInviteRequest } from '../api/organizationsService';

interface OrganizationsProps {}

const Organizations: React.FC<OrganizationsProps> = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);

  // Dialog states
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editMemberDialogOpen, setEditMemberDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<OrganizationMember | null>(null);

  // Form states
  const [inviteForm, setInviteForm] = useState<MemberInviteRequest>({
    email: '',
    role: 'viewer',
    first_name: '',
    last_name: '',
  });
  const [editMemberForm, setEditMemberForm] = useState({
    role: 'viewer' as 'admin' | 'editor' | 'viewer',
    is_active: true,
  });

  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrg && tabValue === 1) {
      loadMembers(selectedOrg.id);
    }
  }, [selectedOrg, tabValue]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const data = await organizationsService.getOrganizations();
      setOrganizations(data);
    } catch (error) {
      showSnackbar('Failed to load organizations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (orgId: number) => {
    try {
      setMembersLoading(true);
      const data = await organizationsService.getOrganizationMembers(orgId);
      setMembers(data);
    } catch (error) {
      showSnackbar('Failed to load members', 'error');
    } finally {
      setMembersLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleOrgClick = (org: Organization) => {
    setSelectedOrg(org);
    setTabValue(0);
  };

  const handleInviteMember = async () => {
    if (!selectedOrg) return;

    try {
      await organizationsService.inviteMember(selectedOrg.id, inviteForm);
      showSnackbar('Member invited successfully', 'success');
      setInviteDialogOpen(false);
      setInviteForm({ email: '', role: 'viewer', first_name: '', last_name: '' });
      loadMembers(selectedOrg.id);
    } catch (error) {
      showSnackbar('Failed to invite member', 'error');
    }
  };

  const handleEditMember = (member: OrganizationMember) => {
    setSelectedMember(member);
    setEditMemberForm({ role: member.role, is_active: member.is_active });
    setEditMemberDialogOpen(true);
  };

  const handleUpdateMember = async () => {
    if (!selectedOrg || !selectedMember) return;

    try {
      await organizationsService.updateMember(selectedOrg.id, selectedMember.id, editMemberForm);
      showSnackbar('Member updated successfully', 'success');
      setEditMemberDialogOpen(false);
      setSelectedMember(null);
      loadMembers(selectedOrg.id);
    } catch (error) {
      showSnackbar('Failed to update member', 'error');
    }
  };

  const handleRemoveMember = async (member: OrganizationMember) => {
    if (!selectedOrg) return;

    // Use modern confirm dialog instead of window.confirm
    const confirmed = window.confirm(`Are you sure you want to remove ${member.full_name} from the organization?`);
    if (!confirmed) return;

    try {
      await organizationsService.removeMember(selectedOrg.id, member.id);
      showSnackbar('Member removed successfully', 'success');
      loadMembers(selectedOrg.id);
    } catch (error) {
      showSnackbar('Failed to remove member', 'error');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'editor':
        return 'warning';
      case 'viewer':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading && !selectedOrg) {
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
          Organizations
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your organizations and team members
        </Typography>
      </Box>

      {!selectedOrg ? (
        // Organization list view
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5">Your Organizations</Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fill, minmax(300px, 1fr))' }, gap: 3 }}>
            {organizations.map((org) => (
              <Card
                key={org.id}
                sx={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 3 }
                }}
                onClick={() => handleOrgClick(org)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">{org.name}</Typography>
                    <Chip
                      label={org.is_active ? 'Active' : 'Inactive'}
                      color={org.is_active ? 'success' : 'default'}
                      size="small"
                      sx={{ ml: 'auto' }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {org.description || 'No description provided'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Member count: {org.users_count || 0}
                  </Typography>
                </CardContent>
              </Card>
            ))}

            {organizations.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <BusinessIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No organizations found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Create your first organization to get started
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      ) : (
        // Organization detail view
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h5">{selectedOrg.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedOrg.description || 'No description provided'}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              onClick={() => setSelectedOrg(null)}
            >
              Back to Organizations
            </Button>
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab icon={<SettingsIcon />} label="Settings" />
              <Tab icon={<PeopleIcon />} label={`Members (${members.length})`} />
            </Tabs>
          </Box>

          {tabValue === 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>Organization Settings</Typography>
              <Typography variant="body2" color="text.secondary">
                Organization settings panel coming soon...
              </Typography>
            </Box>
          )}

          {tabValue === 1 && (
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Team Members</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setInviteDialogOpen(true)}
                >
                  Invite Member
                </Button>
              </Box>

              {membersLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Member</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Last Login</TableCell>
                        <TableCell>Joined</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <Box>
                              <Typography variant="subtitle2">{member.full_name}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {member.email}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={member.role}
                              color={getRoleColor(member.role) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={member.is_active ? 'Active' : 'Inactive'}
                              color={member.is_active ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {member.last_login ? new Date(member.last_login).toLocaleDateString() : 'Never'}
                          </TableCell>
                          <TableCell>
                            {new Date(member.date_joined).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => handleEditMember(member)}
                              sx={{ mr: 1 }}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveMember(member)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Invite Member Dialog */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite Team Member</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Email Address"
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              fullWidth
              required
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="First Name"
                value={inviteForm.first_name}
                onChange={(e) => setInviteForm({ ...inviteForm, first_name: e.target.value })}
                fullWidth
              />
              <TextField
                label="Last Name"
                value={inviteForm.last_name}
                onChange={(e) => setInviteForm({ ...inviteForm, last_name: e.target.value })}
                fullWidth
              />
            </Box>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as 'admin' | 'editor' | 'viewer' })}
                label="Role"
              >
                <MenuItem value="viewer">Viewer</MenuItem>
                <MenuItem value="editor">Editor</MenuItem>
                <MenuItem value="admin">Administrator</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleInviteMember} variant="contained">Send Invitation</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={editMemberDialogOpen} onClose={() => setEditMemberDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Member</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={editMemberForm.role}
                onChange={(e) => setEditMemberForm({ ...editMemberForm, role: e.target.value as 'admin' | 'editor' | 'viewer' })}
                label="Role"
              >
                <MenuItem value="viewer">Viewer</MenuItem>
                <MenuItem value="editor">Editor</MenuItem>
                <MenuItem value="admin">Administrator</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={editMemberForm.is_active ? 'true' : 'false'}
                onChange={(e) => setEditMemberForm({ ...editMemberForm, is_active: e.target.value === 'true' })}
                label="Status"
              >
                <MenuItem value="true">Active</MenuItem>
                <MenuItem value="false">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditMemberDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateMember} variant="contained">Update Member</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Organizations;
