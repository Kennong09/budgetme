import React from 'react';

interface TableViewerProps {
  tableContent: string;
}

const TableViewer: React.FC<TableViewerProps> = ({ tableContent }) => {
  // Enhanced table parsing with better error handling
  const parseTable = (content: string) => {
    const lines = content.trim().split('\n').filter(line => line.trim());
    if (lines.length < 2) return null;

    // Find header and separator lines
    let headerIndex = -1;
    let separatorIndex = -1;
    
    for (let i = 0; i < lines.length - 1; i++) {
      const currentLine = lines[i];
      const nextLine = lines[i + 1];
      
      // Check if current line has pipes and next line is separator
      if (currentLine.includes('|') && nextLine.match(/^[\|\s\-:]+$/)) {
        headerIndex = i;
        separatorIndex = i + 1;
        break;
      }
    }
    
    if (headerIndex === -1 || separatorIndex === -1) {
      // Fallback: assume first line is header, second is separator
      headerIndex = 0;
      separatorIndex = 1;
    }

    // Extract headers
    const headerLine = lines[headerIndex];
    const headers = headerLine
      .split('|')
      .map(h => h.trim())
      .filter(h => h && h !== '');

    if (headers.length === 0) return null;

    // Extract data rows (skip header and separator)
    const dataLines = lines.slice(separatorIndex + 1);
    
    // Parse rows with proper cell alignment
    const rows = dataLines
      .filter(line => line.includes('|'))
      .map(line => {
        const cells = line.split('|').map(cell => cell.trim());
        // Remove empty cells at start/end (from leading/trailing |)
        while (cells.length > 0 && cells[0] === '') cells.shift();
        while (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
        
        // Pad or truncate to match header count
        while (cells.length < headers.length) cells.push('');
        return cells.slice(0, headers.length);
      })
      .filter(row => row.length > 0);

    return { headers, rows };
  };

  // Parse alignment from separator line
  const getColumnAlignments = (content: string) => {
    const lines = content.trim().split('\n');
    const separatorLine = lines.find(line => line.match(/^[\|\s\-:]+$/));
    
    if (!separatorLine) return [];
    
    return separatorLine
      .split('|')
      .map(cell => cell.trim())
      .filter(cell => cell)
      .map(cell => {
        if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
        if (cell.endsWith(':')) return 'right';
        return 'left';
      });
  };

  const tableData = parseTable(tableContent);
  const alignments = getColumnAlignments(tableContent);

  if (!tableData || tableData.headers.length === 0) {
    return <div className="table-viewer-error">Unable to parse table format</div>;
  }

  return (
    <div className="table-viewer">
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {tableData.headers.map((header, index) => (
                <th 
                  key={index} 
                  style={{ textAlign: alignments[index] || 'left' }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.rows.length > 0 ? (
              tableData.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td 
                      key={cellIndex} 
                      style={{ textAlign: alignments[cellIndex] || 'left' }}
                    >
                      {cell || '—'}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={tableData.headers.length} className="no-data">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableViewer;
