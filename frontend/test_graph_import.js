// Test if the GraphExplorer module can be imported
import('./pages/GraphExplorer')
  .then(module => {
    console.log('Module loaded successfully');
    console.log('Exports:', Object.keys(module));
    console.log('Default export:', typeof module.default);
  })
  .catch(error => {
    console.error('Error loading module:', error.message);
    console.error('Stack:', error.stack);
  });
