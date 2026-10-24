import { Controller, Get, Render } from '@nestjs/common';
import { TrainingSessionsService } from './training-sessions.service';
import { TrainingSessionsViewModel } from '../../view-models/training-sessions-view.model';

@Controller('training-sessions')
export class TrainingSessionsController {
  constructor(private readonly trainingSessionsService: TrainingSessionsService) {}

  @Get()
  @Render('training-sessions')
  getUpcomingSessions(): Promise<TrainingSessionsViewModel> {
    return this.trainingSessionsService.getUpcomingSessions();
  }
}
