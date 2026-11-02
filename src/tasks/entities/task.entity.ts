// A plain class describing the shape of a Task.
// In a real app with a database, this is usually where an ORM entity/schema would live.
export class Task {
  id: string;
  title: string;
  description?: string;
  done: boolean;
}
