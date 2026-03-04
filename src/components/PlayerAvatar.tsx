interface PlayerAvatarProps {
  name: string;
  tour: 'ATP' | 'WTA';
  imageUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBorder?: boolean;
}

export function PlayerAvatar({ name, tour, imageUrl, size = 'md', showBorder = true }: PlayerAvatarProps) {
  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[parts.length - 1][0];
    }
    return fullName.slice(0, 2);
  };

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  const bgColor = tour === 'ATP' ? 'bg-blue-900' : 'bg-fuchsia-600';
  const borderColor = tour === 'ATP' ? 'border-blue-700' : 'border-fuchsia-500';

  if (imageUrl) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden flex-shrink-0 ${
          showBorder ? `border-2 ${borderColor}` : ''
        }`}
      >
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            if (e.currentTarget.parentElement) {
              e.currentTarget.parentElement.innerHTML = `
                <div class="${bgColor} w-full h-full flex items-center justify-center font-bold text-white">
                  ${getInitials(name).toUpperCase()}
                </div>
              `;
            }
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${
        showBorder ? `border-2 ${borderColor}` : ''
      }`}
    >
      {getInitials(name).toUpperCase()}
    </div>
  );
}
