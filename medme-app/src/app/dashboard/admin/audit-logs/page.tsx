'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Filter, Download, Search, AlertTriangle, Info, Shield, Activity } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  _id: string;
  action: string;
  category: string;
  severity: string;
  description: string;
  clerkId?: string;
  targetResourceId?: string;
  targetResourceType?: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    endpoint?: string;
    method?: string;
    previousValue?: any;
    newValue?: any;
    errorMessage?: string;
    additionalData?: Record<string, any>;
  };
  timestamp: string;
}

interface AuditLogStats {
  total: number;
  categories: Record<string, number>;
  severities: Record<string, number>;
  actions: Record<string, number>;
}

interface FilterOptions {
  actions: string[];
  categories: string[];
  severities: string[];
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    category: '',
    severity: '',
    action: '',
    clerkId: '',
    targetResourceType: '',
    startDate: '',
    endDate: '',
    search: '',
  });

  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    fetchFilterOptions();
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    fetchAuditLogs();
  }, [filters, currentPage]);

  const fetchFilterOptions = async () => {
    try {
      const response = await fetch('/api/admin/audit-logs', { method: 'OPTIONS' });
      if (response.ok) {
        const options = await response.json();
        setFilterOptions(options);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.category) params.append('category', filters.category);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.action) params.append('action', filters.action);
      if (filters.clerkId) params.append('clerkId', filters.clerkId);
      if (filters.targetResourceType) params.append('targetResourceType', filters.targetResourceType);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      
      params.append('limit', pageSize.toString());
      params.append('skip', (currentPage * pageSize).toString());

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        let filteredLogs = data.logs;
        
        // Client-side search filter
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          filteredLogs = filteredLogs.filter((log: AuditLog) =>
            log.description.toLowerCase().includes(searchTerm) ||
            log.action.toLowerCase().includes(searchTerm) ||
            log.category.toLowerCase().includes(searchTerm) ||
            (log.clerkId && log.clerkId.toLowerCase().includes(searchTerm))
          );
        }
        
        setLogs(filteredLogs);
        setStats(data.stats);
      } else {
        console.error('Failed to fetch audit logs');
        // Fallback to demo data
        setLogs([]);
        setStats({ total: 0, categories: {}, severities: {}, actions: {} });
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setLogs([]);
      setStats({ total: 0, categories: {}, severities: {}, actions: {} });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'security': return <Shield className="h-4 w-4" />;
      case 'admin': return <AlertTriangle className="h-4 w-4" />;
      case 'authentication': return <Shield className="h-4 w-4" />;
      case 'payment': return <Activity className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const resetFilters = () => {
    setFilters({
      category: '',
      severity: '',
      action: '',
      clerkId: '',
      targetResourceType: '',
      startDate: '',
      endDate: '',
      search: '',
    });
    setCurrentPage(0);
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Category', 'Severity', 'Action', 'Description', 'User ID', 'Resource Type', 'Resource ID'].join(','),
      ...logs.map(log => [
        log.timestamp,
        log.category,
        log.severity,
        log.action,
        `"${log.description.replace(/"/g, '""')}"`,
        log.clerkId || '',
        log.targetResourceType || '',
        log.targetResourceId || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600 mt-2">Monitor system activities and security events</p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={exportLogs} variant="outline" className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Critical Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.severities.critical || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Security Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.categories.security || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Admin Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.categories.admin || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search logs..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  {filterOptions?.categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Severity</label>
              <Select value={filters.severity} onValueChange={(value) => setFilters(prev => ({ ...prev, severity: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All severities</SelectItem>
                  {filterOptions?.severities.map(severity => (
                    <SelectItem key={severity} value={severity}>{severity}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">User ID</label>
              <Input
                placeholder="Clerk ID"
                value={filters.clerkId}
                onChange={(e) => setFilters(prev => ({ ...prev, clerkId: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button onClick={resetFilters} variant="outline">
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Events</CardTitle>
          <CardDescription>
            {loading ? 'Loading...' : `Showing ${logs.length} events`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No audit logs found matching your criteria.
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log._id}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getCategoryIcon(log.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge className={getSeverityColor(log.severity)}>
                            {log.severity}
                          </Badge>
                          <Badge variant="outline">{log.category}</Badge>
                          <span className="text-sm text-gray-500">{log.action}</span>
                        </div>
                        <p className="text-sm text-gray-900 mb-1">{log.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}</span>
                          {log.clerkId && <span>User: {log.clerkId}</span>}
                          {log.targetResourceType && (
                            <span>Resource: {log.targetResourceType}</span>
                          )}
                          {log.metadata?.ipAddress && (
                            <span>IP: {log.metadata.ipAddress}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {logs.length === pageSize && (
            <div className="flex justify-center mt-6">
              <div className="flex space-x-2">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  variant="outline"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
