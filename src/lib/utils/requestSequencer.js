export function createRequestSequencer() {
    let requestId = 0;

    return {
        next() {
            requestId += 1;
            return requestId;
        },
        isCurrent(candidateRequestId) {
            return candidateRequestId === requestId;
        },
        get value() {
            return requestId;
        }
    };
}

