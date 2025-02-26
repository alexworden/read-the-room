export const config = {
  webUrl: process.env.NODE_ENV === 'production'
    ? `https://${process.env.RTR_WEB_HOST}`
    : `${process.env.RTR_WEB_PROTOCOL || 'http'}://${process.env.RTR_WEB_HOST || 'localhost'}:${process.env.RTR_WEB_PORT || ''}`,
  apiUrl: process.env.NODE_ENV === 'production'
    ? `${process.env.RTR_API_PROTOCOL || 'http'}://${process.env.RTR_API_HOST || 'localhost'}`
    : `${process.env.RTR_API_PROTOCOL || 'http'}://${process.env.RTR_API_HOST || 'localhost'}:${process.env.RTR_API_PORT || ''}`,
  apiHost: process.env.RTR_API_HOST || 'localhost',
  apiPort: process.env.NODE_ENV === 'production'
    ? parseInt(process.env.PORT || '80')
    : parseInt(process.env.RTR_API_PORT || '3000'),
};
