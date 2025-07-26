import React from 'react';

function Spinner(){
  return (
      <img
        src="src/assets/loading.png" // 🔁 Replace this with your actual image path
        alt="Loading..."
        className="w-full h-full animate-spin"
        style={{ animationDuration: '1.4s' }}
      />
  );
};

export default Spinner;
