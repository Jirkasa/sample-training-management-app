import { Module, OnModuleInit } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MikroORM, SqliteDriver } from '@mikro-orm/sqlite';
import { entitySchemes } from './entity-schemes';
import { DataImportService } from './import/data-import.service';

@Module({
  imports: [
    MikroOrmModule.forRoot({
      driver: SqliteDriver,
      dbName: process.env.DB_NAME ?? ':memory:',
      entities: entitySchemes,
      debug: process.env.DB_DEBUG === 'true',
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
