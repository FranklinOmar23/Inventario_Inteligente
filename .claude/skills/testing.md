# Testing: pirámide, unit con mocks, integración con supertest

La estructura de las capas (`SKILL.md`) existe en buena parte **para** que esto
sea fácil. Si testear duele, suele ser síntoma de acoplamiento.

## La pirámide

- **Muchos unit tests.** Testean **services** con el repositorio mockeado. Sin
  Express, sin BD. Rápidos, deterministas, son el grueso de la suite.
- **Menos tests de integración.** Levantan la app Express real y golpean rutas
  con `supertest`, contra una BD de test o un repositorio en memoria. Verifican
  el cableado: validación, status codes, serialización, error handler.
- **Pocos e2e.** Flujos críticos de punta a punta. Caros y lentos; resérvalos.

Mockea **en la frontera del repositorio**, no más arriba. Mockear el service en
un test del controller no prueba casi nada; mockear el repositorio en un test del
service prueba la lógica de negocio de verdad.

Los ejemplos usan **Vitest** (la API es casi idéntica en Jest).

## Unit test de un service (repositorio mockeado)

```typescript
// src/modules/users/user.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { User } from './user.entity';
import { ConflictError, NotFoundError } from '../../shared/errors';

// Fake tipado del puerto: cumple la interfaz, no toca ninguna BD.
const makeRepo = (): UserRepository => ({
  findById: vi.fn(),
  findByEmail: vi.fn(),
  create: vi.fn(),
});

const sampleUser: User = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'a@b.com',
  name: 'Ada',
  passwordHash: 'hashed',
  createdAt: new Date(),
};

describe('UserService', () => {
  let repo: UserRepository;
  let service: UserService;

  beforeEach(() => {
    repo = makeRepo();
    service = new UserService(repo);
  });

  it('devuelve el usuario si existe', async () => {
    vi.mocked(repo.findById).mockResolvedValue(sampleUser);
    await expect(service.getById(sampleUser.id)).resolves.toEqual(sampleUser);
  });

  it('lanza NotFoundError si no existe', async () => {
    vi.mocked(repo.findById).mockResolvedValue(null);
    await expect(service.getById('missing')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('rechaza email duplicado en el registro', async () => {
    vi.mocked(repo.findByEmail).mockResolvedValue(sampleUser);
    await expect(
      service.register({ email: 'a@b.com', name: 'Ada', password: 'longenough' }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('hashea la contraseña antes de persistir', async () => {
    vi.mocked(repo.findByEmail).mockResolvedValue(null);
    vi.mocked(repo.create).mockResolvedValue(sampleUser);

    await service.register({ email: 'a@b.com', name: 'Ada', password: 'longenough' });

    const arg = vi.mocked(repo.create).mock.calls[0][0];
    expect(arg.passwordHash).not.toBe('longenough'); // nunca en claro
  });
});
```

## Integración de un endpoint con supertest

Aquí montamos el módulo con un repositorio **en memoria** que cumple la misma
interfaz: prueba el cableado real (rutas, validación, error handler) sin
depender de una BD.

```typescript
// src/modules/users/user.routes.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Router } from 'express';
import { UserRepository } from './user.repository';
import { User } from './user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { userRoutes } from './user.routes';
import { errorHandler } from '../../shared/error-handler';

// Repositorio en memoria: implementación real de la interfaz para tests.
class InMemoryUserRepository implements UserRepository {
  private store = new Map<string, User>();

  async findById(id: string) {
    return this.store.get(id) ?? null;
  }
  async findByEmail(email: string) {
    return [...this.store.values()].find((u) => u.email === email) ?? null;
  }
  async create(data: Omit<User, 'id' | 'createdAt'>) {
    const user: User = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    this.store.set(user.id, user);
    return user;
  }
}

const buildTestApp = () => {
  const repo = new InMemoryUserRepository();
  const controller = new UserController(new UserService(repo));
  const api = Router();
  api.use('/users', userRoutes(controller));

  const app = express();
  app.use(express.json());
  app.use('/api', api);
  app.use(errorHandler);
  return app;
};

describe('POST /api/users', () => {
  let app: express.Express;
  beforeEach(() => {
    app = buildTestApp();
  });

  it('crea un usuario y nunca devuelve el hash', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'a@b.com', name: 'Ada', password: 'longenough' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: 'a@b.com', name: 'Ada' });
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('rechaza entrada inválida con 422', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ email: 'not-an-email', name: '', password: 'short' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('devuelve 422 con UUID inválido en GET /:id', async () => {
    const res = await request(app).get('/api/users/not-a-uuid');
    expect(res.status).toBe(422);
  });
});
```

Lo que esta suite demuestra del diseño: el service se testea sin Express, el
endpoint se testea sin BD, y el mismo `UserRepository` que usa Prisma en
producción se sustituye por un fake o una implementación en memoria sin tocar ni
una línea del service. Esa es la recompensa de la interfaz del repositorio y la
DI por constructor.
