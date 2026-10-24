import { Module } from '@nestjs/common';
import { TrainingRequirementsService } from './training-requirements.service';

@Module({
  providers: [TrainingRequirementsService],
  exports: [TrainingRequirementsService],
})
export class TrainingRequirementsModule {}
