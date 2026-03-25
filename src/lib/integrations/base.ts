export class ReadOnlyIntegrationError extends Error {
  constructor(integration: string) {
    super(`Integration "${integration}" is set to read-only. Write operations are not permitted.`)
    this.name = 'ReadOnlyIntegrationError'
  }
}

export abstract class IntegrationService {
  protected abstract integrationKey: string
  protected readOnly: boolean = false

  setReadOnly(readOnly: boolean) {
    this.readOnly = readOnly
  }

  protected assertWritable() {
    if (this.readOnly) {
      throw new ReadOnlyIntegrationError(this.integrationKey)
    }
  }
}
