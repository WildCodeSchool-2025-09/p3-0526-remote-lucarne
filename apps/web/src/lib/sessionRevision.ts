let sessionRevision = 0;

const getSessionRevision = (): number => sessionRevision;
const advanceSessionRevision = (): void => { sessionRevision += 1; };

function assertSessionRevision(revision: number): void {
  if (revision !== sessionRevision) {
    throw new DOMException("The session changed while the request was pending", "AbortError");
  }
}

export { advanceSessionRevision, assertSessionRevision, getSessionRevision };
