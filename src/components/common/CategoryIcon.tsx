import React from 'react';
import {
  GraduationCap,
  Utensils,
  Coffee,
  Bus,
  Target,
  ShoppingBag,
  Zap,
  BookOpen,
  Shield,
  Sparkles,
  UtensilsCrossed,
  Lock,
  Home,
  Navigation,
  PartyPopper,
  Smartphone,
  Coins,
  Award,
  Wallet,
  LucideProps,
} from 'lucide-react';

interface CategoryIconProps extends LucideProps {
  name: string;
}

const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  GraduationCap,
  Utensils,
  Coffee,
  Bus,
  Target,
  ShoppingBag,
  Zap,
  BookOpen,
  Shield,
  Sparkles,
  UtensilsCrossed,
  Lock,
  Home,
  Navigation,
  PartyPopper,
  Smartphone,
  Coins,
  Award,
  Wallet,
};

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, ...props }) => {
  const IconComponent = iconMap[name] || Wallet;
  return <IconComponent {...props} />;
};
