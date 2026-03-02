// Junkometer tracking library
// Privacy-first, client-side analytics for the Junkometer bookmarklet

(function() {
  'use strict';

  // Initialize tracking namespace
  window.junkometerTracking = window.junkometerTracking || {
    loaded: true,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    sessionId: generateSessionId(),
    stats: {
      totalScans: 0,
      sessionScans: 0,
      lastScanTime: null
    }
  };

  // Generate unique session ID (privacy-first, no PII)
  function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // LocalStorage helpers with error handling
  const storage = {
    get: function(key) {
      try {
        const item = localStorage.getItem('junkometer_' + key);
        return item ? JSON.parse(item) : null;
      } catch(e) {
        console.warn('Junkometer: localStorage read failed', e);
        return null;
      }
    },
    set: function(key, value) {
      try {
        localStorage.setItem('junkometer_' + key, JSON.stringify(value));
        return true;
      } catch(e) {
        console.warn('Junkometer: localStorage write failed', e);
        return false;
      }
    },
    remove: function(key) {
      try {
        localStorage.removeItem('junkometer_' + key);
        return true;
      } catch(e) {
        console.warn('Junkometer: localStorage remove failed', e);
        return false;
      }
    }
  };

  // Load persistent stats
  function loadStats() {
    const savedStats = storage.get('stats');
    if(savedStats) {
      window.junkometerTracking.stats = Object.assign({}, window.junkometerTracking.stats, savedStats);
    }
  }

  // Save stats to localStorage
  function saveStats() {
    storage.set('stats', window.junkometerTracking.stats);
  }

  // Track a scan event
  window.junkometerTracking.trackScan = function(results) {
    const stats = window.junkometerTracking.stats;
    stats.totalScans = (stats.totalScans || 0) + 1;
    stats.sessionScans = (stats.sessionScans || 0) + 1;
    stats.lastScanTime = new Date().toISOString();

    // Store scan history (keep last 10)
    const history = storage.get('scanHistory') || [];
    history.unshift({
      url: results.url || window.location.href,
      timestamp: stats.lastScanTime,
      jsPercent: results.javascript?.percent || 0,
      contentPercent: results.readableText?.percent || 0,
      totalKB: (results.javascript?.raw || 0) + (results.cssHtml?.raw || 0) + (results.readableText?.raw || 0)
    });

    // Keep only last 10 scans
    if(history.length > 10) {
      history.length = 10;
    }

    storage.set('scanHistory', history);
    saveStats();

    return stats;
  };

  // Get scan history
  window.junkometerTracking.getHistory = function() {
    return storage.get('scanHistory') || [];
  };

  // Get statistics
  window.junkometerTracking.getStats = function() {
    return window.junkometerTracking.stats;
  };

  // Clear all tracking data
  window.junkometerTracking.clearData = function() {
    storage.remove('stats');
    storage.remove('scanHistory');
    window.junkometerTracking.stats = {
      totalScans: 0,
      sessionScans: 0,
      lastScanTime: null
    };
    console.log('Junkometer: All tracking data cleared');
  };

  // Performance monitoring
  window.junkometerTracking.measurePerformance = function(label, fn) {
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    console.log(`Junkometer [${label}]: ${duration}ms`);
    return result;
  };

  // Async performance monitoring
  window.junkometerTracking.measurePerformanceAsync = async function(label, fn) {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    console.log(`Junkometer [${label}]: ${duration}ms`);
    return result;
  };

  // Error tracking
  window.junkometerTracking.trackError = function(error, context) {
    const errorLog = storage.get('errorLog') || [];
    errorLog.unshift({
      message: error.message || String(error),
      context: context || 'unknown',
      timestamp: new Date().toISOString(),
      url: window.location.href
    });

    // Keep only last 5 errors
    if(errorLog.length > 5) {
      errorLog.length = 5;
    }

    storage.set('errorLog', errorLog);
    console.error('Junkometer error:', error, 'Context:', context);
  };

  // Get error log
  window.junkometerTracking.getErrors = function() {
    return storage.get('errorLog') || [];
  };

  // Initialize on load
  loadStats();

  // Log initialization
  if(window.location.hostname === 'junkometer.com' || window.location.hostname === 'localhost') {
    console.log('Junkometer tracking library loaded', {
      version: window.junkometerTracking.version,
      sessionId: window.junkometerTracking.sessionId,
      totalScans: window.junkometerTracking.stats.totalScans
    });
  }
})();