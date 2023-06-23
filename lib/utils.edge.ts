// Edge utilities. Cannot run Node APIs.

import { NextRequest } from 'next/server';

export const getAppHost = (subdomain?: string, forceProduction?: boolean) => {
  const isProd = forceProduction || process.env.NODE_ENV === 'production';
  const host = isProd ? process.env.NEXT_PUBLIC_APP_HOSTNAME : 'localhost:3000';
  return subdomain ? `${subdomain}.${host}` : host;
};

export const getAppOrigin = (subdomain?: string, forceProduction?: boolean) => {
  const host = getAppHost(subdomain, forceProduction);
  const isProd = forceProduction || process.env.NODE_ENV === 'production';
  const schema = isProd ? 'https://' : 'http://';
  return `${schema}${host}`;
};

export const isAppHost = (host: string) => {
  return host === getAppHost();
};

export const removeSchema = (origin: string) => {
  return origin.replace(/(^\w+:|^)\/\//, '');
};

export const safeParseInt = (
  value: string | undefined | null,
  fallbackValue: number,
): number => {
  if (typeof value !== 'string') {
    return fallbackValue;
  }

  try {
    return parseInt(value);
  } catch {
    //
  }

  return fallbackValue;
};

export const safeParseJSON = <T>(
  value: string | undefined | null,
  fallbackValue: T,
): T => {
  if (typeof value !== 'string') {
    return fallbackValue;
  }

  try {
    return JSON.parse(value);
  } catch {
    //
  }

  return fallbackValue;
};

export const isRequestFromMarkprompt = (origin: string | undefined | null) => {
  const requesterHost = origin && removeSchema(origin);
  return requesterHost === getAppHost();
};
