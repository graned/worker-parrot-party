export class CustomErrors extends Error {
    constructor(private readonly _message: string, private readonly _type: string) {
        super(_message)
    }

    get type(): string {
        return this._type
    }

    get message(): string {
        return this._message
    }
}

export class NoIdleParrotError extends CustomErrors {
    constructor(msg: string) {
        super(msg, 'NO_IDLE_PARROT_ERROR')
    }
}

