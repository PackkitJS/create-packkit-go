// Go naming rules differ from npm/PyPI: a PACKAGE identifier is a short, lowercase,
// alphanumeric word (Go idiom — no hyphens or underscores), while a MODULE PATH may
// contain dots and slashes (github.com/you/name) or be a bare local name.

/** A valid Go package identifier: lowercase, alphanumeric. */
export function packageName(name: string): string {
	const cleaned = name.toLowerCase().replace(/[^a-z0-9]/g, '');
	return cleaned || 'app';
}

/** A go.mod module path. A caller may pass a full path (github.com/you/name);
 *  otherwise the name is sanitized into a valid bare local module path. */
export function modulePath(name: string): string {
	const cleaned = name
		.toLowerCase()
		.replace(/[^a-z0-9._/-]/g, '-')
		.replace(/^[-/]+|[-/]+$/g, '');
	return cleaned || 'app';
}
