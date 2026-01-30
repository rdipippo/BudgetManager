import React from 'react';

interface CategoryBadgeProps {
  name: string;
  color: string;
  icon?: string;
  size?: 'sm' | 'md';
  onClick?: () => void;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  name,
  color,
  size = 'md',
  onClick,
}) => {
  const style: React.CSSProperties = {
    backgroundColor: `${color}20`,
    color: color,
    borderColor: `${color}40`,
  };

  return (
    <span
      className={`category-badge category-badge-${size} ${onClick ? 'category-badge-clickable' : ''}`}
      style={style}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {name}
    </span>
  );
};
