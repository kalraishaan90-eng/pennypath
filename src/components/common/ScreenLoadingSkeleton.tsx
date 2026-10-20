import React from 'react';
import { Skeleton } from '../../ui/Skeleton';

export const ScreenLoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading page content" role="status">
      <div className="space-y-2">
        <Skeleton variant="text" width="40%" height={32} />
        <Skeleton variant="text" width="60%" height={16} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-card border border-ink/15 bg-paper space-y-4">
          <Skeleton variant="text" width="50%" height={20} />
          <Skeleton variant="rectangular" width="100%" height={120} />
          <div className="space-y-2 pt-2">
            <Skeleton variant="text" width="100%" height={14} />
            <Skeleton variant="text" width="80%" height={14} />
          </div>
        </div>

        <div className="p-6 rounded-card border border-ink/15 bg-paper space-y-4">
          <Skeleton variant="text" width="45%" height={20} />
          <Skeleton variant="rectangular" width="100%" height={120} />
          <div className="space-y-2 pt-2">
            <Skeleton variant="text" width="90%" height={14} />
            <Skeleton variant="text" width="70%" height={14} />
          </div>
        </div>
      </div>
    </div>
  );
};
