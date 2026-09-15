export function shouldApplyPeopleResult(requestSequence: number, currentSequence: number, aborted: boolean) { return !aborted && requestSequence === currentSequence; }
