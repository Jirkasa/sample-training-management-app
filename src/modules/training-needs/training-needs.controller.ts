import { Controller, Get, Render } from '@nestjs/common';
import { TrainingNeedsService } from './training-needs.service';
import { TrainingNeedsViewModel } from '../../view-models/training-needs-view.model';

@Controller('training-needs')
export class TrainingNeedsController {
  constructor(private readonly trainingNeedsService: TrainingNeedsService) {}

  @Get()
  @Render('training-needs')
  getTrainingNeeds(): Promise<TrainingNeedsViewModel> {
    return this.trainingNeedsService.getTrainingNeeds();
  }
}
