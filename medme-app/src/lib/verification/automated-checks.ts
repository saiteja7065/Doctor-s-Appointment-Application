/**
 * Automated Verification Checks for Doctor Applications
 * Provides automated validation and verification services
 */

import { IDoctorApplication } from '@/lib/models/DoctorApplication';
import { MedicalSpecialty } from '@/lib/models/Doctor';

export interface VerificationResult {
  passed: boolean;
  score: number; // 0-100
  checks: VerificationCheck[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface VerificationCheck {
  name: string;
  passed: boolean;
  score: number;
  details: string;
  category: 'documents' | 'credentials' | 'experience' | 'education' | 'background';
}

/**
 * Perform comprehensive automated verification checks
 */
export async function performAutomatedVerification(
  application: IDoctorApplication
): Promise<VerificationResult> {
  const checks: VerificationCheck[] = [];
  
  // Document verification checks
  checks.push(...await verifyDocuments(application));
  
  // Credential verification checks
  checks.push(...await verifyCredentials(application));
  
  // Experience verification checks
  checks.push(...await verifyExperience(application));
  
  // Education verification checks
  checks.push(...await verifyEducation(application));
  
  // Background checks
  checks.push(...await performBackgroundChecks(application));
  
  // Calculate overall score
  const totalScore = checks.reduce((sum, check) => sum + check.score, 0);
  const maxScore = checks.length * 100;
  const overallScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  
  // Determine if verification passed
  const criticalChecks = checks.filter(check => 
    ['documents', 'credentials'].includes(check.category)
  );
  const criticalPassed = criticalChecks.every(check => check.passed);
  const passed = criticalPassed && overallScore >= 70;
  
  // Generate recommendations
  const recommendations = generateRecommendations(checks, overallScore);
  
  // Determine risk level
  const riskLevel = determineRiskLevel(checks, overallScore);
  
  return {
    passed,
    score: overallScore,
    checks,
    recommendations,
    riskLevel
  };
}

/**
 * Verify uploaded documents
 */
async function verifyDocuments(application: IDoctorApplication): Promise<VerificationCheck[]> {
  const checks: VerificationCheck[] = [];
  
  // Check for required documents
  const requiredDocs = ['medical_license', 'degree_certificate'];
  const uploadedDocTypes = application.uploadedDocuments.map(doc => doc.type);
  
  for (const docType of requiredDocs) {
    const hasDoc = uploadedDocTypes.includes(docType as any);
    checks.push({
      name: `Required Document: ${docType.replace('_', ' ').toUpperCase()}`,
      passed: hasDoc,
      score: hasDoc ? 100 : 0,
      details: hasDoc ? 'Document uploaded' : 'Document missing',
      category: 'documents'
    });
  }
  
  // Check document file sizes and types
  for (const doc of application.uploadedDocuments) {
    const validSize = doc.fileSize <= 10 * 1024 * 1024; // 10MB limit
    const validType = ['application/pdf', 'image/jpeg', 'image/png'].includes(doc.mimeType);
    
    checks.push({
      name: `Document Quality: ${doc.fileName}`,
      passed: validSize && validType,
      score: validSize && validType ? 100 : 50,
      details: `Size: ${(doc.fileSize / 1024 / 1024).toFixed(2)}MB, Type: ${doc.mimeType}`,
      category: 'documents'
    });
  }
  
  return checks;
}

/**
 * Verify professional credentials
 */
async function verifyCredentials(application: IDoctorApplication): Promise<VerificationCheck[]> {
  const checks: VerificationCheck[] = [];
  
  // License number format validation
  const licenseValid = validateLicenseNumber(application.licenseNumber, application.specialty);
  checks.push({
    name: 'License Number Format',
    passed: licenseValid.valid,
    score: licenseValid.valid ? 100 : 20,
    details: licenseValid.details,
    category: 'credentials'
  });
  
  // Credential URL validation
  const urlValid = await validateCredentialUrl(application.credentialUrl);
  checks.push({
    name: 'Credential URL Verification',
    passed: urlValid.valid,
    score: urlValid.valid ? 100 : 30,
    details: urlValid.details,
    category: 'credentials'
  });
  
  // Specialty validation
  const specialtyValid = Object.values(MedicalSpecialty).includes(application.specialty);
  checks.push({
    name: 'Medical Specialty Validation',
    passed: specialtyValid,
    score: specialtyValid ? 100 : 0,
    details: specialtyValid ? 'Valid specialty' : 'Invalid specialty',
    category: 'credentials'
  });
  
  return checks;
}

/**
 * Verify professional experience
 */
async function verifyExperience(application: IDoctorApplication): Promise<VerificationCheck[]> {
  const checks: VerificationCheck[] = [];
  
  // Years of experience validation
  const minExperience = getMinimumExperienceForSpecialty(application.specialty);
  const experienceValid = application.yearsOfExperience >= minExperience;
  
  checks.push({
    name: 'Minimum Experience Requirement',
    passed: experienceValid,
    score: experienceValid ? 100 : Math.max(0, (application.yearsOfExperience / minExperience) * 100),
    details: `${application.yearsOfExperience} years (minimum: ${minExperience})`,
    category: 'experience'
  });
  
  // Experience consistency check
  const currentYear = new Date().getFullYear();
  const oldestGraduation = Math.min(...application.education.map(edu => edu.graduationYear));
  const maxPossibleExperience = currentYear - oldestGraduation;
  const experienceConsistent = application.yearsOfExperience <= maxPossibleExperience;
  
  checks.push({
    name: 'Experience Consistency',
    passed: experienceConsistent,
    score: experienceConsistent ? 100 : 50,
    details: experienceConsistent 
      ? 'Experience aligns with education timeline'
      : 'Experience may exceed possible years since graduation',
    category: 'experience'
  });
  
  return checks;
}

/**
 * Verify educational background
 */
async function verifyEducation(application: IDoctorApplication): Promise<VerificationCheck[]> {
  const checks: VerificationCheck[] = [];
  
  // Medical degree requirement
  const hasMedicalDegree = application.education.some(edu => 
    ['MD', 'DO', 'MBBS', 'MBChB'].some(degree => 
      edu.degree.toUpperCase().includes(degree)
    )
  );
  
  checks.push({
    name: 'Medical Degree Requirement',
    passed: hasMedicalDegree,
    score: hasMedicalDegree ? 100 : 0,
    details: hasMedicalDegree ? 'Valid medical degree found' : 'No recognized medical degree',
    category: 'education'
  });
  
  // Education timeline validation
  const currentYear = new Date().getFullYear();
  const validTimeline = application.education.every(edu => 
    edu.graduationYear >= 1950 && edu.graduationYear <= currentYear
  );
  
  checks.push({
    name: 'Education Timeline',
    passed: validTimeline,
    score: validTimeline ? 100 : 50,
    details: validTimeline ? 'Valid graduation years' : 'Invalid graduation year detected',
    category: 'education'
  });
  
  return checks;
}

/**
 * Perform background checks
 */
async function performBackgroundChecks(application: IDoctorApplication): Promise<VerificationCheck[]> {
  const checks: VerificationCheck[] = [];
  
  // Application completeness
  const requiredFields = [
    'firstName', 'lastName', 'email', 'phoneNumber',
    'specialty', 'licenseNumber', 'credentialUrl', 'bio'
  ];
  
  const completedFields = requiredFields.filter(field => {
    const value = (application as any)[field];
    return value && value.toString().trim().length > 0;
  });
  
  const completeness = (completedFields.length / requiredFields.length) * 100;
  
  checks.push({
    name: 'Application Completeness',
    passed: completeness >= 90,
    score: completeness,
    details: `${completedFields.length}/${requiredFields.length} required fields completed`,
    category: 'background'
  });
  
  // Contact information validation
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(application.email);
  const phoneValid = /^\+?[\d\s\-\(\)]{10,}$/.test(application.phoneNumber);
  
  checks.push({
    name: 'Contact Information',
    passed: emailValid && phoneValid,
    score: (emailValid ? 50 : 0) + (phoneValid ? 50 : 0),
    details: `Email: ${emailValid ? 'Valid' : 'Invalid'}, Phone: ${phoneValid ? 'Valid' : 'Invalid'}`,
    category: 'background'
  });
  
  return checks;
}

/**
 * Validate license number format based on specialty
 */
function validateLicenseNumber(licenseNumber: string, specialty: MedicalSpecialty): {
  valid: boolean;
  details: string;
} {
  // Basic format validation
  if (!licenseNumber || licenseNumber.length < 5) {
    return { valid: false, details: 'License number too short' };
  }
  
  // Check for common patterns
  const hasLetters = /[A-Za-z]/.test(licenseNumber);
  const hasNumbers = /\d/.test(licenseNumber);
  
  if (!hasNumbers) {
    return { valid: false, details: 'License number should contain numbers' };
  }
  
  return { valid: true, details: 'License number format appears valid' };
}

/**
 * Validate credential URL
 */
async function validateCredentialUrl(url: string): Promise<{
  valid: boolean;
  details: string;
}> {
  try {
    new URL(url);
    
    // Check if URL is from a recognized medical board or institution
    const recognizedDomains = [
      'ama-assn.org', 'abms.org', 'fsmb.org', 'ecfmg.org',
      'gov', 'edu', 'org'
    ];
    
    const domain = new URL(url).hostname.toLowerCase();
    const isRecognized = recognizedDomains.some(recognized => 
      domain.includes(recognized)
    );
    
    return {
      valid: true,
      details: isRecognized 
        ? 'URL from recognized medical institution'
        : 'URL format valid but domain not recognized'
    };
  } catch {
    return { valid: false, details: 'Invalid URL format' };
  }
}

/**
 * Get minimum experience requirement for specialty
 */
function getMinimumExperienceForSpecialty(specialty: MedicalSpecialty): number {
  const specialtyRequirements: Record<string, number> = {
    [MedicalSpecialty.CARDIOLOGY]: 3,
    [MedicalSpecialty.NEUROLOGY]: 4,
    [MedicalSpecialty.ONCOLOGY]: 3,
    [MedicalSpecialty.PEDIATRICS]: 2,
    [MedicalSpecialty.PSYCHIATRY]: 2,
    [MedicalSpecialty.GENERAL_PRACTICE]: 1,
    [MedicalSpecialty.DERMATOLOGY]: 2,
    [MedicalSpecialty.ORTHOPEDICS]: 3,
    [MedicalSpecialty.RADIOLOGY]: 3,
    [MedicalSpecialty.ANESTHESIOLOGY]: 3,
  };
  
  return specialtyRequirements[specialty] || 2; // Default 2 years
}

/**
 * Generate recommendations based on verification results
 */
function generateRecommendations(checks: VerificationCheck[], overallScore: number): string[] {
  const recommendations: string[] = [];
  
  const failedChecks = checks.filter(check => !check.passed);
  
  if (failedChecks.length === 0) {
    recommendations.push('All automated checks passed. Application ready for manual review.');
  } else {
    recommendations.push('The following issues were identified:');
    
    failedChecks.forEach(check => {
      recommendations.push(`• ${check.name}: ${check.details}`);
    });
  }
  
  if (overallScore < 70) {
    recommendations.push('Overall score below threshold. Consider requesting additional documentation.');
  }
  
  return recommendations;
}

/**
 * Determine risk level based on verification results
 */
function determineRiskLevel(checks: VerificationCheck[], overallScore: number): 'low' | 'medium' | 'high' {
  const criticalFailures = checks.filter(check => 
    !check.passed && ['documents', 'credentials'].includes(check.category)
  ).length;
  
  if (criticalFailures > 0 || overallScore < 50) {
    return 'high';
  } else if (overallScore < 80) {
    return 'medium';
  } else {
    return 'low';
  }
}
