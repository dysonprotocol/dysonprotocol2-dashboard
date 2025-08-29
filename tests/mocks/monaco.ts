export class Range {
  startLineNumber = 1
  startColumn = 1
  endLineNumber = 1
  endColumn = 1
  constructor(_: number, __: number, ___: number, ____: number) {}
}

const fakeEditor = {
  getValue: () => '',
  setValue: (_v: string) => {},
  onDidChangeModelContent: (_: any) => {},
  hasTextFocus: () => false,
  getModel: () => ({ getLineCount: () => 1 }),
  dispose: () => {},
  revealRangeInCenter: (_: any) => {},
  setPosition: (_: any) => {},
  createDecorationsCollection: () => ({ set: (_: any) => {} }),
  updateOptions: (_: any) => {},
}

export const editor = {
  create: (_el: any, _opts: any) => fakeEditor,
  setTheme: (_: string) => {},
}
