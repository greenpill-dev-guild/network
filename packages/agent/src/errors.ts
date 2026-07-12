export class PublicInputError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = 'PublicInputError';
    this.code = code;
    this.status = status;
  }
}

export class AgentDataError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 503) {
    super(message);
    this.name = 'AgentDataError';
    this.code = code;
    this.status = status;
  }
}

export function publicErrorResponse(error: unknown): {
  status: number;
  body: { error: { code: string; message: string } };
} {
  if (error instanceof PublicInputError || error instanceof AgentDataError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
        },
      },
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: 'agent_data_error',
        message: 'The agent service could not complete the request.',
      },
    },
  };
}
