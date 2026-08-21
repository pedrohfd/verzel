export function mockQueryChain<T>(result: T): T {
	const chain = new Proxy(
		{},
		{
			get(_target, prop) {
				if (prop === "then") {
					return (resolve: (value: T) => void) => resolve(result);
				}
				return () => chain;
			},
		},
	);
	return chain as T;
}
