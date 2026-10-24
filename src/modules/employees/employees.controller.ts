import { Controller, Get, Param, Render } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeeDetailViewModel } from '../../view-models/employee-detail-view.model';
import { EmployeesViewModel } from '../../view-models/employees-view.model';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @Render('employees')
  getEmployees(): Promise<EmployeesViewModel> {
    return this.employeesService.getEmployees();
  }

  @Get(':id')
  @Render('employee-detail')
  getEmployeeDetail(@Param('id') id: string): Promise<EmployeeDetailViewModel> {
    return this.employeesService.getEmployeeDetail(id);
  }
}
