import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { useResponsiveModal, useModalBehavior } from '../../hooks/useResponsiveModal';

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  description?: string;
  className?: string;
}

const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  open,
  onOpenChange,
  title,
  children,
  description,
  className = ''
}) => {
  const { modalType, isMobile, modalSize, fullScreen } = useModalBehavior();

  if (modalType === 'full-page') {
    // For complex flows, we'll use full pages instead
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`${
          isMobile 
            ? 'bottom-sheet-modal max-w-full mx-0 rounded-t-3xl rounded-b-none h-[90vh]' 
            : `max-w-${modalSize}`
        } ${className}`}
      >
        <DialogHeader className={isMobile ? 'pb-4' : ''}>
          <DialogTitle className={isMobile ? 'text-lg' : 'text-xl'}>
            {title}
          </DialogTitle>
          {description && (
            <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-base'}`}>
              {description}
            </p>
          )}
        </DialogHeader>
        <div className={isMobile ? 'flex-1 overflow-y-auto' : ''}>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ResponsiveModal;
