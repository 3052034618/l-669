import app, { initializeApp } from './app.js';

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await initializeApp();
    
    const server = app.listen(PORT, () => {
      console.log(`Server ready on port ${PORT}`);
      console.log(`API 健康检查: http://localhost:${PORT}/api/health`);
    });

    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT signal received');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
