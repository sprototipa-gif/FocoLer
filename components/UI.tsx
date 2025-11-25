import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = "", onClick }) => (
  <div 
    onClick={onClick} 
    className={`bg-white rounded-2xl shadow-sm border border-slate-100 ${className}`}
  >
    {children}
  </div>
);

type ButtonVariant = 'primary' | 'secondary' | 'magic' | 'success' | 'danger';

interface ButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: ButtonVariant;
  className?: string;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  onClick, 
  children, 
  variant = 'primary', 
  className = '', 
  disabled = false 
}) => {
  const baseStyle = "px-6 py-3 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 shadow-lg",
    secondary: "bg-white text-indigo-600 border-2 border-indigo-100 hover:border-indigo-200 hover:bg-indigo-50",
    magic: "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-purple-200 shadow-lg hover:brightness-110",
    success: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200 shadow-lg",
    danger: "bg-red-50 text-red-500 border border-red-100 hover:bg-red-100"
  };
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};