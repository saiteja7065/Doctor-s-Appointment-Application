/**
 * @jest-environment jsdom
 */

import {
  detectBrowser,
  checkWebRTCSupport,
  checkMediaDevicesSupport,
  checkGetUserMediaSupport,
  checkSecureContext,
  checkSystemRequirements,
  getBrowserDisplayName,
  getRecommendedBrowsers
} from '@/lib/browser-compatibility';

// Mock navigator
const mockNavigator = {
  userAgent: '',
  mediaDevices: {
    getUserMedia: jest.fn()
  },
  getUserMedia: jest.fn(),
  webkitGetUserMedia: jest.fn(),
  mozGetUserMedia: jest.fn()
};

// Mock window
const mockWindow = {
  RTCPeerConnection: jest.fn(),
  webkitRTCPeerConnection: jest.fn(),
  mozRTCPeerConnection: jest.fn(),
  isSecureContext: true
};

// Mock location
const mockLocation = {
  protocol: 'https:',
  hostname: 'localhost'
};

describe('Browser Compatibility Detection', () => {
  beforeEach(() => {
    // Reset mocks
    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    });
    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true
    });
    Object.defineProperty(global, 'location', {
      value: mockLocation,
      writable: true
    });
  });

  describe('detectBrowser', () => {
    it('should detect Chrome browser correctly', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      
      const result = detectBrowser();
      
      expect(result.name).toBe('chrome');
      expect(result.version).toBe(91);
      expect(result.isSupported).toBe(true);
      expect(result.supportLevel).toBe('excellent');
    });

    it('should detect Firefox browser correctly', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0';
      
      const result = detectBrowser();
      
      expect(result.name).toBe('firefox');
      expect(result.version).toBe(89);
      expect(result.isSupported).toBe(true);
      expect(result.supportLevel).toBe('excellent');
    });

    it('should detect Safari browser correctly', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15';
      
      const result = detectBrowser();
      
      expect(result.name).toBe('safari');
      expect(result.version).toBe(14.1);
      expect(result.isSupported).toBe(true);
      expect(result.supportLevel).toBe('excellent');
    });

    it('should detect Edge browser correctly', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59';
      
      const result = detectBrowser();
      
      expect(result.name).toBe('edge');
      expect(result.version).toBe(91);
      expect(result.isSupported).toBe(true);
      expect(result.supportLevel).toBe('excellent');
    });

    it('should mark unsupported browser versions', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36';
      
      const result = detectBrowser();
      
      expect(result.name).toBe('chrome');
      expect(result.version).toBe(60);
      expect(result.isSupported).toBe(false);
      expect(result.supportLevel).toBe('unsupported');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle unknown browsers', () => {
      mockNavigator.userAgent = 'Unknown Browser/1.0';
      
      const result = detectBrowser();
      
      expect(result.name).toBe('unknown');
      expect(result.isSupported).toBe(false);
      expect(result.supportLevel).toBe('unsupported');
    });
  });

  describe('checkWebRTCSupport', () => {
    it('should return true when RTCPeerConnection is available', () => {
      expect(checkWebRTCSupport()).toBe(true);
    });

    it('should return true when webkitRTCPeerConnection is available', () => {
      delete (mockWindow as any).RTCPeerConnection;
      expect(checkWebRTCSupport()).toBe(true);
    });

    it('should return false when no WebRTC support is available', () => {
      delete (mockWindow as any).RTCPeerConnection;
      delete (mockWindow as any).webkitRTCPeerConnection;
      delete (mockWindow as any).mozRTCPeerConnection;
      
      expect(checkWebRTCSupport()).toBe(false);
    });
  });

  describe('checkMediaDevicesSupport', () => {
    it('should return true when mediaDevices.getUserMedia is available', () => {
      expect(checkMediaDevicesSupport()).toBe(true);
    });

    it('should return false when mediaDevices is not available', () => {
      delete (mockNavigator as any).mediaDevices;
      expect(checkMediaDevicesSupport()).toBe(false);
    });
  });

  describe('checkGetUserMediaSupport', () => {
    it('should return true when getUserMedia is available', () => {
      expect(checkGetUserMediaSupport()).toBe(true);
    });

    it('should return false when no getUserMedia support is available', () => {
      delete (mockNavigator as any).mediaDevices;
      delete (mockNavigator as any).getUserMedia;
      delete (mockNavigator as any).webkitGetUserMedia;
      delete (mockNavigator as any).mozGetUserMedia;
      
      expect(checkGetUserMediaSupport()).toBe(false);
    });
  });

  describe('checkSecureContext', () => {
    it('should return true for secure context', () => {
      expect(checkSecureContext()).toBe(true);
    });

    it('should return true for localhost', () => {
      mockWindow.isSecureContext = false;
      mockLocation.protocol = 'http:';
      mockLocation.hostname = 'localhost';
      
      expect(checkSecureContext()).toBe(true);
    });

    it('should return false for insecure context', () => {
      mockWindow.isSecureContext = false;
      mockLocation.protocol = 'http:';
      mockLocation.hostname = 'example.com';
      
      expect(checkSecureContext()).toBe(false);
    });
  });

  describe('checkSystemRequirements', () => {
    it('should return excellent support for modern browsers', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      
      const result = checkSystemRequirements();
      
      expect(result.overallSupport).toBe('excellent');
      expect(result.criticalIssues).toHaveLength(0);
      expect(result.browser.isSupported).toBe(true);
      expect(result.webRTC).toBe(true);
      expect(result.mediaDevices).toBe(true);
      expect(result.isSecureContext).toBe(true);
    });

    it('should return unsupported for old browsers', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36';
      
      const result = checkSystemRequirements();
      
      expect(result.overallSupport).toBe('unsupported');
      expect(result.criticalIssues.length).toBeGreaterThan(0);
      expect(result.browser.isSupported).toBe(false);
    });

    it('should return unsupported when WebRTC is not available', () => {
      delete (mockWindow as any).RTCPeerConnection;
      delete (mockWindow as any).webkitRTCPeerConnection;
      delete (mockWindow as any).mozRTCPeerConnection;
      
      const result = checkSystemRequirements();
      
      expect(result.overallSupport).toBe('unsupported');
      expect(result.criticalIssues).toContain('WebRTC not supported');
      expect(result.webRTC).toBe(false);
    });
  });

  describe('getBrowserDisplayName', () => {
    it('should return correct display names', () => {
      expect(getBrowserDisplayName('chrome')).toBe('Google Chrome');
      expect(getBrowserDisplayName('firefox')).toBe('Mozilla Firefox');
      expect(getBrowserDisplayName('safari')).toBe('Safari');
      expect(getBrowserDisplayName('edge')).toBe('Microsoft Edge');
      expect(getBrowserDisplayName('unknown')).toBe('Unknown Browser');
    });
  });

  describe('getRecommendedBrowsers', () => {
    it('should return list of recommended browsers', () => {
      const browsers = getRecommendedBrowsers();
      
      expect(browsers).toHaveLength(4);
      expect(browsers[0].name).toBe('Google Chrome');
      expect(browsers[0].version).toBe('72 or later');
      expect(browsers[0].downloadUrl).toContain('chrome');
    });
  });
});
