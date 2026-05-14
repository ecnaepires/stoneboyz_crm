import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

const DEFAULT_PORT = 3001;

const parsePort = (value: string | undefined): number => {
  if (value === undefined) {
    return DEFAULT_PORT;
  }

  const port = Number.parseInt(value, 10);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return port;
};

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(parsePort(process.env.PORT));
}

void bootstrap();
