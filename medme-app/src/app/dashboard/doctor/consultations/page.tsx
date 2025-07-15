'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
// Removed framer-motion for better performance - using CSS animations
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Video, 
  Search, 
  Calendar, 
  Clock, 
  User,
  Star,
  Play,
  Download,
  FileText,
  MessageSquare,
  Phone
} from 'lucide-react';

interface Consultation {
  id: string;
  patientName: string;
  patientId: string;
  date: string;
  duration: number;
  type: 'video' | 'audio' | 'chat';
  status: 'completed' | 'scheduled' | 'cancelled' | 'in-progress';
  rating: number | null;
  notes: string;
  recordingUrl?: string;
  prescription?: string;
  followUpRequired: boolean;
  amount: number;
}

export default function DoctorConsultationsPage() {
  const { user } = useUser();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');

  // Demo data for consultations
  const demoConsultations: Consultation[] = [
    {
      id: '1',
      patientName: 'John Doe',
      patientId: 'patient_1',
      date: '2024-01-10T14:00:00Z',
      duration: 30,
      type: 'video',
      status: 'completed',
      rating: 5,
      notes: 'Patient reported improvement in symptoms. Recommended continued medication.',
      recordingUrl: '/recordings/consultation_1.mp4',
      prescription: 'Amoxicillin 500mg, 3 times daily for 7 days',
      followUpRequired: true,
      amount: 150
    },
    {
      id: '2',
      patientName: 'Jane Smith',
      patientId: 'patient_2',
      date: '2024-01-11T10:30:00Z',
      duration: 25,
      type: 'video',
      status: 'completed',
      rating: 4,
      notes: 'Routine checkup. All vitals normal. Discussed lifestyle changes.',
      recordingUrl: '/recordings/consultation_2.mp4',
      followUpRequired: false,
      amount: 120
    },
    {
      id: '3',
      patientName: 'Mike Johnson',
      patientId: 'patient_3',
      date: '2024-01-12T16:00:00Z',
      duration: 0,
      type: 'video',
      status: 'scheduled',
      rating: null,
      notes: '',
      followUpRequired: false,
      amount: 150
    },
    {
      id: '4',
      patientName: 'Sarah Wilson',
      patientId: 'patient_4',
      date: '2024-01-09T11:00:00Z',
      duration: 20,
      type: 'audio',
      status: 'completed',
      rating: 5,
      notes: 'Quick follow-up call. Patient feeling much better.',
      followUpRequired: false,
      amount: 80
    },
    {
      id: '5',
      patientName: 'David Brown',
      patientId: 'patient_5',
      date: '2024-01-08T15:30:00Z',
      duration: 0,
      type: 'video',
      status: 'cancelled',
      rating: null,
      notes: 'Patient cancelled due to emergency.',
      followUpRequired: false,
      amount: 0
    }
  ];

  useEffect(() => {
    // Simulate API call
    const fetchConsultations = async () => {
      setLoading(true);
      // In a real app, this would be an API call
      setTimeout(() => {
        setConsultations(demoConsultations);
        setLoading(false);
      }, 1000);
    };

    fetchConsultations();
  }, []);

  const filteredConsultations = consultations.filter(consultation => {
    const matchesSearch = consultation.patientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || consultation.status === statusFilter;
    const matchesType = typeFilter === 'all' || consultation.type === typeFilter;
    const matchesTab = activeTab === 'all' || consultation.status === activeTab;
    return matchesSearch && matchesStatus && matchesType && matchesTab;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'audio':
        return <Phone className="h-4 w-4" />;
      case 'chat':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Video className="h-4 w-4" />;
    }
  };

  const getTabCounts = () => {
    return {
      all: consultations.length,
      completed: consultations.filter(c => c.status === 'completed').length,
      scheduled: consultations.filter(c => c.status === 'scheduled').length,
      cancelled: consultations.filter(c => c.status === 'cancelled').length
    };
  };

  const tabCounts = getTabCounts();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Consultations</h1>
            <p className="text-muted-foreground">
              Manage your video consultations and patient interactions
            </p>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            {filteredConsultations.length} consultation{filteredConsultations.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search consultations by patient name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="chat">Chat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Consultations Tabs */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="flex items-center gap-2">
              All ({tabCounts.all})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              Completed ({tabCounts.completed})
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="flex items-center gap-2">
              Scheduled ({tabCounts.scheduled})
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="flex items-center gap-2">
              Cancelled ({tabCounts.cancelled})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredConsultations.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="text-center py-12">
                  <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No consultations found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'You haven\'t conducted any consultations yet'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredConsultations.map((consultation, index) => (
                  <Card key={consultation.id} className="glass-card hover:shadow-lg transition-shadow animate-fade-in-up" style={{ animationDelay: `${0.3 + index * 0.1}s` }}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                            {getTypeIcon(consultation.type)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{consultation.patientName}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(consultation.date).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {new Date(consultation.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              {consultation.duration > 0 && (
                                <span>{consultation.duration} min</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {consultation.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm font-medium">{consultation.rating}</span>
                            </div>
                          )}
                          <Badge className={getStatusColor(consultation.status)}>
                            {consultation.status}
                          </Badge>
                          {consultation.amount > 0 && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              ${consultation.amount}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {consultation.notes && (
                        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground">{consultation.notes}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2">
                          {consultation.followUpRequired && (
                            <Badge variant="secondary">Follow-up Required</Badge>
                          )}
                          {consultation.prescription && (
                            <Badge variant="outline">Prescription Given</Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {consultation.recordingUrl && consultation.status === 'completed' && (
                            <Button variant="outline" size="sm">
                              <Play className="h-4 w-4 mr-1" />
                              Recording
                            </Button>
                          )}
                          {consultation.status === 'completed' && (
                            <Button variant="outline" size="sm">
                              <FileText className="h-4 w-4 mr-1" />
                              Notes
                            </Button>
                          )}
                          {consultation.status === 'scheduled' && (
                            <Button size="sm">
                              <Video className="h-4 w-4 mr-1" />
                              Join
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
