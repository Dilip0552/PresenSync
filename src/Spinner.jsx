import React from 'react';

function Spinner({ message = "Loading...", size = "medium", color = "indigo", isVisible = true }) {
  let spinnerSizeClass = '';
  let textSizeClass = '';
  let spinnerColorClass = '';

  switch (size) {
    case 'small':
      spinnerSizeClass = 'w-5 h-5';
      textSizeClass = 'text-sm';
      break;
    case 'medium':
      spinnerSizeClass = 'w-8 h-8';
      textSizeClass = 'text-base';
      break;
    case 'large':
      spinnerSizeClass = 'w-12 h-12';
      textSizeClass = 'text-lg';
      break;
    default:
      spinnerSizeClass = 'w-8 h-8';
      textSizeClass = 'text-base';
  }

  switch (color) {
    case 'indigo':
      spinnerColorClass = 'border-indigo-500';
      break;
    case 'blue':
      spinnerColorClass = 'border-blue-500';
      break;
    case 'white':
      spinnerColorClass = 'border-white';
      break;
    default:
      spinnerColorClass = 'border-indigo-500';
  }

  return (
    <div className={`flex flex-col items-center justify-center p-4 ${!isVisible ? 'hidden' : ''}`}>
      <div
        className={`animate-spin rounded-full border-b-2 ${spinnerColorClass} ${spinnerSizeClass}`}
        role="status"
      >
        <span className="sr-only">Loading...</span>
      </div>
      {message && (
        <p className={`mt-3 text-gray-700 font-medium ${textSizeClass}`}>
          {message}
        </p>
      )}
    </div>
  );
}

export default Spinner;
