import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { ResponseInterceptor } from '../common/response.interceptor.js';
import { ApiKeyGuard } from '../common/api-key.guard.js';

// A Controller's only job is to handle HTTP: map a route + method to a
// handler, pull data out of the request, and hand it to a Service.
// @Controller('tasks') means every route below is prefixed with /tasks.
@Controller('tasks')
@UseInterceptors(ResponseInterceptor) // applies to every route in this controller
export class TasksController {
  // Nest sees TasksService in the constructor and injects an instance
  // automatically - this is Dependency Injection. We never call `new TasksService()`.
  constructor(private readonly tasksService: TasksService) {}

  // GET /tasks
  // GET /tasks?done=true
  @Get()
  findAll(@Query('done') done?: string) {
    const filter = done === undefined ? undefined : done === 'true';
    return this.tasksService.findAll(filter);
  }

  // GET /tasks/:id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  // POST /tasks
  // Body is validated against CreateTaskDto by the global ValidationPipe (see main.ts)
  // before this method ever runs.
  @Post()
  create(@Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(createTaskDto);
  }

  // PATCH /tasks/:id
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.update(id, updateTaskDto);
  }

  // DELETE /tasks/:id
  // Protected by ApiKeyGuard - requires header "x-api-key: nest-rocks"
  // (or whatever API_KEY is set to in .env).
  @Delete(':id')
  @UseGuards(ApiKeyGuard)
  remove(@Param('id') id: string) {
    this.tasksService.remove(id);
    return { message: `Task ${id} deleted` };
  }
}
