import clsx from 'clsx';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

export function LoadingSpinner({ size = 'md', message, className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={clsx('flex flex-col items-center justify-center', className)}>
      <div
        className={clsx(
          'border-blue-600 border-t-transparent rounded-full animate-spin',
          sizeClasses[size]
        )}
      />
      {message && (
        <p className="text-slate-500 text-sm mt-3">{message}</p>
      )}
    </div>
  );
}

interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = 'טוען נתונים...' }: PageLoaderProps) {
  return (
    <div className="flex items-center justify-center py-16">
      <LoadingSpinner size="lg" message={message} />
    </div>
  );
}
