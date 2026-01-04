import React, { FC } from 'react';

interface FormattedAITextProps {
  text: string;
  mode?: 'plain' | 'markdown';
  className?: string;
}

/**
 * FormattedAIText - A utility component for consistently formatting AI-generated text
 * 
 * Features:
 * - Prevents run-on text by preserving line breaks and paragraphs
 * - Automatically detects and renders bullet points as lists
 * - Handles markdown-style formatting
 * - Ensures proper text wrapping and spacing
 */
const FormattedAIText: FC<FormattedAITextProps> = ({ 
  text, 
  mode = 'plain', 
  className = '' 
}) => {
  if (!text || text.trim().length === 0) {
    return (
      <div className={`text-muted small ${className}`}>
        <i className="fas fa-info-circle mr-2"></i>
        No content available
      </div>
    );
  }

  const formatText = (inputText: string) => {
    // Clean up the text first
    let cleanText = inputText
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\s+/g, ' ')   // Normalize whitespace but preserve single spaces
      .trim();

    // Split into paragraphs by double newlines
    const paragraphs = cleanText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    return paragraphs.map((paragraph, pIndex) => {
      const trimmedParagraph = paragraph.trim();
      
      // Check if this paragraph contains bullet points
      const lines = trimmedParagraph.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      const bulletPatterns = [
        /^[\-\*\+•]\s+(.+)$/, // -, *, +, • bullets
        /^\d+[\.\)]\s+(.+)$/, // numbered lists like 1. or 1)
        /^Priority\s+\d+\s*[\-–—:]\s*(.+)$/i, // Priority X - content
      ];
      
      // Check if most lines are bullet points
      let bulletLines = 0;
      const processedLines = lines.map(line => {
        for (const pattern of bulletPatterns) {
          const match = line.match(pattern);
          if (match) {
            bulletLines++;
            return { type: 'bullet', content: match[1] || line, original: line };
          }
        }
        return { type: 'text', content: line, original: line };
      });

      // If more than half the lines are bullets, render as a list
      if (bulletLines > 0 && bulletLines >= lines.length * 0.5) {
        return (
          <div key={pIndex} className="mb-3">
            <ul className="list-unstyled">
              {processedLines.map((line, lIndex) => (
                <li key={lIndex} className="mb-2">
                  <div className="d-flex align-items-start">
                    {line.type === 'bullet' ? (
                      <>
                        <i className="fas fa-caret-right text-primary mt-1 mr-2" style={{ fontSize: '12px', minWidth: '16px' }}></i>
                        <span 
                          className="text-sm" 
                          style={{ 
                            lineHeight: '1.5',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word'
                          }}
                          dangerouslySetInnerHTML={{
                            __html: line.content
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
                              .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
                              .replace(/₱(\d+(?:,\d{3})*(?:\.\d{2})?)/g, '<strong>₱$1</strong>') // Currency formatting
                          }}
                        />
                      </>
                    ) : (
                      <span 
                        className="text-sm"
                        style={{ 
                          lineHeight: '1.5',
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word'
                        }}
                      >
                        {line.content}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      }

      // Regular paragraph rendering
      return (
        <div key={pIndex} className="mb-3">
          <p 
            className="mb-2"
            style={{ 
              lineHeight: '1.6',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-wrap' // Preserve line breaks within paragraphs
            }}
            dangerouslySetInnerHTML={{
              __html: trimmedParagraph
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
                .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
                .replace(/₱(\d+(?:,\d{3})*(?:\.\d{2})?)/g, '<strong>₱$1</strong>') // Currency formatting
                .replace(/(\d+(?:\.\d+)?%)/g, '<strong>$1</strong>') // Percentage formatting
            }}
          />
        </div>
      );
    });
  };

  return (
    <div 
      className={`formatted-ai-text ${className}`}
      style={{ 
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        lineHeight: '1.5'
      }}
    >
      {formatText(text)}
    </div>
  );
};

export default FormattedAIText;