// Simple script to test if we can import and check the GraphExplorer component
try {
  const module = require('./src/pages/GraphExplorer.tsx');
  console.log('Module loaded successfully');
} catch (error) {
  console.error('Error loading module:', error.message);
}
