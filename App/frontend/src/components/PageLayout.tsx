import { ReactNode } from 'react';
import AdBanner from './AdBanner';

interface PageLayoutProps {
  children: ReactNode;
  showTopAd?: boolean;
  showBottomAd?: boolean;
}

/**
 * PageLayout wraps page content and injects a single AdSense banner
 * at the bottom of the page content area. Minimal spacing to avoid excess whitespace.
 */
const PageLayout = ({
  children,
  showTopAd: _showTopAd = false,
  showBottomAd = true,
}: PageLayoutProps) => {
  return (
    <>
      {children}
      {showBottomAd && (
        <div className="w-full max-w-[1200px] mx-auto px-4 pb-2">
          <AdBanner className="my-2" />
        </div>
      )}
    </>
  );
};

export default PageLayout;