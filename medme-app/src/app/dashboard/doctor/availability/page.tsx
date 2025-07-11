'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
// Removed framer-motion for better performance - using CSS animations
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Clock, 
  Calendar, 
  Plus, 
  Trash2, 
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Copy
} from 'lucide-react';

interface TimeSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface AvailabilityTemplate {
  id: string;
  name: string;
  slots: Omit<TimeSlot, 'id'>[];
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  const time24 = `${hour.toString().padStart(2, '0')}:${minute}`;
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour < 12 ? 'AM' : 'PM';
  const time12 = `${hour12}:${minute} ${ampm}`;
  return { value: time24, label: time12 };
});

const AVAILABILITY_TEMPLATES: AvailabilityTemplate[] = [
  {
    id: 'weekdays-9-5',
    name: 'Weekdays 9 AM - 5 PM',
    slots: [1, 2, 3, 4, 5].map(day => ({
      dayOfWeek: day,
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: true
    }))
  },
  {
    id: 'weekdays-morning',
    name: 'Weekdays Morning (9 AM - 1 PM)',
    slots: [1, 2, 3, 4, 5].map(day => ({
      dayOfWeek: day,
      startTime: '09:00',
      endTime: '13:00',
      isAvailable: true
    }))
  },
  {
    id: 'weekdays-evening',
    name: 'Weekdays Evening (5 PM - 9 PM)',
    slots: [1, 2, 3, 4, 5].map(day => ({
      dayOfWeek: day,
      startTime: '17:00',
      endTime: '21:00',
      isAvailable: true
    }))
  },
  {
    id: 'weekend-only',
    name: 'Weekends Only (10 AM - 6 PM)',
    slots: [0, 6].map(day => ({
      dayOfWeek: day,
      startTime: '10:00',
      endTime: '18:00',
      isAvailable: true
    }))
  }
];

export default function DoctorAvailabilityPage() {
  const { user } = useUser();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    try {
      const response = await fetch('/api/doctors/availability');
      if (response.ok) {
        const data = await response.json();
        setTimeSlots(data.availability || []);
      } else {
        // Demo mode - set default availability
        setTimeSlots([]);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      setTimeSlots([]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addTimeSlot = () => {
    const newSlot: TimeSlot = {
      id: generateId(),
      dayOfWeek: 1, // Monday
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: true
    };
    setTimeSlots([...timeSlots, newSlot]);
    setHasChanges(true);
  };

  const updateTimeSlot = (id: string, updates: Partial<TimeSlot>) => {
    setTimeSlots(slots => slots.map(slot => 
      slot.id === id ? { ...slot, ...updates } : slot
    ));
    setHasChanges(true);
  };

  const removeTimeSlot = (id: string) => {
    setTimeSlots(slots => slots.filter(slot => slot.id !== id));
    setHasChanges(true);
  };

  const applyTemplate = (template: AvailabilityTemplate) => {
    const newSlots: TimeSlot[] = template.slots.map(slot => ({
      ...slot,
      id: generateId()
    }));
    setTimeSlots(newSlots);
    setHasChanges(true);
    toast.success(`Applied template: ${template.name}`);
  };

  const copyFromDay = (sourceDayOfWeek: number, targetDayOfWeek: number) => {
    const sourceSlots = timeSlots.filter(slot => slot.dayOfWeek === sourceDayOfWeek);
    const newSlots = sourceSlots.map(slot => ({
      ...slot,
      id: generateId(),
      dayOfWeek: targetDayOfWeek
    }));
    
    // Remove existing slots for target day
    const filteredSlots = timeSlots.filter(slot => slot.dayOfWeek !== targetDayOfWeek);
    setTimeSlots([...filteredSlots, ...newSlots]);
    setHasChanges(true);
    
    const sourceDay = DAYS_OF_WEEK.find(d => d.value === sourceDayOfWeek)?.label;
    const targetDay = DAYS_OF_WEEK.find(d => d.value === targetDayOfWeek)?.label;
    toast.success(`Copied availability from ${sourceDay} to ${targetDay}`);
  };

  const saveAvailability = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/doctors/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          availability: timeSlots.map(({ id, ...slot }) => slot)
        }),
      });

      if (response.ok) {
        setHasChanges(false);
        toast.success('Availability saved successfully!');
      } else {
        throw new Error('Failed to save availability');
      }
    } catch (error) {
      console.error('Error saving availability:', error);
      toast.error('Failed to save availability. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetChanges = () => {
    fetchAvailability();
    setHasChanges(false);
    toast.info('Changes reset');
  };

  const getSlotsByDay = (dayOfWeek: number) => {
    return timeSlots
      .filter(slot => slot.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const formatTime = (time24: string) => {
    const timeOption = TIME_OPTIONS.find(option => option.value === time24);
    return timeOption ? timeOption.label : time24;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-muted rounded"></div>
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
            <h1 className="text-3xl font-bold text-foreground">Availability Management</h1>
            <p className="text-muted-foreground">
              Set your consultation hours and manage your schedule
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {hasChanges && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                <AlertCircle className="w-3 h-3 mr-1" />
                Unsaved Changes
              </Badge>
            )}
            <Button
              variant="outline"
              onClick={resetChanges}
              disabled={!hasChanges || isSaving}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={saveAvailability}
              disabled={!hasChanges || isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Quick Templates */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Quick Templates</span>
            </CardTitle>
            <CardDescription>
              Apply common availability patterns to get started quickly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {AVAILABILITY_TEMPLATES.map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start space-y-2"
                  onClick={() => applyTemplate(template)}
                >
                  <span className="font-medium">{template.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {template.slots.length} time slot{template.slots.length !== 1 ? 's' : ''}
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Weekly Schedule */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Weekly Schedule</span>
              </div>
              <Button onClick={addTimeSlot} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Time Slot
              </Button>
            </CardTitle>
            <CardDescription>
              Configure your availability for each day of the week
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {DAYS_OF_WEEK.map((day) => {
              const daySlots = getSlotsByDay(day.value);
              return (
                <div key={day.value} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">{day.label}</h3>
                    <div className="flex items-center space-x-2">
                      {daySlots.length > 0 && (
                        <Select onValueChange={(targetDay) => copyFromDay(day.value, parseInt(targetDay))}>
                          <SelectTrigger className="w-40">
                            <Copy className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Copy to..." />
                          </SelectTrigger>
                          <SelectContent>
                            {DAYS_OF_WEEK.filter(d => d.value !== day.value).map((targetDay) => (
                              <SelectItem key={targetDay.value} value={targetDay.value.toString()}>
                                {targetDay.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                  
                  {daySlots.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No availability set for {day.label}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          const newSlot: TimeSlot = {
                            id: generateId(),
                            dayOfWeek: day.value,
                            startTime: '09:00',
                            endTime: '17:00',
                            isAvailable: true
                          };
                          setTimeSlots([...timeSlots, newSlot]);
                          setHasChanges(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Time Slot
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {daySlots.map((slot) => (
                        <div key={slot.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={slot.isAvailable}
                              onCheckedChange={(checked) => updateTimeSlot(slot.id, { isAvailable: checked })}
                            />
                            <Label className="text-sm">Available</Label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Select
                              value={slot.startTime}
                              onValueChange={(value) => updateTimeSlot(slot.id, { startTime: value })}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIME_OPTIONS.map((time) => (
                                  <SelectItem key={time.value} value={time.value}>
                                    {time.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            <span className="text-muted-foreground">to</span>
                            
                            <Select
                              value={slot.endTime}
                              onValueChange={(value) => updateTimeSlot(slot.id, { endTime: value })}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIME_OPTIONS.map((time) => (
                                  <SelectItem key={time.value} value={time.value}>
                                    {time.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex-1 text-sm text-muted-foreground">
                            {slot.isAvailable ? (
                              <span className="flex items-center">
                                <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                              </span>
                            ) : (
                              <span className="flex items-center">
                                <AlertCircle className="w-4 h-4 mr-1 text-amber-500" />
                                Blocked
                              </span>
                            )}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTimeSlot(slot.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
