export const config = {
  webUrl: process.env.NODE_ENV === 'production'
    ? `https://${process.env.RTR_WEB_HOST}`
    : `${process.env.RTR_WEB_PROTOCOL || 'http'}://${process.env.RTR_WEB_HOST || 'localhost'}:${process.env.RTR_WEB_PORT || '4200'}`,
  apiUrl: `${process.env.RTR_API_PROTOCOL || 'http'}://${process.env.RTR_API_HOST || 'localhost'}:${process.env.RTR_API_PORT || '3000'}`,
  apiHost: process.env.RTR_API_HOST || 'localhost',
  apiPort: parseInt(process.env.RTR_API_PORT || '3000'),
};
