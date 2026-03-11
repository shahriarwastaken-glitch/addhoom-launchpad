import {
  Store, ShoppingBag, Shirt, Palette, Smartphone, Coffee, Gem, Package, type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  store: Store,
  'shopping-bag': ShoppingBag,
  shirt: Shirt,
  palette: Palette,
  smartphone: Smartphone,
  coffee: Coffee,
  gem: Gem,
  package: Package,
};

interface WorkspaceAvatarProps {
  color?: string;
  iconName?: string;
  size?: number;
  className?: string;
  fallbackLetter?: string;
}

const WorkspaceAvatar = ({ color = '#FF5100', iconName = 'store', size = 32, className = '', fallbackLetter }: WorkspaceAvatarProps) => {
  const Icon = ICON_MAP[iconName] || Store;
  const iconSize = Math.round(size * 0.45);

  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size, backgroundColor: color }}
    >
      <Icon size={iconSize} className="text-white" />
    </div>
  );
};

export default WorkspaceAvatar;
