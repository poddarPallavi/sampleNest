import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { TasksService } from './tasks.service.js';

// Test.createTestingModule builds a real (but isolated) Nest DI container,
// so `service` here is resolved exactly the way it would be inside the app.
describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksService],
    }).compile();

    service = module.get(TasksService);
  });

  it('starts with the two seeded tasks', () => {
    expect(service.findAll()).toHaveLength(2);
  });

  it('creates a task and makes it findable', () => {
    const created = service.create({ title: 'Write tests' });
    expect(created.done).toBe(false);
    expect(service.findOne(created.id)).toEqual(created);
  });

  it('throws NotFoundException for an unknown id', () => {
    expect(() => service.findOne('missing-id')).toThrow(NotFoundException);
  });

  it('updates only the fields provided', () => {
    const created = service.create({ title: 'Original title', description: 'Original description' });
    const updated = service.update(created.id, { done: true });

    expect(updated.title).toBe('Original title');
    expect(updated.description).toBe('Original description');
    expect(updated.done).toBe(true);
  });

  it('removes a task', () => {
    const created = service.create({ title: 'Temporary task' });
    service.remove(created.id);
    expect(() => service.findOne(created.id)).toThrow(NotFoundException);
  });
});
