import { Module } from '@nestjs/common';
import { TrainingRequirementsModule } from '../training-requirements/training-requirements.module';
import { TrainingNeedsController } from './training-needs.controller';
import { TrainingNeedsService } from './training-needs.service';

@Module({
  imports: [TrainingRequirementsModule],
  controllers: [TrainingNeedsController],
  providers: [TrainingNeedsService],
})
export class TrainingNeedsModule {}
