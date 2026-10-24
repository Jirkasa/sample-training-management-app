import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import hbs from 'hbs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setViewEngine('hbs');
  app.setBaseViewsDir(join(process.cwd(), 'views'));
  hbs.registerPartials(join(process.cwd(), 'views', 'partials'), { rename: (name: string) => name });
  app.set('view options', { layout: 'layouts/main' });

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
