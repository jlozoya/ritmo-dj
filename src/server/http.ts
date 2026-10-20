export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function jsonBody(
  request: Request,
): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new HttpError(
      400,
      'El cuerpo de la solicitud debe ser un objeto JSON.',
    );
  }
}

export async function apiResponse(operation: () => Promise<unknown>) {
  try {
    return Response.json(await operation(), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof HttpError)
      return Response.json({ error: error.message }, { status: error.status });
    console.error('[api] Request failed', error);
    return Response.json(
      { error: 'No se pudo completar la solicitud.' },
      { status: 500 },
    );
  }
}
