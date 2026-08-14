/** A typed error with a stable machine-readable code. */
export class PackkitGoError extends Error {
	code: string;
	constructor(code: string, message: string) {
		super(message);
		this.name = 'PackkitGoError';
		this.code = code;
	}
}
