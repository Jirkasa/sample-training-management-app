import { Module } from '@nestjs/common';
import { TrainingRequirementsModule } from '../training-requirements/training-requirements.module';
import { TrainingSessionsController } from './training-sessions.controller';
import { TrainingSessionsService } from './training-sessions.service';

@Module({
  imports: [TrainingRequirementsModule],
  controllers: [TrainingSessionsController],
  providers: [TrainingSessionsService],
})
export class TrainingSessionsModule {}
