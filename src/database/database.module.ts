import { Module, OnModuleInit } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { MikroORM, SqliteDriver } from '@mikro-orm/sqlite';
import { entitySchemes } from './entity-schemes';

@Module({
  imports: [
    MikroOrmModule.forRoot({
      driver: SqliteDriver,
      dbName: process.env.DB_NAME ?? ':memory:',
      entities: entitySchemes,
      debug: process.env.DB_DEBUG === 'true',
    }),
  ],
})
export class DatabaseModule implements OnModuleInit {
  constructor(private readonly orm: MikroORM) {}

  async onModuleInit(): Promise<void> {
    await this.orm.schema.refresh();
  }
}
