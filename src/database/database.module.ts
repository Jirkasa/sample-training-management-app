import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MikroORM, SqliteDriver } from '@mikro-orm/sqlite';
import { AppConfig } from '../config/configuration';
import { entitySchemes } from './entity-schemes';
import { DataImportService } from './import/data-import.service';

@Module({
  imports: [
    MikroOrmModule.forRootAsync({
      driver: SqliteDriver,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        dbName: config.get('database.name', { infer: true }),
        debug: config.get('database.debug', { infer: true }),
        entities: entitySchemes,
      }),
    }),
  ],
  providers: [DataImportService],
})
export class DatabaseModule implements OnModuleInit {
  constructor(
    private readonly orm: MikroORM,
    private readonly dataImportService: DataImportService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.orm.schema.refresh();
    await this.dataImportService.import();
  }
}
