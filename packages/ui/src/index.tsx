import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', style, ...props }, ref) => {
    const baseStyle: React.CSSProperties = {
      padding: '8px 16px',
      borderRadius: '6px',
      fontWeight: 500,
      fontSize: '14px',
      cursor: 'pointer',
      border: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s',
      ...style,
    };

    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        backgroundColor: '#1a56db',
        color: '#fff',
      },
      secondary: {
        backgroundColor: '#f3f4f6',
        color: '#1f2937',
      },
      outline: {
        backgroundColor: 'transparent',
        border: '1px solid #d1d5db',
        color: '#374151',
      },
    };

    const combinedStyle = { ...baseStyle, ...variantStyles[variant] };

    return (
      <button ref={ref} style={combinedStyle} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
