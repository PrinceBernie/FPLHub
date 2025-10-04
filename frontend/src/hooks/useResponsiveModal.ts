import { useIsMobile } from '../components/ui/use-mobile';

export type ModalType = 'modal' | 'bottom-sheet' | 'full-page';

export const useResponsiveModal = (): ModalType => {
  const isMobile = useIsMobile();
  
  // On mobile, use bottom-sheet for simple modals, full-page for complex flows
  // On desktop, use traditional modals
  return isMobile ? 'bottom-sheet' : 'modal';
};

export const useModalBehavior = () => {
  const modalType = useResponsiveModal();
  const isMobile = useIsMobile();
  
  return {
    modalType,
    isMobile,
    // Modal sizing based on device
    modalSize: isMobile ? 'full' : 'lg',
    // Animation preferences
    animation: isMobile ? 'slide-up' : 'fade',
    // Dismissal behavior
    dismissible: isMobile ? 'swipe-down' : 'click-outside',
    // Full screen on mobile for complex flows
    fullScreen: isMobile,
  };
};
