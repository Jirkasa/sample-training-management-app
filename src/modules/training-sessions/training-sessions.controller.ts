import { Controller, Get, Param, Render } from '@nestjs/common';
import { TrainingSessionsService } from './training-sessions.service';
import { TrainingSessionDetailViewModel } from '../../view-models/training-session-detail-view.model';
import { TrainingSessionsViewModel } from '../../view-models/training-sessions-view.model';

@Controller('training-sessions')
export class TrainingSessionsController {
  constructor(private readonly trainingSessionsService: TrainingSessionsService) {}

  @Get()
  @Render('training-sessions')
  getUpcomingSessions(): Promise<TrainingSessionsViewModel> {
    return this.trainingSessionsService.getUpcomingSessions();
  }

  @Get(':id')
  @Render('training-session-detail')
  getSessionDetail(@Param('id') id: string): Promise<TrainingSessionDetailViewModel> {
    return this.trainingSessionsService.getSessionDetail(id);
  }
}
