import dotenv from 'dotenv';

dotenv.config();

function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`❌ FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return value;
}

export const config = {
  database: {
    url: getEnvVar('DATABASE_URL'),
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
  },
};
