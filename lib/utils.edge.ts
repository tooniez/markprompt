// Edge utilities. Cannot run Node APIs.

export const getHost = (subdomain?: string, forceProduction?: boolean) => {
  const host =
    forceProduction || process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_APP_HOSTNAME
      : 'localhost:3000';
  return subdomain ? `${subdomain}.${host}` : host;
};

export const safeParseInt = (value: any, defaultValue = 0) => {
  try {
    return parseInt(value);
  } catch {
    // Do nothing
  }
  return defaultValue;
};
