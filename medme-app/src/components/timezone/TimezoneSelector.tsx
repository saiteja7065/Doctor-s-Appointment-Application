'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Globe,
  Clock,
  MapPin,
  Search,
  Check,
  ChevronDown,
  Zap,
  AlertCircle,
  Info
} from 'lucide-react';
import { getCommonTimezones, getTimezoneOffset, getTimezoneAbbreviation } from '@/lib/timezone';

interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
  region: string;
  city: string;
  country: string;
}

interface TimezoneSelectorProps {
  value?: string;
  onChange: (timezone: string) => void;
  showAutoDetect?: boolean;
  showCurrentTime?: boolean;
  showOffset?: boolean;
  placeholder?: string;
  className?: string;
}

export default function TimezoneSelector({
  value,
  onChange,
  showAutoDetect = true,
  showCurrentTime = true,
  showOffset = true,
  placeholder = "Select timezone...",
  className = ""
}: TimezoneSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [detectedTimezone, setDetectedTimezone] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isDetecting, setIsDetecting] = useState(false);

  // Enhanced timezone list with regions and cities
  const timezoneOptions = useMemo(() => {
    const commonTimezones = getCommonTimezones();
    
    return commonTimezones.map(tz => {
      const parts = tz.value.split('/');
      const region = parts[0] || '';
      const city = parts[1]?.replace(/_/g, ' ') || '';
      const country = getCountryFromTimezone(tz.value);
      
      return {
        value: tz.value,
        label: `${city}, ${country}`,
        offset: tz.offset,
        region,
        city,
        country
      };
    }).sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  // Filter timezones based on search
  const filteredTimezones = useMemo(() => {
    if (!searchValue) return timezoneOptions;
    
    const search = searchValue.toLowerCase();
    return timezoneOptions.filter(tz => 
      tz.label.toLowerCase().includes(search) ||
      tz.city.toLowerCase().includes(search) ||
      tz.country.toLowerCase().includes(search) ||
      tz.region.toLowerCase().includes(search) ||
      tz.offset.toLowerCase().includes(search)
    );
  }, [timezoneOptions, searchValue]);

  // Group timezones by region
  const groupedTimezones = useMemo(() => {
    const groups: { [key: string]: TimezoneOption[] } = {};
    
    filteredTimezones.forEach(tz => {
      const region = tz.region || 'Other';
      if (!groups[region]) {
        groups[region] = [];
      }
      groups[region].push(tz);
    });
    
    return groups;
  }, [filteredTimezones]);

  useEffect(() => {
    // Auto-detect user's timezone
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setDetectedTimezone(detected);
    } catch (error) {
      console.error('Error detecting timezone:', error);
      setDetectedTimezone('UTC');
    }
  }, []);

  useEffect(() => {
    // Update current time for selected timezone
    if (value) {
      updateCurrentTime();
      const interval = setInterval(updateCurrentTime, 1000);
      return () => clearInterval(interval);
    }
  }, [value]);

  const updateCurrentTime = () => {
    if (!value) return;
    
    try {
      const now = new Date();
      const timeString = new Intl.DateTimeFormat('en-US', {
        timeZone: value,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).format(now);
      
      setCurrentTime(timeString);
    } catch (error) {
      console.error('Error updating current time:', error);
      setCurrentTime('');
    }
  };

  const handleAutoDetect = async () => {
    setIsDetecting(true);
    
    try {
      // Enhanced detection using multiple methods
      let detectedTz = detectedTimezone;
      
      // Try to get more accurate timezone using geolocation
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              enableHighAccuracy: false
            });
          });
          
          // Use a timezone API service (in production, you'd use a real service)
          // For now, we'll use the browser's detected timezone
          detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch (geoError) {
          console.log('Geolocation not available, using browser timezone');
        }
      }
      
      onChange(detectedTz);
      setOpen(false);
    } catch (error) {
      console.error('Error auto-detecting timezone:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  const getCountryFromTimezone = (timezone: string): string => {
    // Simple mapping for common timezones
    const countryMap: { [key: string]: string } = {
      'America/New_York': 'United States',
      'America/Los_Angeles': 'United States',
      'America/Chicago': 'United States',
      'America/Denver': 'United States',
      'America/Toronto': 'Canada',
      'America/Vancouver': 'Canada',
      'Europe/London': 'United Kingdom',
      'Europe/Paris': 'France',
      'Europe/Berlin': 'Germany',
      'Europe/Rome': 'Italy',
      'Europe/Madrid': 'Spain',
      'Asia/Tokyo': 'Japan',
      'Asia/Shanghai': 'China',
      'Asia/Kolkata': 'India',
      'Asia/Dubai': 'UAE',
      'Australia/Sydney': 'Australia',
      'Australia/Melbourne': 'Australia',
      'Pacific/Auckland': 'New Zealand'
    };
    
    return countryMap[timezone] || timezone.split('/')[0];
  };

  const selectedTimezone = timezoneOptions.find(tz => tz.value === value);

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <Label>Timezone</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {selectedTimezone ? (
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4" />
                  <span>{selectedTimezone.label}</span>
                  {showOffset && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedTimezone.offset}
                    </Badge>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <CommandInput
                  placeholder="Search timezones..."
                  value={searchValue}
                  onValueChange={setSearchValue}
                />
              </div>
              
              {showAutoDetect && (
                <div className="p-2 border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAutoDetect}
                    disabled={isDetecting}
                    className="w-full justify-start"
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    {isDetecting ? 'Detecting...' : 'Auto-detect my timezone'}
                  </Button>
                  {detectedTimezone && (
                    <p className="text-xs text-muted-foreground mt-1 px-2">
                      Detected: {detectedTimezone}
                    </p>
                  )}
                </div>
              )}
              
              <CommandEmpty>No timezone found.</CommandEmpty>
              
              <div className="max-h-64 overflow-y-auto">
                {Object.entries(groupedTimezones).map(([region, timezones]) => (
                  <CommandGroup key={region} heading={region}>
                    {timezones.map((timezone) => (
                      <CommandItem
                        key={timezone.value}
                        value={timezone.value}
                        onSelect={() => {
                          onChange(timezone.value);
                          setOpen(false);
                        }}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-2">
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                value === timezone.value ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            <div>
                              <div className="font-medium">{timezone.city}</div>
                              <div className="text-xs text-muted-foreground">
                                {timezone.country}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {timezone.offset}
                          </Badge>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </div>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Current Time Display */}
      {showCurrentTime && value && currentTime && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Current time</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-lg font-semibold">{currentTime}</span>
                  <Badge variant="outline" className="text-xs">
                    {getTimezoneAbbreviation(value)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Timezone Info */}
      {value && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
            <div className="flex items-start space-x-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Timezone Information
                </p>
                <p className="text-blue-800 dark:text-blue-200 mt-1">
                  All appointment times will be displayed in your selected timezone.
                  Doctors will see times in their own timezone.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
