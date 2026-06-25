// Shared loading state for control panel panes.
export function Loading({ message = 'Loading...' }: { message?: string }) { return <div className="loading">{message}</div>; }
