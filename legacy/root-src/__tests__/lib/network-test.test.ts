/**
 * @jest-environment jsdom
 */

import {
  testDownloadSpeed,
  testUploadSpeed,
  testLatency,
  testJitter,
  performNetworkTest,
  getNetworkQualityColor,
  getNetworkQualityIcon,
  NETWORK_REQUIREMENTS
} from '@/lib/network-test';

// Mock fetch
global.fetch = jest.fn();

// Mock Image constructor
global.Image = class {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src: string = '';
  
  constructor() {
    // Simulate image loading
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 100);
  }
} as any;

// Mock performance
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => Date.now())
  },
  writable: true
});

describe('Network Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok' })
    });
  });

  describe('testDownloadSpeed', () => {
    it('should return a download speed value', async () => {
      const speed = await testDownloadSpeed();
      expect(typeof speed).toBe('number');
      expect(speed).toBeGreaterThan(0);
    });

    it('should handle image loading errors gracefully', async () => {
      // Override Image to simulate error
      global.Image = class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        src: string = '';
        
        constructor() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror();
            }
          }, 100);
        }
      } as any;

      const speed = await testDownloadSpeed();
      expect(speed).toBe(2.0); // Fallback speed
    });
  });

  describe('testUploadSpeed', () => {
    it('should return an upload speed value', async () => {
      const speed = await testUploadSpeed();
      expect(typeof speed).toBe('number');
      expect(speed).toBeGreaterThan(0);
    });
  });

  describe('testLatency', () => {
    it('should return a latency value', async () => {
      const latency = await testLatency();
      expect(typeof latency).toBe('number');
      expect(latency).toBeGreaterThan(0);
    });

    it('should handle fetch errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const latency = await testLatency();
      expect(latency).toBe(50); // Fallback latency
    });
  });

  describe('testJitter', () => {
    it('should return a jitter value', async () => {
      const jitter = await testJitter();
      expect(typeof jitter).toBe('number');
      expect(jitter).toBeGreaterThanOrEqual(0);
    });
  });

  describe('performNetworkTest', () => {
    it('should return comprehensive network test results', async () => {
      const result = await performNetworkTest();
      
      expect(result).toHaveProperty('downloadSpeed');
      expect(result).toHaveProperty('uploadSpeed');
      expect(result).toHaveProperty('latency');
      expect(result).toHaveProperty('jitter');
      expect(result).toHaveProperty('packetLoss');
      expect(result).toHaveProperty('quality');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('warnings');
      
      expect(typeof result.downloadSpeed).toBe('number');
      expect(typeof result.uploadSpeed).toBe('number');
      expect(typeof result.latency).toBe('number');
      expect(typeof result.jitter).toBe('number');
      expect(typeof result.packetLoss).toBe('number');
      expect(['excellent', 'good', 'fair', 'poor']).toContain(result.quality);
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should classify network quality correctly', async () => {
      // Mock good network conditions
      jest.spyOn(require('@/lib/network-test'), 'testDownloadSpeed').mockResolvedValue(10);
      jest.spyOn(require('@/lib/network-test'), 'testUploadSpeed').mockResolvedValue(8);
      jest.spyOn(require('@/lib/network-test'), 'testLatency').mockResolvedValue(30);
      jest.spyOn(require('@/lib/network-test'), 'testJitter').mockResolvedValue(5);
      
      const result = await performNetworkTest();
      expect(['excellent', 'good']).toContain(result.quality);
    });

    it('should handle test failures gracefully', async () => {
      // Mock all tests to fail
      jest.spyOn(require('@/lib/network-test'), 'testDownloadSpeed').mockRejectedValue(new Error('Test failed'));
      jest.spyOn(require('@/lib/network-test'), 'testUploadSpeed').mockRejectedValue(new Error('Test failed'));
      jest.spyOn(require('@/lib/network-test'), 'testLatency').mockRejectedValue(new Error('Test failed'));
      jest.spyOn(require('@/lib/network-test'), 'testJitter').mockRejectedValue(new Error('Test failed'));
      
      const result = await performNetworkTest();
      
      expect(result.quality).toBe('fair');
      expect(result.recommendations).toContain('Network test failed - please check your internet connection');
      expect(result.warnings).toContain('Unable to accurately measure network performance');
    });
  });

  describe('getNetworkQualityColor', () => {
    it('should return correct colors for quality levels', () => {
      expect(getNetworkQualityColor('excellent')).toBe('text-green-600');
      expect(getNetworkQualityColor('good')).toBe('text-blue-600');
      expect(getNetworkQualityColor('fair')).toBe('text-yellow-600');
      expect(getNetworkQualityColor('poor')).toBe('text-red-600');
    });
  });

  describe('getNetworkQualityIcon', () => {
    it('should return correct icons for quality levels', () => {
      expect(getNetworkQualityIcon('excellent')).toBe('🟢');
      expect(getNetworkQualityIcon('good')).toBe('🔵');
      expect(getNetworkQualityIcon('fair')).toBe('🟡');
      expect(getNetworkQualityIcon('poor')).toBe('🔴');
    });
  });

  describe('NETWORK_REQUIREMENTS', () => {
    it('should have valid network requirements', () => {
      expect(NETWORK_REQUIREMENTS.minimumDownload).toBe(1.0);
      expect(NETWORK_REQUIREMENTS.minimumUpload).toBe(1.0);
      expect(NETWORK_REQUIREMENTS.recommendedDownload).toBe(3.0);
      expect(NETWORK_REQUIREMENTS.recommendedUpload).toBe(3.0);
      expect(NETWORK_REQUIREMENTS.maximumLatency).toBe(150);
      expect(NETWORK_REQUIREMENTS.maximumJitter).toBe(30);
    });
  });
});
