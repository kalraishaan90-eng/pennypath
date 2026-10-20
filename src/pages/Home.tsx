import React from 'react';
import { HomeDashboard } from '../components/home/HomeDashboard';

export interface HomePageProps {
  onStartOnboarding?: () => void;
  onOpenDemo?: () => void;
}

export const HomePage: React.FC<HomePageProps> = () => {
  return <HomeDashboard />;
};
