'use client';

import { useEffect, useState } from 'react';
// Removed framer-motion for better performance - using CSS animations
import { 
  Users, 
  User, 
  Shield, 
  Ban, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  Search,
  Filter,
  Calendar,
  Mail,
  Phone,
  CreditCard,
  Activity,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UserAccount {
  _id: string;
  clerkId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  phoneNumber?: string;
  dateOfBirth?: string;
  profileImage?: string;
  createdAt: string;
  lastLogin?: string;
  // Role-specific data
  patientData?: {
    creditBalance: number;
    subscriptionPlan: string;
    subscriptionStatus: string;
    totalAppointments: number;
    totalSpent: number;
  };
  doctorData?: {
    specialty: string;
    verificationStatus: string;
    licenseNumber: string;
    totalEarnings: number;
    totalConsultations: number;
    averageRating: number;
  };
}

// Helper functions
const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800';
    case 'inactive': return 'bg-gray-100 text-gray-800';
    case 'suspended': return 'bg-red-100 text-red-800';
    case 'pending_verification': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active': return CheckCircle;
    case 'inactive': return XCircle;
    case 'suspended': return Ban;
    case 'pending_verification': return Clock;
    default: return AlertTriangle;
  }
};

const getRoleColor = (role: string) => {
  switch (role) {
    case 'patient': return 'bg-blue-100 text-blue-800';
    case 'doctor': return 'bg-purple-100 text-purple-800';
    case 'admin': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        // Demo data fallback
        setUsers([
          {
            _id: '1',
            clerkId: 'clerk_patient_123',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@email.com',
            role: 'patient',
            status: 'active',
            phoneNumber: '+1234567890',
            dateOfBirth: '1985-06-15',
            createdAt: '2025-07-01T10:30:00Z',
            lastLogin: '2025-07-11T08:45:00Z',
            patientData: {
              creditBalance: 15,
              subscriptionPlan: 'premium',
              subscriptionStatus: 'active',
              totalAppointments: 12,
              totalSpent: 240
            }
          },
          {
            _id: '2',
            clerkId: 'clerk_doctor_456',
            firstName: 'Dr. Sarah',
            lastName: 'Johnson',
            email: 'sarah.johnson@email.com',
            role: 'doctor',
            status: 'active',
            phoneNumber: '+1987654321',
            createdAt: '2025-06-15T14:20:00Z',
            lastLogin: '2025-07-11T09:15:00Z',
            doctorData: {
              specialty: 'Cardiology',
              verificationStatus: 'approved',
              licenseNumber: 'MD123456',
              totalEarnings: 1250,
              totalConsultations: 45,
              averageRating: 4.8
            }
          },
          {
            _id: '3',
            clerkId: 'clerk_patient_789',
            firstName: 'Emily',
            lastName: 'Rodriguez',
            email: 'emily.rodriguez@email.com',
            role: 'patient',
            status: 'suspended',
            phoneNumber: '+1555123456',
            dateOfBirth: '1992-03-22',
            createdAt: '2025-06-20T16:45:00Z',
            lastLogin: '2025-07-08T12:30:00Z',
            patientData: {
              creditBalance: 0,
              subscriptionPlan: 'free',
              subscriptionStatus: 'inactive',
              totalAppointments: 3,
              totalSpent: 60
            }
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (userId: string, newStatus: string, reason?: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus, reason }),
      });

      if (response.ok) {
        // Update local state
        setUsers(prev => 
          prev.map(user => 
            user._id === userId 
              ? { ...user, status: newStatus as any }
              : user
          )
        );
        
        // Close modal if open
        setSelectedUser(null);
      } else {
        console.error('Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.clerkId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.status === 'active').length;
  const suspendedUsers = users.filter(user => user.status === 'suspended').length;
  const patientCount = users.filter(user => user.role === 'patient').length;
  const doctorCount = users.filter(user => user.role === 'doctor').length;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage all user accounts and resolve issues
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-sm">
              {totalUsers} Total Users
            </Badge>
            {suspendedUsers > 0 && (
              <Badge variant="destructive" className="text-sm">
                {suspendedUsers} Suspended
              </Badge>
            )}
          </div>
        </div>
      </motion.div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                All registered accounts
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeUsers}</div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Patients</CardTitle>
              <User className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{patientCount}</div>
              <p className="text-xs text-muted-foreground">
                Patient accounts
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Doctors</CardTitle>
              <Shield className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{doctorCount}</div>
              <p className="text-xs text-muted-foreground">
                Doctor accounts
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suspended</CardTitle>
              <Ban className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{suspendedUsers}</div>
              <p className="text-xs text-muted-foreground">
                Suspended accounts
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Filter Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or Clerk ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="patient">Patients</SelectItem>
                  <SelectItem value="doctor">Doctors</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="pending_verification">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Users List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">User Accounts</CardTitle>
            <CardDescription>
              {filteredUsers.length} users found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All ({totalUsers})</TabsTrigger>
                <TabsTrigger value="active">Active ({activeUsers})</TabsTrigger>
                <TabsTrigger value="patients">Patients ({patientCount})</TabsTrigger>
                <TabsTrigger value="doctors">Doctors ({doctorCount})</TabsTrigger>
                <TabsTrigger value="suspended">Suspended ({suspendedUsers})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4 mt-6">
                {filteredUsers.map((user) => (
                  <UserCard
                    key={user._id}
                    user={user}
                    onStatusUpdate={handleStatusUpdate}
                    onViewDetails={setSelectedUser}
                  />
                ))}
              </TabsContent>

              <TabsContent value="active" className="space-y-4 mt-6">
                {filteredUsers
                  .filter(user => user.status === 'active')
                  .map((user) => (
                    <UserCard
                      key={user._id}
                      user={user}
                      onStatusUpdate={handleStatusUpdate}
                      onViewDetails={setSelectedUser}
                    />
                  ))}
              </TabsContent>

              <TabsContent value="patients" className="space-y-4 mt-6">
                {filteredUsers
                  .filter(user => user.role === 'patient')
                  .map((user) => (
                    <UserCard
                      key={user._id}
                      user={user}
                      onStatusUpdate={handleStatusUpdate}
                      onViewDetails={setSelectedUser}
                    />
                  ))}
              </TabsContent>

              <TabsContent value="doctors" className="space-y-4 mt-6">
                {filteredUsers
                  .filter(user => user.role === 'doctor')
                  .map((user) => (
                    <UserCard
                      key={user._id}
                      user={user}
                      onStatusUpdate={handleStatusUpdate}
                      onViewDetails={setSelectedUser}
                    />
                  ))}
              </TabsContent>

              <TabsContent value="suspended" className="space-y-4 mt-6">
                {filteredUsers
                  .filter(user => user.status === 'suspended')
                  .map((user) => (
                    <UserCard
                      key={user._id}
                      user={user}
                      onStatusUpdate={handleStatusUpdate}
                      onViewDetails={setSelectedUser}
                    />
                  ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

      {/* User Detail Modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
}

// User Card Component
interface UserCardProps {
  user: UserAccount;
  onStatusUpdate: (id: string, status: string, reason?: string) => void;
  onViewDetails: (user: UserAccount) => void;
}

function UserCard({ user, onStatusUpdate, onViewDetails }: UserCardProps) {
  const StatusIcon = getStatusIcon(user.status);

  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            {user.profileImage ? (
              <img
                src={user.profileImage}
                alt={`${user.firstName} ${user.lastName}`}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <User className="h-6 w-6 text-primary" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-lg">
              {user.firstName} {user.lastName}
            </h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="flex items-center space-x-4 mt-1">
              <Badge className={getRoleColor(user.role)}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Joined: {new Date(user.createdAt).toLocaleDateString()}
              </span>
              {user.lastLogin && (
                <span className="text-sm text-muted-foreground">
                  Last login: {new Date(user.lastLogin).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Badge className={getStatusColor(user.status)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {user.status.replace('_', ' ').charAt(0).toUpperCase() + user.status.replace('_', ' ').slice(1)}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(user)}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>

          {user.status !== 'suspended' && user.role !== 'admin' && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-600 hover:bg-red-50"
              onClick={() => onStatusUpdate(user._id, 'suspended')}
            >
              <Ban className="h-4 w-4 mr-1" />
              Suspend
            </Button>
          )}

          {user.status === 'suspended' && (
            <Button
              variant="outline"
              size="sm"
              className="text-green-600 border-green-600 hover:bg-green-50"
              onClick={() => onStatusUpdate(user._id, 'active')}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Reactivate
            </Button>
          )}
        </div>
      </div>

      {/* Role-specific information */}
      {user.patientData && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Credits:</span> {user.patientData.creditBalance}
            </div>
            <div>
              <span className="font-medium">Plan:</span> {user.patientData.subscriptionPlan}
            </div>
            <div>
              <span className="font-medium">Appointments:</span> {user.patientData.totalAppointments}
            </div>
            <div>
              <span className="font-medium">Total Spent:</span> ${user.patientData.totalSpent}
            </div>
          </div>
        </div>
      )}

      {user.doctorData && (
        <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Specialty:</span> {user.doctorData.specialty}
            </div>
            <div>
              <span className="font-medium">License:</span> {user.doctorData.licenseNumber}
            </div>
            <div>
              <span className="font-medium">Consultations:</span> {user.doctorData.totalConsultations}
            </div>
            <div>
              <span className="font-medium">Rating:</span> {user.doctorData.averageRating}/5
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// User Detail Modal Component
interface UserDetailModalProps {
  user: UserAccount;
  onClose: () => void;
  onStatusUpdate: (id: string, status: string, reason?: string) => void;
}

function UserDetailModal({ user, onClose, onStatusUpdate }: UserDetailModalProps) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              {user.firstName} {user.lastName} - Account Details
            </h2>
            <Button variant="outline" onClick={onClose}>
              ×
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Role</label>
                <p>
                  <Badge className={getRoleColor(user.role)}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <p>
                  <Badge className={getStatusColor(user.status)}>
                    {user.status.replace('_', ' ').charAt(0).toUpperCase() + user.status.replace('_', ' ').slice(1)}
                  </Badge>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                <p className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span>{user.phoneNumber || 'Not provided'}</span>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                <p className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>{user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'Not provided'}</span>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Clerk ID</label>
                <p className="text-sm font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                  {user.clerkId}
                </p>
              </div>
            </div>
          </div>

          {/* Account Activity */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Account Activity</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account Created</label>
                <p className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Login</label>
                <p className="flex items-center space-x-2">
                  <Activity className="h-4 w-4" />
                  <span>{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Patient-specific Information */}
          {user.patientData && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Patient Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Credit Balance</label>
                  <p className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4" />
                    <span>{user.patientData.creditBalance} credits</span>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Subscription Plan</label>
                  <p>
                    <Badge variant="outline">
                      {user.patientData.subscriptionPlan}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Subscription Status</label>
                  <p>
                    <Badge variant={user.patientData.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                      {user.patientData.subscriptionStatus}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Appointments</label>
                  <p>{user.patientData.totalAppointments}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Spent</label>
                  <p>${user.patientData.totalSpent}</p>
                </div>
              </div>
            </div>
          )}

          {/* Doctor-specific Information */}
          {user.doctorData && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Doctor Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Specialty</label>
                  <p>{user.doctorData.specialty}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Verification Status</label>
                  <p>
                    <Badge variant={user.doctorData.verificationStatus === 'approved' ? 'default' : 'secondary'}>
                      {user.doctorData.verificationStatus}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">License Number</label>
                  <p className="text-sm font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    {user.doctorData.licenseNumber}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Consultations</label>
                  <p>{user.doctorData.totalConsultations}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Earnings</label>
                  <p>${user.doctorData.totalEarnings}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Average Rating</label>
                  <p>{user.doctorData.averageRating}/5.0</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {user.role !== 'admin' && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-3">Account Actions</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Reason (optional)</label>
                  <Input
                    placeholder="Enter reason for status change..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex space-x-3">
                  {user.status !== 'active' && (
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        onStatusUpdate(user._id, 'active', reason);
                        onClose();
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Activate Account
                    </Button>
                  )}

                  {user.status !== 'suspended' && (
                    <Button
                      variant="destructive"
                      onClick={() => {
                        onStatusUpdate(user._id, 'suspended', reason);
                        onClose();
                      }}
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Suspend Account
                    </Button>
                  )}

                  {user.status !== 'inactive' && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        onStatusUpdate(user._id, 'inactive', reason);
                        onClose();
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Deactivate Account
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
