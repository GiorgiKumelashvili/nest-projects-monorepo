import { DynamicModule, Global, Logger, Module, Provider } from '@nestjs/common';
import { Kysely, KyselyConfig, sql } from 'kysely';
import { KYSELY_MODULE_CONNECTION_TOKEN, KYSELY_MODULE_OPTIONS_TOKEN } from './database.constants';
import { DatabseKyselyModuleAsyncOptions } from './database.interface';

@Global()
@Module({})
export class DatabaseModule {
  public static readonly databaseLogger = new Logger(DatabaseModule.name);

  public static forRootAsync<DB>(configs: DatabseKyselyModuleAsyncOptions): DynamicModule {
    this.databaseLogger.verbose('Started initializing database connection');

    const optionsProvider: Provider = {
      inject: configs.inject,
      provide: KYSELY_MODULE_OPTIONS_TOKEN,
      useFactory: configs.useFactory,
    };

    const connectionProvider: Provider = {
      inject: [KYSELY_MODULE_OPTIONS_TOKEN],
      provide: KYSELY_MODULE_CONNECTION_TOKEN,
      useFactory: async (config: KyselyConfig) => {
        const db = new Kysely<DB>(config);

        try {
          await sql`select 1`.execute(db);
          this.databaseLogger.verbose('Database connection sucessfull');
        } catch (error) {
          this.databaseLogger.error('Connection error');
          console.log(error);
        }

        return db;
      },
    };

    return {
      imports: configs.imports,
      module: DatabaseModule,
      providers: [optionsProvider, connectionProvider],
      exports: [connectionProvider],
    };
  }
}
