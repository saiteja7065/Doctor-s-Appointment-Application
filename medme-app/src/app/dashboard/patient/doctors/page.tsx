'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useUser } from '@clerk/nextjs';
// Removed framer-motion for better performance - using CSS animations
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  Search,
  Star,
  Clock,
  Filter,
  Stethoscope,
  Calendar,
  Video,
  User,
  ChevronDown,
  ChevronUp,
  MapPin,
  Languages,
  Award,
  TrendingUp,
  X,
  Loader2,
  SortAsc,
  SortDesc,
  Grid,
  List
} from 'lucide-react';

interface Doctor {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  specialty: string;
  formattedSpecialty: string;
  rating: number;
  totalRatings: number;
  experience: number;
  consultationFee: number;
  totalConsultations: number;
  bio?: string;
  languages: string[];
  isOnline: boolean;
  nextAvailableSlot?: string;
  profileImage?: string;
  verificationStatus: string;
  education: Array<{
    degree: string;
    institution: string;
    graduationYear: number;
  }>;
  certifications: Array<{
    name: string;
    issuingOrganization: string;
  }>;
}

interface FilterOptions {
  specialties: Array<{ value: string; label: string }>;
  languages: string[];
  feeRange: { min: number; max: number; average: number };
  experienceRange: { min: number; max: number; average: number };
  sortOptions: Array<{ value: string; label: string }>;
}

interface SearchFilters {
  search: string;
  specialty: string;
  minRating: number;
  maxFee: number;
  languages: string[];
  experience: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export default function FindDoctorsPage() {
  const { user, isLoaded } = useUser();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter states
  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    specialty: '',
    minRating: 0,
    maxFee: 10,
    languages: [],
    experience: 0,
    sortBy: 'rating',
    sortOrder: 'desc',
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  // Debounced search
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null);

  // Fetch doctors with current filters
  const fetchDoctors = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      });

      if (filters.search) params.append('search', filters.search);
      if (filters.specialty) params.append('specialty', filters.specialty);
      if (filters.minRating > 0) params.append('minRating', filters.minRating.toString());
      if (filters.maxFee < 10) params.append('maxFee', filters.maxFee.toString());
      if (filters.experience > 0) params.append('experience', filters.experience.toString());
      if (filters.languages.length > 0) params.append('languages', filters.languages.join(','));

      const response = await fetch(`/api/doctors/search?${params}`);
      const data = await response.json();

      if (response.ok) {
        setDoctors(data.doctors || []);
        setCurrentPage(data.pagination?.page || 1);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalResults(data.pagination?.total || 0);

        if (!filterOptions && data.filters) {
          setFilterOptions(data.filters);
        }

        // Log if using demo data
        if (data.isDemo) {
          console.log('ℹ️ Using demo doctor data');
        }
      } else {
        console.error('Failed to fetch doctors:', data.error || 'Unknown error');
        // Set empty results on error
        setDoctors([]);
        setCurrentPage(1);
        setTotalPages(1);
        setTotalResults(0);
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
      // Set empty results on error
      setDoctors([]);
      setCurrentPage(1);
      setTotalPages(1);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  }, [filters, filterOptions]);

  // Initial load
  useEffect(() => {
    fetchDoctors(1);
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }

    const timeout = setTimeout(() => {
      fetchDoctors(1);
    }, 500);

    setSearchDebounce(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [filters.search]);

  // Refetch when filters change (except search)
  useEffect(() => {
    fetchDoctors(1);
  }, [
    filters.specialty,
    filters.minRating,
    filters.maxFee,
    filters.languages,
    filters.experience,
    filters.sortBy,
    filters.sortOrder,
  ]);

  // Update filter
  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      specialty: '',
      minRating: 0,
      maxFee: 10,
      languages: [],
      experience: 0,
      sortBy: 'rating',
      sortOrder: 'desc',
    });
  };

  // Toggle language filter
  const toggleLanguage = (language: string) => {
    setFilters(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language],
    }));
  };



  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-medical">
          <div className="w-8 h-8 bg-primary rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Find Doctors</h1>
            <p className="text-muted-foreground mt-2">
              Browse and book appointments with qualified healthcare professionals
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search doctors by name, specialty, or bio..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="animate-fade-in" style={{ animationDuration: '0.3s' }}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Advanced Filters</CardTitle>
                <CardDescription>
                  Refine your search to find the perfect doctor
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Specialty Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Specialty</label>
                    <Select
                      value={filters.specialty}
                      onValueChange={(value) => updateFilter('specialty', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Specialties" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Specialties</SelectItem>
                        {filterOptions?.specialties.map((specialty) => (
                          <SelectItem key={specialty.value} value={specialty.value}>
                            {specialty.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Rating Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Minimum Rating: {filters.minRating > 0 ? filters.minRating : 'Any'}
                    </label>
                    <Slider
                      value={[filters.minRating]}
                      onValueChange={(value) => updateFilter('minRating', value[0])}
                      max={5}
                      min={0}
                      step={0.5}
                      className="w-full"
                    />
                  </div>

                  {/* Fee Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Max Fee: {filters.maxFee < 10 ? `${filters.maxFee} credits` : 'Any'}
                    </label>
                    <Slider
                      value={[filters.maxFee]}
                      onValueChange={(value) => updateFilter('maxFee', value[0])}
                      max={10}
                      min={2}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  {/* Experience Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Min Experience: {filters.experience > 0 ? `${filters.experience} years` : 'Any'}
                    </label>
                    <Slider
                      value={[filters.experience]}
                      onValueChange={(value) => updateFilter('experience', value[0])}
                      max={30}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  {/* Sort Options */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sort By</label>
                    <div className="flex gap-2">
                      <Select
                        value={filters.sortBy}
                        onValueChange={(value) => updateFilter('sortBy', value)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {filterOptions?.sortOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                      >
                        {filters.sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Clear Filters */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Actions</label>
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="w-full"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear All Filters
                    </Button>
                  </div>
                </div>

                {/* Language Filter */}
                {filterOptions?.languages && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Languages</label>
                    <div className="flex flex-wrap gap-2">
                      {filterOptions.languages.slice(0, 8).map((language) => (
                        <Button
                          key={language}
                          variant={filters.languages.includes(language) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleLanguage(language)}
                        >
                          <Languages className="h-3 w-3 mr-1" />
                          {language}
                        </Button>
              ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
        </div>
      )}

      {/* Results Summary */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {loading ? (
              'Searching...'
            ) : (
              `Found ${totalResults} doctor${totalResults !== 1 ? 's' : ''} ${filters.search || filters.specialty || filters.minRating > 0 || filters.maxFee < 10 || filters.experience > 0 || filters.languages.length > 0 ? 'matching your criteria' : ''}`
            )}
          </p>
          {totalResults > 0 && (
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
          )}
        </div>
      </div>

      {/* Doctors Grid/List */}
      <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        {loading ? (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="glass-card">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="w-16 h-16 bg-muted rounded-full mx-auto"></div>
                    <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
                    <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
                    <div className="h-8 bg-muted rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="p-12 text-center">
              <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No doctors found
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or browse all specialties.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {doctors.map((doctor, index) => (
              <div
                key={doctor.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <Card className="glass-card hover:shadow-lg transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      {/* Doctor Avatar */}
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                          {doctor.profileImage ? (
                            <img
                              src={doctor.profileImage}
                              alt={doctor.name}
                              className="w-16 h-16 rounded-full object-cover"
                            />
                          ) : (
                            <User className="h-8 w-8 text-primary" />
                          )}
                        </div>
                        {doctor.isOnline && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>

                      {/* Doctor Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {doctor.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {doctor.formattedSpecialty}
                            </p>
                          </div>
                          <Badge variant="secondary" className="ml-2">
                            {doctor.consultationFee} credits
                          </Badge>
                        </div>

                        {/* Rating and Experience */}
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{doctor.rating}</span>
                            <span className="text-xs text-muted-foreground">
                              ({doctor.totalRatings} reviews)
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Award className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {doctor.experience} years
                            </span>
                          </div>
                        </div>

                        {/* Bio */}
                        {doctor.bio && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {doctor.bio}
                          </p>
                        )}

                        {/* Languages */}
                        {doctor.languages.length > 0 && (
                          <div className="flex items-center space-x-1 mt-2">
                            <Languages className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {doctor.languages.slice(0, 2).join(', ')}
                              {doctor.languages.length > 2 && ` +${doctor.languages.length - 2}`}
                            </span>
                          </div>
                        )}

                        {/* Availability */}
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {doctor.nextAvailableSlot || 'Check availability'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {doctor.totalConsultations} consultations
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-2 mt-4">
                          <Link href={`/dashboard/patient/doctors/${doctor.id}`} className="flex-1">
                            <Button size="sm" className="w-full">
                              <Calendar className="h-4 w-4 mr-2" />
                              View Profile & Book
                            </Button>
                          </Link>
                          <Button variant="outline" size="sm">
                            <Video className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => fetchDoctors(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                >
                  Previous
                </Button>
                <div className="flex items-center space-x-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => fetchDoctors(page)}
                        disabled={loading}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  onClick={() => fetchDoctors(currentPage + 1)}
                  disabled={currentPage === totalPages || loading}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
