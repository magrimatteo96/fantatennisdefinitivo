interface CountryFlagProps {
  countryCode: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CountryFlag({ countryCode, size = 'md' }: CountryFlagProps) {
  const sizeClasses = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const getFlag = (code: string): string => {
    if (!code || code === 'XX') return '🏳️';

    const codePoints = code
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  return (
    <span className={`${sizeClasses[size]} leading-none`} title={countryCode}>
      {getFlag(countryCode)}
    </span>
  );
}
