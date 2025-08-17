import React, { useState } from 'react';

interface CodeViewerProps {
  code: string;
  language: string;
}

const CodeViewer: React.FC<CodeViewerProps> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!code.trim()) return;
    
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Enhanced code formatting and basic syntax highlighting
  const formatCode = (code: string, lang: string) => {
    if (!code || !code.trim()) {
      return <span className="code-empty">No code content</span>;
    }

    // Clean up the code - preserve indentation but normalize line endings
    const cleanCode = code
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    // Split into lines for line number display (optional future enhancement)
    const lines = cleanCode.split('\n');

    // Basic keyword highlighting for common languages
    const addBasicHighlighting = (text: string, language: string) => {
      const lowerLang = language.toLowerCase();
      
      if (['javascript', 'js', 'typescript', 'ts'].includes(lowerLang)) {
        return text.replace(
          /\b(function|const|let|var|if|else|for|while|return|import|export|class|extends|async|await|try|catch|throw|new)\b/g,
          '<span class="code-keyword">$1</span>'
        ).replace(
          /(['"`])((?:(?!\1)[^\\]|\\.)*)(\1)/g,
          '<span class="code-string">$1$2$3</span>'
        ).replace(
          /(\/\/.*$)/gm,
          '<span class="code-comment">$1</span>'
        );
      }
      
      if (['python', 'py'].includes(lowerLang)) {
        return text.replace(
          /\b(def|class|if|elif|else|for|while|return|import|from|try|except|finally|with|as|lambda|yield|async|await)\b/g,
          '<span class="code-keyword">$1</span>'
        ).replace(
          /(['"`])((?:(?!\1)[^\\]|\\.)*)(\1)/g,
          '<span class="code-string">$1$2$3</span>'
        ).replace(
          /(#.*$)/gm,
          '<span class="code-comment">$1</span>'
        );
      }
      
      // Add more language support as needed
      return text;
    };

    const highlightedCode = addBasicHighlighting(cleanCode, lang);

    return (
      <span 
        className="code-highlighted"
        dangerouslySetInnerHTML={{ __html: highlightedCode }}
      />
    );
  };

  // Get display name for language
  const getLanguageDisplayName = (lang: string) => {
    const langMap: { [key: string]: string } = {
      'js': 'JavaScript',
      'javascript': 'JavaScript', 
      'ts': 'TypeScript',
      'typescript': 'TypeScript',
      'py': 'Python',
      'python': 'Python',
      'html': 'HTML',
      'css': 'CSS',
      'json': 'JSON',
      'sql': 'SQL',
      'bash': 'Bash',
      'sh': 'Shell',
      'yaml': 'YAML',
      'yml': 'YAML',
      'xml': 'XML',
      'jsx': 'React JSX',
      'tsx': 'React TSX',
      'plaintext': 'Plain Text'
    };
    
    return langMap[language.toLowerCase()] || language.toUpperCase();
  };

  if (!code || !code.trim()) {
    return (
      <div className="code-viewer code-viewer-empty">
        <div className="code-header">
          <span className="code-language">{getLanguageDisplayName(language)}</span>
        </div>
        <div className="code-content">
          <div className="code-empty-message">No code content available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="code-viewer">
      <div className="code-header">
        <span className="code-language">{getLanguageDisplayName(language)}</span>
        <button
          onClick={handleCopy}
          className="code-copy-btn"
          aria-label="Copy code"
          disabled={!code.trim()}
        >
          {copied ? (
            <>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="code-content">
        <pre>
          <code className={`language-${language}`}>
            {formatCode(code, language)}
          </code>
        </pre>
      </div>
    </div>
  );
};

export default CodeViewer;
