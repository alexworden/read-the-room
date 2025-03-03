function buildUrl(protocol: string, host: string, port?: string): string {
  if (!protocol || !host) {
    throw new Error('Protocol and host are required');
  }
  
  // For WebSocket connections, we want to use the actual host
  if (import.meta.env.VITE_ALLOW_WEBSOCKET_ORIGIN === 'true' && window.location.hostname !== 'localhost') {
    host = window.location.hostname;
  }
  
  const portPart = port ? `:${port}` : '';
  return `${protocol}://${host}${portPart}`;
}

export const config = {
  apiUrl: buildUrl(
    import.meta.env.RTR_API_PROTOCOL || 'http',
    import.meta.env.RTR_API_HOST || 'localhost',
    import.meta.env.RTR_API_PORT || '3000'
  ),
  webUrl: buildUrl(
    import.meta.env.RTR_WEB_PROTOCOL || 'http',
    import.meta.env.RTR_WEB_HOST || 'localhost',
    import.meta.env.RTR_WEB_PORT || '5173'
  ),
};
