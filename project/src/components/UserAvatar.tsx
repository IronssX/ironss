interface UserAvatarProps {
  name: string;
  imageUrl: string | null;
  className?: string;
}

export function UserAvatar({ name, imageUrl, className = 'h-10 w-10' }: UserAvatarProps) {
  if (imageUrl) {
    return <img src={imageUrl} alt={name} className={`shrink-0 rounded-full object-cover ${className}`} />;
  }

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neon-500 to-neon-700 text-sm font-bold text-white ${className}`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
