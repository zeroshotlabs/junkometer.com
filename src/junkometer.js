javascript:(function() {
  // Load tracking library
  const trackingScript = document.createElement('script');
  trackingScript.src = '/src/lib.js';
  document.head.appendChild(trackingScript);

  const pageAnalyzer = {
    init: function() {
      this.createLoadingVisualization();
      this.analyze();
    },
    
    createLoadingVisualization: function() {
      // Create loading container immediately
      this.container = document.createElement('div');
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0,0,0,0.9);
        color: white;
        padding: 20px;
        border-radius: 8px;
        font-family: monospace;
        z-index: 2147483647;
        width: 350px;
        max-height: 500px;
        overflow-y: auto;
        box-shadow: 0 0 20px rgba(0,0,0,0.5);
      `;
      
      this.container.innerHTML = `
        <div style="font-size: 16px; margin-bottom: 15px; text-align: center;">
          ⏳ Analyzing Page...
        </div>
        <div id="fileList" style="font-size: 11px; max-height: 200px; overflow-y: auto; margin-bottom: 15px;">
        </div>
        <div style="text-align: center; font-size: 12px; opacity: 0.7;">
          Processing resources...
        </div>
      `;
      
      document.body.appendChild(this.container);
      this.fileListEl = this.container.querySelector('#fileList');
    },
    
    addFileEntry: function(filename, type, success = true) {
      const entry = document.createElement('div');
      entry.style.cssText = `
        margin-bottom: 4px;
        padding: 2px 4px;
        background: ${success ? 'rgba(80,200,120,0.1)' : 'rgba(255,107,107,0.1)'};
        border-left: 3px solid ${success ? '#50c878' : '#ff6b6b'};
        word-break: break-all;
      `;
      
      // Extract filename from URL
      let displayName = filename;
      try {
        const url = new URL(filename, window.location.href);
        displayName = url.pathname.split('/').pop() || url.hostname;
      } catch(e) {
        // If not a URL, use as-is
      }
      
      entry.innerHTML = `
        <span style="color: ${success ? '#50c878' : '#ff6b6b'}">
          ${success ? '✓' : '✗'}
        </span>
        <span style="margin-left: 5px;">${displayName}</span>
        <span style="float: right; opacity: 0.6; font-size: 10px;">${type}</span>
      `;
      
      this.fileListEl.appendChild(entry);
      // Auto-scroll to bottom
      this.fileListEl.scrollTop = this.fileListEl.scrollHeight;
    },
    
    getJavaScript: async function() {
      const scripts = document.getElementsByTagName('script');
      let totalSize = 0;
      
      for(let script of scripts) {
        if(script.src) {
          try {
            const response = await fetch(script.src);
            const text = await response.text();
            totalSize += new Blob([text]).size;
            this.addFileEntry(script.src, 'JS', true);
          } catch(e) {
            // Handle CORS and other errors gracefully
            this.addFileEntry(script.src, 'JS', false);
            console.warn('Could not fetch:', script.src, e.message);
          }
        } else {
          totalSize += new Blob([script.innerHTML]).size;
          this.addFileEntry('(inline script)', 'JS', true);
        }
      }
      return totalSize;
    },
    
    getCSS: async function() {
      const links = document.getElementsByTagName('link');
      const styles = document.getElementsByTagName('style');
      let totalSize = 0;
      
      for(let link of links) {
        if(link.rel === 'stylesheet') {
          try {
            const response = await fetch(link.href);
            const text = await response.text();
            totalSize += new Blob([text]).size;
            this.addFileEntry(link.href, 'CSS', true);
          } catch(e) {
            // Handle CORS and other errors gracefully
            this.addFileEntry(link.href, 'CSS', false);
            console.warn('Could not fetch:', link.href, e.message);
          }
        }
      }
      
      for(let style of styles) {
        totalSize += new Blob([style.innerHTML]).size;
        this.addFileEntry('(inline styles)', 'CSS', true);
      }
      
      // Add HTML document size
      totalSize += new Blob([document.documentElement.outerHTML]).size;
      this.addFileEntry(window.location.pathname || 'index.html', 'HTML', true);
      
      return totalSize;
    },
    
    getReadableText: function() {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            if(node.parentElement.tagName === 'SCRIPT' || node.parentElement.tagName === 'STYLE') {
              return NodeFilter.FILTER_REJECT;
            }
            return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
          }
        }
      );
      let text = '';
      while(walker.nextNode()) {
        text += walker.currentNode.textContent.trim() + ' ';
      }
      this.addFileEntry('(text content)', 'TXT', true);
      return new Blob([text]).size;
    },
    
    calculatePercentages: function(js, css, text) {
      const total = js + css + text;
      return {
        javascript: {
          raw: Math.round(js / 1024),
          percent: Math.round((js / total) * 1000) / 10
        },
        cssHtml: {
          raw: Math.round(css / 1024),
          percent: Math.round((css / total) * 1000) / 10
        },
        readableText: {
          raw: Math.round(text / 1024),
          percent: Math.round((text / total) * 1000) / 10
        },
        url: window.location.href,
        timestamp: new Date().toISOString()
      };
    },
    
    showCopiedNotice: function() {
      const notice = document.createElement('div');
      notice.style.cssText = `
        position: fixed;
        top: 20px;
        right: 380px;
        background: #4a90e2;
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        font-family: monospace;
        z-index: 2147483648;
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
      `;
      notice.textContent = 'JSON copied to clipboard! 📋';
      document.body.appendChild(notice);
      // Fade in
      setTimeout(() => notice.style.opacity = '1', 0);
      // Fade out and remove
      setTimeout(() => {
        notice.style.opacity = '0';
        setTimeout(() => document.body.removeChild(notice), 300);
      }, 1000);
    },
    
    updateVisualization: function(results) {
      const totalKB = results.javascript.raw + results.cssHtml.raw + results.readableText.raw;
      
      this.container.innerHTML = `
        <div style="font-size: 16px; margin-bottom: 15px; text-align: center;">
          Page Weight: ${totalKB}KB
          <span style="font-size: 12px; opacity: 0.7">
            ${totalKB > 2000 ? '😰 Heavy' : totalKB > 1000 ? '😐 Medium' : '😊 Light'}
          </span>
        </div>
        <div id="fileList" style="font-size: 11px; max-height: 150px; overflow-y: auto; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.1); padding: 5px; border-radius: 4px;">
          ${this.fileListEl.innerHTML}
        </div>
        <div style="margin-bottom: 20px;">
          <div style="margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>JavaScript</span>
              <span>${results.javascript.raw}KB (${results.javascript.percent}%)</span>
            </div>
            <div style="width: 100%; height: 20px; background: #1a1a1a; border-radius: 10px; overflow: hidden;">
              <div style="width: ${results.javascript.percent}%; height: 100%; background: #4a90e2; transition: width 1s ease-out;"></div>
            </div>
          </div>
          <div style="margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>CSS/HTML</span>
              <span>${results.cssHtml.raw}KB (${results.cssHtml.percent}%)</span>
            </div>
            <div style="width: 100%; height: 20px; background: #1a1a1a; border-radius: 10px; overflow: hidden;">
              <div style="width: ${results.cssHtml.percent}%; height: 100%; background: #50c878; transition: width 1s ease-out;"></div>
            </div>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>Content</span>
              <span>${results.readableText.raw}KB (${results.readableText.percent}%)</span>
            </div>
            <div style="width: 100%; height: 20px; background: #1a1a1a; border-radius: 10px; overflow: hidden;">
              <div style="width: ${results.readableText.percent}%; height: 100%; background: #ff6b6b; transition: width 1s ease-out;"></div>
            </div>
          </div>
        </div>
        <div style="text-align: center; font-size: 32px; margin-top: 15px;">
          ${Array(Math.ceil(totalKB/500)).fill('🏋️').join('')}
        </div>
        <button id="copyJsonBtn" style="
          width: 100%;
          margin-top: 15px;
          padding: 8px;
          background: #4a90e2;
          border: none;
          border-radius: 4px;
          color: white;
          cursor: pointer;
          font-family: monospace;
          transition: background 0.3s;
        ">Copy JSON Data</button>
        <div style="font-size: 10px; margin-top: 10px; text-align: center; opacity: 0.7;">
          Click anywhere outside buttons to close
        </div>
      `;
      
      // Handle copy button click
      const copyBtn = this.container.querySelector('#copyJsonBtn');
      copyBtn.onclick = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(JSON.stringify(results, null, 2))
          .then(() => this.showCopiedNotice())
          .catch(err => console.error('Failed to copy:', err));
      };
      
      // Click outside buttons to close
      this.container.onclick = function(e) {
        if(e.target === this || (e.target.tagName !== 'BUTTON' && !e.target.closest('#fileList'))) {
          document.body.removeChild(this);
        }
      }.bind(this.container);
    },
    
    analyze: async function() {
      try {
        const jsSize = await this.getJavaScript();
        const cssSize = await this.getCSS();
        const textSize = this.getReadableText();
        const results = this.calculatePercentages(jsSize, cssSize, textSize);

        // Track scan with analytics library
        if(window.junkometerTracking && window.junkometerTracking.trackScan) {
          try {
            window.junkometerTracking.trackScan(results);
          } catch(trackingError) {
            console.warn('Tracking failed:', trackingError);
          }
        }

        this.updateVisualization(results);
      } catch(e) {
        console.error('Analysis failed:', e);

        // Track error if library is available
        if(window.junkometerTracking && window.junkometerTracking.trackError) {
          window.junkometerTracking.trackError(e, 'page-analysis');
        }

        this.container.innerHTML = `
          <div style="color: #ff6b6b; text-align: center; padding: 20px;">
            Analysis failed: ${e.message}
          </div>
        `;
      }
    }
  };
  pageAnalyzer.init();
})();