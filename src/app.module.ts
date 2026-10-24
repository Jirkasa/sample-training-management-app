import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';
import path from 'path';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    DatabaseModule,
    I18nModule.forRoot({
      fallbackLanguage: 'cs',
      viewEngine: "hbs",
      loaderOptions: {
        path: process.env.NODE_ENV !== 'production'
          ? path.resolve(process.cwd(), 'src', 'i18n')
          : path.resolve(process.cwd(), 'dist', 'i18n'),
        watch: process.env.NODE_ENV !== 'production'
      },
      resolvers: [
        AcceptLanguageResolver
      ]
    })
  ],
  controllers: [AppController],
})
export class AppModule {}
