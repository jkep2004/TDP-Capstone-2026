export class CustomerError extends Error {
  readonly customerMessage: string

  constructor(message: string, customerMessage = message) {
    super(message)
    this.customerMessage = customerMessage
  }
}

export function customerErrorMessage(error: unknown, fallback: string) {
  return error instanceof CustomerError ? error.customerMessage : fallback
}
