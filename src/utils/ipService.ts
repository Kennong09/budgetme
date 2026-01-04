/**
 * IP Address Detection Service
 * Provides utilities for detecting user IP addresses for rate limiting and security
 */

interface IpService {
  name: string;
  url: string;
  parser: (data: any) => string;
  responseType?: 'json' | 'text';
}

// Cache for IP address to avoid multiple API calls
let cachedIpAddress: string | null = null;
let lastCacheTime: number | null = null;
let ipFetchPromise: Promise<string | null> | null = null;

/**
 * Get the user's public IP address
 * Uses multiple fallback services for reliability with timeout protection
 */
export const getUserIpAddress = async (): Promise<string | null> => {
  // Return cached IP if available and not expired (cache for 1 hour)
  const cacheExpiry = 60 * 60 * 1000; // 1 hour in milliseconds
  if (cachedIpAddress && lastCacheTime && (Date.now() - lastCacheTime < cacheExpiry)) {
    return cachedIpAddress;
  }

  // Return existing promise if already fetching
  if (ipFetchPromise) {
    return ipFetchPromise;
  }

  // Create new fetch promise with overall timeout
  ipFetchPromise = Promise.race([
    fetchIpAddress(),
    new Promise<null>((resolve) => {
      setTimeout(() => {
        console.warn('⏰ IP detection timed out after 15 seconds');
        resolve(null);
      }, 15000); // 15 second total timeout
    })
  ]);
  
  try {
    const ip = await ipFetchPromise;
    if (ip) {
      cachedIpAddress = ip;
      lastCacheTime = Date.now();
      console.log('🎯 IP address cached successfully:', ip);
    } else {
      console.warn('💥 All IP detection methods failed');
    }
    return ip;
  } catch (error) {
    console.warn('💥 Critical error in IP detection:', error);
    return null;
  } finally {
    // Clear the promise after completion
    ipFetchPromise = null;
  }
};

/**
 * Fetch IP address from multiple services with fallbacks
 * Ordered by reliability and CORS compatibility for production use
 */
const fetchIpAddress = async (): Promise<string | null> => {
  const services: IpService[] = [
    {
      name: 'httpbin',
      url: 'https://httpbin.org/ip',
      parser: (data: any) => data.origin
    },
    {
      name: 'ipapi-co',
      url: 'https://ipapi.co/json/',
      parser: (data: any) => data.ip
    },
    {
      name: 'icanhazip',
      url: 'https://icanhazip.com/',
      parser: (data: string) => data.trim(),
      responseType: 'text'
    },
    {
      name: 'ipecho',
      url: 'https://ipecho.net/plain',
      parser: (data: string) => data.trim(),
      responseType: 'text'
    },
    {
      name: 'ident-me',
      url: 'https://ident.me/',
      parser: (data: string) => data.trim(),
      responseType: 'text'
    },
    {
      name: 'checkip-amazonaws',
      url: 'https://checkip.amazonaws.com/',
      parser: (data: string) => data.trim(),
      responseType: 'text'
    }
  ];

  for (const service of services) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout per service

      const response = await fetch(service.url, {
        signal: controller.signal,
        headers: {
          'Accept': service.responseType === 'text' ? 'text/plain' : 'application/json',
          'User-Agent': 'BudgetMe/1.0.0'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      let data: any;
      if (service.responseType === 'text') {
        data = await response.text();
      } else {
        data = await response.json();
      }
      
      const ip = service.parser(data);

      if (ip && typeof ip === 'string' && isValidIpAddress(ip)) {
        console.log(`✅ IP detected via ${service.name}:`, ip);
        return ip;
      } else {
        console.warn(`⚠️ Invalid IP format from ${service.name}:`, ip);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to get IP from ${service.name}:`, error);
      continue;
    }
  }

  // If all external services fail, try WebRTC as last resort
  console.warn('🔄 All external IP services failed, trying WebRTC fallback...');
  try {
    const webRtcIp = await getIpViaWebRTC();
    if (webRtcIp) {
      console.log('✅ IP detected via WebRTC:', webRtcIp);
      return webRtcIp;
    }
  } catch (error) {
    console.warn('⚠️ WebRTC IP detection failed:', error);
  }

  console.warn('❌ All IP detection methods failed');
  return null;
};

/**
 * WebRTC-based IP detection as fallback method
 * Works by creating a peer connection and extracting local IP from ICE candidates
 */
const getIpViaWebRTC = (): Promise<string | null> => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 3000);
    
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      pc.createDataChannel('');
      
      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        
        const candidate = event.candidate.candidate;
        const ipMatch = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]*:[a-f0-9:]+)/);
        
        if (ipMatch && isValidIpAddress(ipMatch[1])) {
          clearTimeout(timeout);
          pc.close();
          resolve(ipMatch[1]);
        }
      };
      
      pc.createOffer().then(offer => pc.setLocalDescription(offer));
    } catch (error) {
      clearTimeout(timeout);
      resolve(null);
    }
  });
};

/**
 * Validate IP address format (IPv4 and IPv6)
 */
const isValidIpAddress = (ip: string): boolean => {
  if (!ip || typeof ip !== 'string') return false;
  
  // IPv4 regex - strict validation
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 regex - more comprehensive
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

  // Filter out private/local addresses for security
  if (ipv4Regex.test(ip)) {
    const parts = ip.split('.').map(Number);
    // Exclude private IP ranges: 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 127.x.x.x
    if (
      parts[0] === 10 ||
      parts[0] === 127 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168)
    ) {
      return false; // Skip private IPs for rate limiting purposes
    }
    return true;
  }

  return ipv6Regex.test(ip);
};

/**
 * Clear cached IP address (useful for testing or privacy)
 */
export const clearIpCache = (): void => {
  cachedIpAddress = null;
  lastCacheTime = null;
  ipFetchPromise = null;
  console.log('🧹 IP cache cleared');
};

/**
 * Get cached IP address without making network requests
 */
export const getCachedIpAddress = (): string | null => {
  return cachedIpAddress;
};

/**
 * Pre-fetch and cache IP address for later use
 * Useful for initializing IP detection early in the app lifecycle
 */
export const prefetchIpAddress = (): void => {
  if (!cachedIpAddress && !ipFetchPromise) {
    getUserIpAddress().catch(() => {
      // Silently fail for prefetch
    });
  }
};
