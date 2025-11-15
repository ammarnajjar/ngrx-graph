import ts from 'typescript';

export function getStringLiteralText(node: ts.Node | undefined): string | undefined {
  if (!node) return undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return node.getText();
}

export function isIdentifierNamed(node: ts.Node | undefined, name: string) {
  return !!node && ts.isIdentifier(node) && node.text === name;
}

export function createSource(text: string, fileName = 'file.ts') {
  return ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
}

export default { getStringLiteralText, isIdentifierNamed, createSource };
