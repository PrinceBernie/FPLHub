import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { Alert, AlertDescription } from '../../ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/dialog';
import { useDebouncedSearch } from '../../../utils/debounce';
import { 
  Users, 
  Search, 
  Filter, 
  MoreHorizontal, 
  UserPlus, 
  UserX, 
  Shield, 
  Mail, 
  Phone,
  Calendar,
  Eye,
  Edit,
  Ban,
  CheckCircle,
  X,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  CheckSquare,
  Square
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../../services/api';

interface SystemUser {
  id: string;
  username: string;
  email: string;
  phone: string;
  adminLevel: 'USER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
  isVerified: boolean;
  isActive: boolean;
  isBanned: boolean;
  createdAt: string;
  lastLogin?: string;
  linkedTeams?: any[];
  leagueEntries?: any[];
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<SystemUser[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // Debounced search implementation
  const { searchValue, handleSearchChange } = useDebouncedSearch((query: string) => {
    // The search is handled by the filterUsers function
    // This just triggers the filtering when the debounced value changes
  }, 300);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchValue, statusFilter, roleFilter, sortBy, sortDirection]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const usersData = await apiClient.getAllUsers?.() || [];
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter (using debounced search value)
    if (searchValue) {
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(searchValue.toLowerCase()) ||
        user.email.toLowerCase().includes(searchValue.toLowerCase()) ||
        user.phone.includes(searchValue)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => {
        switch (statusFilter) {
          case 'active': return user.isActive && !user.isBanned;
          case 'banned': return user.isBanned;
          case 'inactive': return !user.isActive;
          case 'unverified': return !user.isVerified;
          default: return true;
        }
      });
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.adminLevel === roleFilter);
    }

    // Sorting
    if (sortBy) {
      filtered = filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortBy) {
          case 'username':
            aValue = a.username.toLowerCase();
            bValue = b.username.toLowerCase();
            break;
          case 'email':
            aValue = a.email.toLowerCase();
            bValue = b.email.toLowerCase();
            break;
          case 'phone':
            aValue = a.phone;
            bValue = b.phone;
            break;
          case 'role':
            aValue = a.adminLevel;
            bValue = b.adminLevel;
            break;
          case 'status':
            aValue = a.isActive ? (a.isBanned ? 'banned' : 'active') : 'inactive';
            bValue = b.isActive ? (b.isBanned ? 'banned' : 'active') : 'inactive';
            break;
          case 'joined':
            aValue = new Date(a.createdAt);
            bValue = new Date(b.createdAt);
            break;
          case 'lastLogin':
            aValue = a.lastLoginAt ? new Date(a.lastLoginAt) : new Date(0);
            bValue = b.lastLoginAt ? new Date(b.lastLoginAt) : new Date(0);
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredUsers(filtered);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="w-4 h-4 text-muted-foreground" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-primary" />
      : <ArrowDown className="w-4 h-4 text-primary" />;
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(user => user.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) {
      toast.error('Please select users to delete');
      return;
    }

    try {
      setBulkDeleteLoading(true);
      
      // Delete users one by one (in a real app, you'd have a bulk delete API)
      const deletePromises = Array.from(selectedUsers).map(userId => 
        apiClient.deleteUser?.(userId) || Promise.resolve()
      );
      
      await Promise.all(deletePromises);
      
      toast.success(`Successfully deleted ${selectedUsers.size} user(s)`);
      setSelectedUsers(new Set());
      setShowDeleteModal(false);
      loadUsers(); // Reload the user list
      
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      toast.error('Failed to delete users: ' + (error.message || 'Unknown error'));
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const handleUserAction = async (userId: string, action: string, data?: any) => {
    try {
      setActionLoading(userId);
      
      switch (action) {
        case 'ban':
          await apiClient.banUser?.(userId, data?.reason || 'Violation of terms');
          toast.success('User banned successfully');
          break;
        case 'unban':
          await apiClient.unbanUser?.(userId);
          toast.success('User unbanned successfully');
          break;
        case 'verify':
          await apiClient.verifyUser?.(userId);
          toast.success('User verified successfully');
          break;
        case 'updateRole':
          await apiClient.updateUserRole?.(userId, data.role);
          toast.success('User role updated successfully');
          break;
        case 'resetPassword':
          await apiClient.resetUserPassword?.(userId);
          toast.success('Password reset email sent');
          break;
        case 'delete':
          await apiClient.deleteUser?.(userId);
          toast.success('User deleted successfully');
          break;
      }
      
      await loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (user: SystemUser) => {
    if (user.isBanned) {
      return <Badge className="bg-red-100 text-red-800">Banned</Badge>;
    }
    if (!user.isActive) {
      return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
    }
    if (!user.isVerified) {
      return <Badge className="bg-yellow-100 text-yellow-800">Unverified</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">Active</Badge>;
  };

  const getRoleBadge = (adminLevel: string) => {
    const colors = {
      'SUPER_ADMIN': 'bg-red-100 text-red-800',
      'ADMIN': 'bg-blue-100 text-blue-800',
      'MODERATOR': 'bg-purple-100 text-purple-800',
      'USER': 'bg-gray-100 text-gray-800'
    };
    return (
      <Badge className={colors[adminLevel as keyof typeof colors] || colors.USER}>
        {adminLevel.replace('_', ' ')}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            User Management
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage users, permissions, and account status
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700">
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-lg font-semibold">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-lg font-semibold">{users.filter(u => u.isActive && !u.isBanned).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Unverified</p>
                <p className="text-lg font-semibold">{users.filter(u => !u.isVerified).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <X className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Banned Users</p>
                <p className="text-lg font-semibold">{users.filter(u => u.isBanned).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by username, email, or phone..."
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-9 w-full"
              />
            </div>
            <div className="flex-1">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="banned">Banned</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MODERATOR">Moderator</SelectItem>
                  <SelectItem value="USER">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedUsers.size > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  className="h-8"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUsers(new Set())}
                className="h-8"
              >
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <button
                      onClick={handleSelectAll}
                      className="flex items-center justify-center w-6 h-6 rounded border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                    >
                      {selectedUsers.size === filteredUsers.length && filteredUsers.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-accent/50 select-none"
                    onClick={() => handleSort('username')}
                  >
                    <div className="flex items-center space-x-2">
                      <span>User</span>
                      {getSortIcon('username')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-accent/50 select-none"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center space-x-2">
                      <span>Contact</span>
                      {getSortIcon('email')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-accent/50 select-none"
                    onClick={() => handleSort('role')}
                  >
                    <div className="flex items-center space-x-2">
                      <span>Role</span>
                      {getSortIcon('role')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-accent/50 select-none"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center space-x-2">
                      <span>Status</span>
                      {getSortIcon('status')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-accent/50 select-none"
                    onClick={() => handleSort('joined')}
                  >
                    <div className="flex items-center space-x-2">
                      <span>Joined</span>
                      {getSortIcon('joined')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-accent/50 select-none"
                    onClick={() => handleSort('lastLogin')}
                  >
                    <div className="flex items-center space-x-2">
                      <span>Last Login</span>
                      {getSortIcon('lastLogin')}
                    </div>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <button
                        onClick={() => handleSelectUser(user.id)}
                        className="flex items-center justify-center w-6 h-6 rounded border border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                      >
                        {selectedUsers.has(user.id) ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>
                            {user.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-sm text-muted-foreground">ID: {user.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">{user.phone}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(user.adminLevel)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(user)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserModal(true);
                          }}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowBanModal(true);
                          }}
                          disabled={actionLoading === user.id}
                        >
                          {user.isBanned ? <CheckCircle className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                        </Button>
                        <Select onValueChange={(value) => handleUserAction(user.id, 'updateRole', { role: value })}>
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue placeholder="Role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USER">User</SelectItem>
                            <SelectItem value="MODERATOR">Moderator</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
          onAction={handleUserAction}
        />
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadUsers();
          }}
        />
      )}

      {/* Ban/Unban Modal */}
      {showBanModal && selectedUser && (
        <BanUserModal
          user={selectedUser}
          onClose={() => {
            setShowBanModal(false);
            setSelectedUser(null);
          }}
          onAction={handleUserAction}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">Delete Users</h2>
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                Are you sure you want to delete {selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''}?
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                This action cannot be undone. All user data will be permanently removed.
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={bulkDeleteLoading}
                className="flex-1"
              >
                {bulkDeleteLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete {selectedUsers.size} User{selectedUsers.size !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteModal(false)}
                disabled={bulkDeleteLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// User Detail Modal Component
const UserDetailModal: React.FC<{
  user: SystemUser;
  onClose: () => void;
  onAction: (userId: string, action: string, data?: any) => void;
}> = ({ user, onClose, onAction }) => {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="clean-card max-w-md border-primary/20">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold">{user.username}</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">{user.email}</DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="clean-card-sm bg-primary/5 border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">Phone</p>
              <p className="font-bold text-primary">{user.phone}</p>
            </div>
            <div className="clean-card-sm bg-muted/10">
              <p className="text-xs text-muted-foreground mb-1">Role</p>
              <p className="font-bold">{user.adminLevel}</p>
            </div>
          </div>

          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Status: {user.isBanned ? 'Banned' : user.isActive ? 'Active' : 'Inactive'}</span>
            <span>Verified: {user.isVerified ? 'Yes' : 'No'}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose} 
              size="sm"
              className="flex-1"
            >
              Close
            </Button>
            <Button 
              onClick={() => onAction(user.id, 'verify')}
              disabled={user.isVerified}
              size="sm"
              className="flex-1 bg-success hover:bg-success/90"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Verify
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Create User Modal Component
const CreateUserModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    adminLevel: 'USER'
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await apiClient.createUser?.(formData);
      toast.success('User created successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="clean-card max-w-md border-primary/20">
        <DialogHeader className="pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                <UserPlus className="w-4 h-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold">Create New User</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">Add a new user to the system</DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-xs font-medium">Username</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-xs font-medium">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-medium">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              className="h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role" className="text-xs font-medium">Role</Label>
            <Select value={formData.adminLevel} onValueChange={(value) => setFormData({ ...formData, adminLevel: value })}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="MODERATOR">Moderator</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              size="sm"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              size="sm"
              className="flex-1 bg-success hover:bg-success/90"
            >
              {isLoading ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="w-3 h-3 mr-1" />
                  Create User
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Ban User Modal Component
const BanUserModal: React.FC<{
  user: SystemUser;
  onClose: () => void;
  onAction: (userId: string, action: string, data?: any) => void;
}> = ({ user, onClose, onAction }) => {
  const [reason, setReason] = useState('');

  const handleAction = () => {
    const action = user.isBanned ? 'unban' : 'ban';
    onAction(user.id, action, { reason });
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="clean-card max-w-md border-primary/20">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg border ${user.isBanned ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'}`}>
                {user.isBanned ? (
                  <CheckCircle className="w-4 h-4 text-success" />
                ) : (
                  <Ban className="w-4 h-4 text-destructive" />
                )}
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold">
                  {user.isBanned ? 'Unban User' : 'Ban User'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {user.isBanned ? 'Restore user access' : 'Restrict user access'}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="clean-card-sm bg-muted/10">
            <p className="text-xs text-muted-foreground mb-1">User</p>
            <p className="font-bold">{user.username}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>

          <p className="text-sm text-muted-foreground">
            Are you sure you want to {user.isBanned ? 'unban' : 'ban'} this user?
          </p>
          
          {!user.isBanned && (
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-xs font-medium">Reason (optional)</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for ban..."
                className="h-9"
              />
            </div>
          )}
          
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              size="sm"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAction}
              size="sm"
              className={`flex-1 ${user.isBanned ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'}`}
            >
              {user.isBanned ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Unban User
                </>
              ) : (
                <>
                  <Ban className="w-3 h-3 mr-1" />
                  Ban User
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserManagement;
