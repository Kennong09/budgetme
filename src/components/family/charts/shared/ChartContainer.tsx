import React from 'react';

interface ChartContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  children,
  className = '',
  style = {}
}) => {
  const defaultStyle = {
    backgroundColor: '#f8f9fc',
    borderRadius: '10px',
    padding: '0',
    height: '400px',
    ...style
  };

  return (
    <div className={`position-relative ${className}`} style={defaultStyle}>
      {children}
    </div>
  );
};

export default ChartContainer;