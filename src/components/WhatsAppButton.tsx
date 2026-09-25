import React from 'react';
import { MessageSquare } from 'lucide-react';
import { openWhatsApp } from '../utils/whatsapp';

interface Props {
  phone: string;
  message: string;
  title?: string;
  label?: string;
  size?: 'sm' | 'md';
  variant?: 'outline' | 'solid' | 'subtle';
  className?: string;
}

export const WhatsAppButton: React.FC<Props> = ({
  phone,
  message,
  title = 'Send WhatsApp alert',
  label,
  size = 'sm',
  variant = 'solid',
  className = '',
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openWhatsApp(phone, message);
  };

  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 cursor-pointer select-none';
  
  const sizeClasses = size === 'sm' 
    ? 'px-2.5 py-1 text-xs gap-1.5' 
    : 'px-3.5 py-2 text-xs gap-2';

  let variantClasses = '';
  if (variant === 'solid') {
    variantClasses = 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow-sm active:scale-98';
  } else if (variant === 'subtle') {
    variantClasses = 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 active:scale-98';
  } else {
    variantClasses = 'border border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 active:scale-98';
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={title}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
    >
      <MessageSquare className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      {label && <span>{label}</span>}
    </button>
  );
};
