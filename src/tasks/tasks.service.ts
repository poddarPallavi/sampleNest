import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Task } from './entities/task.entity.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';

// A Service holds business logic and state, kept separate from the Controller
// (which only deals with HTTP). @Injectable() makes this class available to
// Nest's dependency injection container so it can be handed to anything that asks for it.
//
// This one stores tasks in memory (a plain array). It resets every time the
// app restarts - swap this out for a real database call later and nothing
// about the Controller would need to change.
@Injectable()
export class TasksService {
  private tasks: Task[] = [
    {
      id: randomUUID(),
      title: 'Learn NestJS basics',
      description: 'Modules, controllers, services, DI',
      done: false,
    },
    {
      id: randomUUID(),
      title: 'Build a REST API',
      description: 'CRUD endpoints for tasks',
      done: false,
    },
  ];

  findAll(done?: boolean): Task[] {
    if (done === undefined) {
      return this.tasks;
    }
    return this.tasks.filter((task) => task.done === done);
  }

  findOne(id: string): Task {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) {
      throw new NotFoundException(`Task with id "${id}" not found`);
    }
    return task;
  }

  create(dto: CreateTaskDto): Task {
    const task: Task = {
      id: randomUUID(),
      title: dto.title,
      description: dto.description,
      done: dto.done ?? false,
    };
    this.tasks.push(task);
    return task;
  }

  update(id: string, dto: UpdateTaskDto): Task {
    const task = this.findOne(id);
    // Assigned field-by-field (instead of Object.assign(task, dto)) because
    // UpdateTaskDto's optional fields are still present on the instance as
    // explicit `undefined`, which would otherwise wipe out existing values.
    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.done !== undefined) task.done = dto.done;
    return task;
  }

  remove(id: string): void {
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new NotFoundException(`Task with id "${id}" not found`);
    }
    this.tasks.splice(index, 1);
  }
}
