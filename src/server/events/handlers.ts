import { getDJUser, isSameOrigin } from '@/server/auth/session';
import { apiResponse, HttpError, jsonBody } from '@/server/http';
import * as service from './service';

type EventContext = { params: Promise<{ id: string }> };
function requireOrigin(request: Request) {
  if (!isSameOrigin(request)) throw new HttpError(403, 'Origen no permitido.');
}

export function listEvents(request: Request) {
  return apiResponse(async () => {
    const user = await getDJUser();
    if (!user) throw new HttpError(401, 'Inicia sesión para abrir tu cabina.');
    return service.listEvents(
      user.userId,
      new URL(request.url).searchParams.get('archived') === '1',
    );
  });
}

export function createEvent(request: Request) {
  return apiResponse(async () => {
    requireOrigin(request);
    const user = await getDJUser();
    if (!user) throw new HttpError(401, 'Inicia sesión para crear un evento.');
    return service.createEvent(user.userId, await jsonBody(request));
  });
}

export function getEvent(_request: Request, context: EventContext) {
  return apiResponse(async () => {
    const { id } = await context.params;
    const user = await getDJUser();
    return service.getEvent(id, user?.userId);
  });
}

export function updateEvent(request: Request, context: EventContext) {
  return apiResponse(async () => {
    requireOrigin(request);
    const { id } = await context.params;
    const user = await getDJUser();
    return service.updateEvent(id, user?.userId, await jsonBody(request));
  });
}

export function createSongRequest(request: Request, context: EventContext) {
  return apiResponse(async () => {
    const { id } = await context.params;
    return service.createSongRequest(id, await jsonBody(request));
  });
}

export function recordTipClick(request: Request, context: EventContext) {
  return apiResponse(async () => {
    requireOrigin(request);
    const { id } = await context.params;
    return service.recordTipClick(id, await jsonBody(request));
  });
}

export function deleteEvent(request: Request, context: EventContext) {
  return apiResponse(async () => {
    requireOrigin(request);
    const { id } = await context.params;
    const user = await getDJUser();
    return service.deleteEvent(id, user?.userId, await jsonBody(request));
  });
}
