import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';
import path from 'path';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { TrainingSessionsModule } from './modules/training-sessions/training-sessions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    DatabaseModule,
    TrainingSessionsModule,
    EmployeesModule,
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
