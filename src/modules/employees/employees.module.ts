import { Module } from '@nestjs/common';
import { TrainingRequirementsModule } from '../training-requirements/training-requirements.module';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

@Module({
  imports: [TrainingRequirementsModule],
  controllers: [EmployeesController],
  providers: [EmployeesService],
})
export class EmployeesModule {}
