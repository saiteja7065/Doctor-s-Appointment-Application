/**
 * @jest-environment jsdom
 */

import { 
  performSystemCheck, 
  calculateSystemScore, 
  determineSystemPass, 
  generateSystemRecommendations,
  getSystemCheckBadge,
  quickSystemCheck
} from '../lib/system-check';

// Mock the dependencies
jest.mock('../lib/browser-compatibility', () => ({
  checkSystemRequirements: jest.fn(),
  getBrowserDisplayName: jest.fn(),
  getRecommendedBrowsers: jest.fn()
}));

jest.mock('../lib/network-test', () => ({
  performNetworkTest: jest.fn()
}));

jest.mock('../lib/media-devices', () => ({
  requestMediaPermissions: jest.fn()
}));

import { checkSystemRequirements } from '../lib/browser-compatibility';
import { performNetworkTest } from '../lib/network-test';
import { requestMediaPermissions } from '../lib/media-devices';

const mockCheckSystemRequirements = checkSystemRequirements as jest.MockedFunction<typeof checkSystemRequirements>;
const mockPerformNetworkTest = performNetworkTest as jest.MockedFunction<typeof performNetworkTest>;
const mockRequestMediaPermissions = requestMediaPermissions as jest.MockedFunction<typeof requestMediaPermissions>;

describe('System Check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateSystemScore', () => {
    it('should calculate perfect score for excellent system', () => {
      const browserCheck = {
        overallSupport: 'excellent' as const,
        webRTC: true,
        isSecureContext: true,
        browser: { name: 'Chrome', version: '120', isSupported: true },
        mediaDevices: true,
        criticalIssues: [],
        warnings: []
      };

      const networkCheck = {
        downloadSpeed: 10.0,
        uploadSpeed: 10.0,
        latency: 50,
        jitter: 5,
        packetLoss: 0,
        quality: 'excellent' as const,
        recommendations: [],
        warnings: []
      };

      const mediaCheck = {
        hasCamera: true,
        hasMicrophone: true,
        cameraPermission: 'granted' as const,
        microphonePermission: 'granted' as const,
        cameraDevices: [{ deviceId: '1', label: 'Camera 1' }],
        microphoneDevices: [{ deviceId: '1', label: 'Mic 1' }],
        errors: [],
        warnings: [],
        recommendations: []
      };

      const score = calculateSystemScore(browserCheck, networkCheck, mediaCheck);
      expect(score).toBe(100);
    });

    it('should calculate lower score for poor system', () => {
      const browserCheck = {
        overallSupport: 'limited' as const,
        webRTC: true,
        isSecureContext: true,
        browser: { name: 'Chrome', version: '60', isSupported: true },
        mediaDevices: true,
        criticalIssues: [],
        warnings: []
      };

      const networkCheck = {
        downloadSpeed: 0.5,
        uploadSpeed: 0.5,
        latency: 500,
        jitter: 100,
        packetLoss: 5,
        quality: 'poor' as const,
        recommendations: [],
        warnings: []
      };

      const mediaCheck = {
        hasCamera: false,
        hasMicrophone: true,
        cameraPermission: 'denied' as const,
        microphonePermission: 'granted' as const,
        cameraDevices: [],
        microphoneDevices: [{ deviceId: '1', label: 'Mic 1' }],
        errors: ['Camera access denied'],
        warnings: [],
        recommendations: []
      };

      const score = calculateSystemScore(browserCheck, networkCheck, mediaCheck);
      expect(score).toBeLessThan(50);
    });
  });

  describe('determineSystemPass', () => {
    it('should pass for good system with high score', () => {
      const browserCheck = {
        overallSupport: 'excellent' as const,
        webRTC: true,
        isSecureContext: true,
        browser: { name: 'Chrome', version: '120', isSupported: true },
        mediaDevices: true,
        criticalIssues: [],
        warnings: []
      };

      const networkCheck = {
        downloadSpeed: 5.0,
        uploadSpeed: 5.0,
        latency: 100,
        jitter: 10,
        packetLoss: 0,
        quality: 'good' as const,
        recommendations: [],
        warnings: []
      };

      const mediaCheck = {
        hasCamera: true,
        hasMicrophone: true,
        cameraPermission: 'granted' as const,
        microphonePermission: 'granted' as const,
        cameraDevices: [{ deviceId: '1', label: 'Camera 1' }],
        microphoneDevices: [{ deviceId: '1', label: 'Mic 1' }],
        errors: [],
        warnings: [],
        recommendations: []
      };

      const passed = determineSystemPass(browserCheck, networkCheck, mediaCheck, 85);
      expect(passed).toBe(true);
    });

    it('should fail for unsupported browser', () => {
      const browserCheck = {
        overallSupport: 'unsupported' as const,
        webRTC: false,
        isSecureContext: true,
        browser: { name: 'IE', version: '11', isSupported: false },
        mediaDevices: false,
        criticalIssues: ['Browser not supported'],
        warnings: []
      };

      const networkCheck = {
        downloadSpeed: 10.0,
        uploadSpeed: 10.0,
        latency: 50,
        jitter: 5,
        packetLoss: 0,
        quality: 'excellent' as const,
        recommendations: [],
        warnings: []
      };

      const mediaCheck = {
        hasCamera: true,
        hasMicrophone: true,
        cameraPermission: 'granted' as const,
        microphonePermission: 'granted' as const,
        cameraDevices: [{ deviceId: '1', label: 'Camera 1' }],
        microphoneDevices: [{ deviceId: '1', label: 'Mic 1' }],
        errors: [],
        warnings: [],
        recommendations: []
      };

      const passed = determineSystemPass(browserCheck, networkCheck, mediaCheck, 90);
      expect(passed).toBe(false);
    });
  });

  describe('generateSystemRecommendations', () => {
    it('should generate browser recommendations for unsupported browser', () => {
      const browserCheck = {
        overallSupport: 'unsupported' as const,
        webRTC: false,
        isSecureContext: false,
        browser: { name: 'IE', version: '11', isSupported: false },
        mediaDevices: false,
        criticalIssues: ['Browser not supported'],
        warnings: []
      };

      const networkCheck = {
        downloadSpeed: 10.0,
        uploadSpeed: 10.0,
        latency: 50,
        jitter: 5,
        packetLoss: 0,
        quality: 'excellent' as const,
        recommendations: [],
        warnings: []
      };

      const mediaCheck = {
        hasCamera: true,
        hasMicrophone: true,
        cameraPermission: 'granted' as const,
        microphonePermission: 'granted' as const,
        cameraDevices: [{ deviceId: '1', label: 'Camera 1' }],
        microphoneDevices: [{ deviceId: '1', label: 'Mic 1' }],
        errors: [],
        warnings: [],
        recommendations: []
      };

      const recommendations = generateSystemRecommendations(browserCheck, networkCheck, mediaCheck);
      
      expect(recommendations).toContain(
        expect.stringContaining('Update your browser or switch to a supported browser')
      );
      expect(recommendations).toContain(
        expect.stringContaining('Your browser does not support WebRTC')
      );
      expect(recommendations).toContain(
        expect.stringContaining('Access the application via HTTPS')
      );
    });

    it('should generate network recommendations for poor connection', () => {
      const browserCheck = {
        overallSupport: 'excellent' as const,
        webRTC: true,
        isSecureContext: true,
        browser: { name: 'Chrome', version: '120', isSupported: true },
        mediaDevices: true,
        criticalIssues: [],
        warnings: []
      };

      const networkCheck = {
        downloadSpeed: 0.5,
        uploadSpeed: 0.5,
        latency: 500,
        jitter: 100,
        packetLoss: 5,
        quality: 'poor' as const,
        recommendations: [],
        warnings: []
      };

      const mediaCheck = {
        hasCamera: true,
        hasMicrophone: true,
        cameraPermission: 'granted' as const,
        microphonePermission: 'granted' as const,
        cameraDevices: [{ deviceId: '1', label: 'Camera 1' }],
        microphoneDevices: [{ deviceId: '1', label: 'Mic 1' }],
        errors: [],
        warnings: [],
        recommendations: []
      };

      const recommendations = generateSystemRecommendations(browserCheck, networkCheck, mediaCheck);
      
      expect(recommendations).toContain(
        expect.stringContaining('Improve your internet connection')
      );
      expect(recommendations).toContain(
        expect.stringContaining('High network latency detected')
      );
    });

    it('should generate positive recommendation for perfect system', () => {
      const browserCheck = {
        overallSupport: 'excellent' as const,
        webRTC: true,
        isSecureContext: true,
        browser: { name: 'Chrome', version: '120', isSupported: true },
        mediaDevices: true,
        criticalIssues: [],
        warnings: []
      };

      const networkCheck = {
        downloadSpeed: 10.0,
        uploadSpeed: 10.0,
        latency: 50,
        jitter: 5,
        packetLoss: 0,
        quality: 'excellent' as const,
        recommendations: [],
        warnings: []
      };

      const mediaCheck = {
        hasCamera: true,
        hasMicrophone: true,
        cameraPermission: 'granted' as const,
        microphonePermission: 'granted' as const,
        cameraDevices: [{ deviceId: '1', label: 'Camera 1' }],
        microphoneDevices: [{ deviceId: '1', label: 'Mic 1' }],
        errors: [],
        warnings: [],
        recommendations: []
      };

      const recommendations = generateSystemRecommendations(browserCheck, networkCheck, mediaCheck);
      
      expect(recommendations).toContain(
        'Your system is ready for high-quality video consultations!'
      );
    });
  });

  describe('getSystemCheckBadge', () => {
    it('should return excellent badge for high score and passed', () => {
      const badge = getSystemCheckBadge(95, true);
      expect(badge.variant).toBe('default');
      expect(badge.text).toBe('Excellent');
      expect(badge.color).toBe('text-green-600');
    });

    it('should return failed badge for failed system', () => {
      const badge = getSystemCheckBadge(30, false);
      expect(badge.variant).toBe('destructive');
      expect(badge.text).toBe('System Check Failed');
      expect(badge.color).toBe('text-red-600');
    });

    it('should return fair badge for medium score', () => {
      const badge = getSystemCheckBadge(65, true);
      expect(badge.variant).toBe('secondary');
      expect(badge.text).toBe('Fair');
      expect(badge.color).toBe('text-yellow-600');
    });
  });

  describe('performSystemCheck', () => {
    it('should perform complete system check successfully', async () => {
      // Mock successful responses
      mockCheckSystemRequirements.mockReturnValue({
        overallSupport: 'excellent',
        webRTC: true,
        isSecureContext: true,
        browser: { name: 'Chrome', version: '120', isSupported: true },
        mediaDevices: true,
        criticalIssues: [],
        warnings: []
      });

      mockPerformNetworkTest.mockResolvedValue({
        downloadSpeed: 5.0,
        uploadSpeed: 5.0,
        latency: 100,
        jitter: 10,
        packetLoss: 0,
        quality: 'good',
        recommendations: [],
        warnings: []
      });

      mockRequestMediaPermissions.mockResolvedValue({
        hasCamera: true,
        hasMicrophone: true,
        cameraPermission: 'granted',
        microphonePermission: 'granted',
        cameraDevices: [{ deviceId: '1', label: 'Camera 1' }],
        microphoneDevices: [{ deviceId: '1', label: 'Mic 1' }],
        errors: [],
        warnings: [],
        recommendations: []
      });

      const result = await performSystemCheck();

      expect(result.passed).toBe(true);
      expect(result.overallScore).toBeGreaterThan(80);
      expect(result.recommendations).toContain(
        'Your system is ready for high-quality video consultations!'
      );
      expect(result.timestamp).toBeDefined();
    });

    it('should handle network test timeout gracefully', async () => {
      mockCheckSystemRequirements.mockReturnValue({
        overallSupport: 'excellent',
        webRTC: true,
        isSecureContext: true,
        browser: { name: 'Chrome', version: '120', isSupported: true },
        mediaDevices: true,
        criticalIssues: [],
        warnings: []
      });

      // Mock network test timeout
      mockPerformNetworkTest.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network test timeout')), 100)
        )
      );

      mockRequestMediaPermissions.mockResolvedValue({
        hasCamera: true,
        hasMicrophone: true,
        cameraPermission: 'granted',
        microphonePermission: 'granted',
        cameraDevices: [{ deviceId: '1', label: 'Camera 1' }],
        microphoneDevices: [{ deviceId: '1', label: 'Mic 1' }],
        errors: [],
        warnings: [],
        recommendations: []
      });

      const result = await performSystemCheck({ networkTimeout: 50 });

      expect(result.network.quality).toBe('poor');
      expect(result.network.warnings).toContain('Unable to test network speed');
    });

    it('should skip tests when requested', async () => {
      mockCheckSystemRequirements.mockReturnValue({
        overallSupport: 'excellent',
        webRTC: true,
        isSecureContext: true,
        browser: { name: 'Chrome', version: '120', isSupported: true },
        mediaDevices: true,
        criticalIssues: [],
        warnings: []
      });

      const result = await performSystemCheck({ 
        skipNetworkTest: true, 
        skipMediaTest: true 
      });

      expect(result.network.recommendations).toContain('Network test was skipped');
      expect(result.media.errors).toContain('Media test was skipped');
      expect(mockPerformNetworkTest).not.toHaveBeenCalled();
      expect(mockRequestMediaPermissions).not.toHaveBeenCalled();
    });
  });

  describe('quickSystemCheck', () => {
    it('should perform quick system check', () => {
      mockCheckSystemRequirements.mockReturnValue({
        overallSupport: 'excellent',
        webRTC: true,
        isSecureContext: true,
        browser: { name: 'Chrome', version: '120', isSupported: true },
        mediaDevices: true,
        criticalIssues: [],
        warnings: []
      });

      const result = quickSystemCheck();

      expect(result.hasWebRTC).toBe(true);
      expect(result.isSecureContext).toBe(true);
      expect(result.hasMediaDevices).toBe(true);
      expect(result.browserSupported).toBe(true);
    });
  });
});
